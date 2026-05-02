/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook handler — the source of truth for subscription state.
 *
 * Verification:
 *   - Reads the raw request body (Next 14: `await request.text()`).
 *   - Verifies the signature with `stripe.webhooks.constructEvent` using
 *     STRIPE_WEBHOOK_SECRET. Anything that fails verification returns 400
 *     and is *not* persisted (Stripe retries with the same id, which our
 *     idempotency guard de-duplicates).
 *
 * Idempotency:
 *   - Each event id is recorded on the matching subscriptions row in
 *     `last_event_id`. If we've already processed an event id we skip it.
 *
 * Events handled:
 *   - checkout.session.completed
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_failed
 *
 * Side-effects:
 *   - Upsert subscriptions row keyed by stripe_subscription_id.
 *   - profiles.plan is updated automatically by the
 *     `trg_sync_profile_plan` trigger on the subscriptions table.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { trackServer } from "@/lib/analytics/posthog";
import { getStripe, getStripeConfig } from "@/lib/stripe/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionUpdate = {
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  stripe_price_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_end: string | null;
  currency: string | null;
  provider: "stripe";
  last_event_id: string;
  updated_at: string;
};

function toIso(unix: number | null | undefined): string | null {
  if (unix === null || unix === undefined) return null;
  return new Date(unix * 1000).toISOString();
}

async function userIdFromCustomer(customerId: string): Promise<string | null> {
  const admin = getServiceRoleClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function userIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
  fallbackCustomerId: string | null | undefined,
): Promise<string | null> {
  const fromMeta = metadata?.["user_id"];
  if (fromMeta) return fromMeta;
  if (fallbackCustomerId) return userIdFromCustomer(fallbackCustomerId);
  return null;
}

async function persistSubscription(
  userId: string,
  sub: Stripe.Subscription,
  eventId: string,
): Promise<void> {
  const admin = getServiceRoleClient();
  const item = sub.items.data[0];
  const update: SubscriptionUpdate = {
    user_id: userId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_price_id: item?.price.id ?? null,
    status: sub.status,
    current_period_start: toIso(sub.current_period_start),
    current_period_end: toIso(sub.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: toIso(sub.canceled_at),
    trial_end: toIso(sub.trial_end),
    currency: item?.price.currency ?? null,
    provider: "stripe",
    last_event_id: eventId,
    updated_at: new Date().toISOString(),
  };

  await admin.from("subscriptions").upsert(update, {
    onConflict: "stripe_subscription_id",
  });
}

async function isDuplicateEvent(eventId: string): Promise<boolean> {
  const admin = getServiceRoleClient();
  const { data } = await admin
    .from("subscriptions")
    .select("id")
    .eq("last_event_id", eventId)
    .maybeSingle();
  return Boolean(data);
}

export async function POST(request: Request): Promise<Response> {
  const { configured, webhookSecret } = getStripeConfig();
  if (!configured || !webhookSecret) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // Stripe requires the raw body bytes for signature verification, not the
  // parsed JSON. Next.js gives us the raw string via request.text().
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "verification_failed";
    return NextResponse.json({ error: "invalid_signature", message }, { status: 400 });
  }

  if (await isDuplicateEvent(event.id)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const userId = await userIdFromMetadata(
          session.metadata,
          typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
        );
        if (!userId) break;

        const subId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        const sub = await getStripe().subscriptions.retrieve(subId);
        await persistSubscription(userId, sub, event.id);
        await trackServer(userId, "upgrade_completed", {
          subscription_id: sub.id,
          currency: session.currency ?? null,
        });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await userIdFromMetadata(
          sub.metadata,
          typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        );
        if (!userId) break;
        await persistSubscription(userId, sub, event.id);
        if (event.type === "customer.subscription.deleted" || sub.status === "canceled") {
          await trackServer(userId, "subscription_cancelled", {
            subscription_id: sub.id,
            cancel_at_period_end: sub.cancel_at_period_end,
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : (invoice.subscription?.id ?? null);
        // Only subscription invoices map to a row in `subscriptions` — one-off
        // invoices have no row to update so we ack and move on.
        if (!subscriptionId) break;

        const admin = getServiceRoleClient();
        await admin
          .from("subscriptions")
          .update({
            status: "past_due",
            last_event_id: event.id,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);
        break;
      }
      default:
        // Stripe sends many event types — we ack the rest to avoid retries.
        break;
    }
  } catch (err) {
    // 5xx tells Stripe to retry. We only land here on Supabase / network
    // failures; signature verification was already done above.
    const message = err instanceof Error ? err.message : "internal_error";
    return NextResponse.json({ error: "handler_failed", message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
