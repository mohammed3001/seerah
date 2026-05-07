/**
 * Background function — fires when a subscription is approaching its
 * renewal / expiry. Triggered by either the daily cron (`/api/cron/
 * expiring-subscriptions`) for legacy compatibility, or by an explicit
 * `inngest.send({ name: "subscription/renewal-reminder", data: ... })`.
 *
 * The cron route already handles fan-out and idempotency
 * (`email_log` table). This function exists so future renewal flows
 * can be moved off Vercel Cron + onto Inngest's retry / replay /
 * inspection UI without touching the cron caller.
 */

import { inngest, subscriptionRenewalEvent } from "../client";

export const subscriptionRenewalFn = inngest.createFunction(
  {
    id: "subscription-renewal-reminder",
    name: "Send renewal reminder before subscription expires",
    retries: 3,
    triggers: [{ event: subscriptionRenewalEvent }],
  },
  async ({ event, step }) => {
    const { user_id, subscription_id, current_period_end_iso } = event.data;
    // Pre-passed by the dispatcher when known. If absent we query the
    // `subscriptions` row below so we never hard-code the wrong value.
    const passedCancelAtPeriodEnd = event.data.cancel_at_period_end;

    await step.run("send-renewal-email", async () => {
      const { sendEmail } = await import("@/lib/email/send");
      const { getServiceRoleClient } = await import("@/lib/supabase/service-role");
      const supabase = getServiceRoleClient();

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, locale")
        .eq("id", user_id)
        .single();

      if (!profile?.email) {
        // User was deleted / has no email — nothing to do, success
        // (vs. a retry-able failure).
        return { skipped: "no_email" };
      }

      // Derive willAutoRenew from the subscriptions row (matching the
      // logic in /api/cron/expiring-subscriptions:103). The cron writes
      // `cancel_at_period_end` from the Stripe webhook; we trust that
      // column. We default to `true` (the optimistic "will renew" copy)
      // only if neither the event payload nor the DB tells us otherwise,
      // which is the safest behaviour for a row we haven't seen yet (the
      // alternative — defaulting to "this is your last invoice" — would
      // panic users on every renewal).
      let cancelAtPeriodEnd: boolean | null = passedCancelAtPeriodEnd ?? null;
      if (cancelAtPeriodEnd === null) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("cancel_at_period_end")
          .eq("stripe_subscription_id", subscription_id)
          .maybeSingle();
        if (sub) cancelAtPeriodEnd = sub.cancel_at_period_end;
      }

      const willAutoRenew = !(cancelAtPeriodEnd === true);

      const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? process.env["WEB_APP_URL"] ?? "";
      await sendEmail({
        to: profile.email,
        template: "subscription_expiring",
        userId: user_id,
        props: {
          appUrl,
          expiresAt: current_period_end_iso,
          willAutoRenew,
          unsubscribeUrl: `${appUrl}/api/email/unsubscribe?u=${user_id}`,
          locale: profile.locale === "en" ? "en" : "ar",
        },
        metadata: { subscription_id },
      });
      return { sent: true, willAutoRenew };
    });

    return { ok: true, user_id, subscription_id };
  },
);
