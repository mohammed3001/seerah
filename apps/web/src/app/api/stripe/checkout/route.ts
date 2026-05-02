/**
 * POST /api/stripe/checkout
 *
 * Body: { currency?: "sar" | "usd"; success_url?: string; cancel_url?: string }
 *
 * Creates a Stripe Checkout session for the Prime annual subscription with a
 * 7-day trial. Reuses the customer.id stored on profiles.stripe_customer_id;
 * if missing, creates one and persists it. Returns the redirect URL.
 *
 * `success_url` / `cancel_url` are optional and exist for the mobile client,
 * which routes the user back into the app via a custom URL scheme
 * (e.g. `seerah://subscription/success?session_id={CHECKOUT_SESSION_ID}`).
 * Both are validated against an allowlist (web origin OR `seerah://`) to
 * prevent open-redirect abuse.
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { detectCountryFromHeaders } from "@/lib/billing/country";
import { getDashboardSession } from "@/lib/dashboard/get-session";
import {
  PRIME_TRIAL_DAYS,
  getStripe,
  pickCurrencyForCountry,
  resolvePriceId,
} from "@/lib/stripe/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  currency?: "sar" | "usd";
  success_url?: string;
  cancel_url?: string;
}

const MOBILE_SCHEME = "seerah://";

/**
 * Allow caller-supplied redirect URLs only when they target our own web
 * origin or the mobile app scheme. Everything else is silently ignored —
 * Stripe Checkout would be a fantastic open-redirect vector otherwise.
 */
function safeRedirect(
  candidate: string | undefined,
  origin: string,
): string | null {
  if (!candidate) return null;
  if (candidate.startsWith(MOBILE_SCHEME)) return candidate;
  try {
    const parsed = new URL(candidate);
    const expected = new URL(origin);
    if (parsed.origin === expected.origin) return candidate;
  } catch {
    return null;
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  let session;
  try {
    session = await getDashboardSession();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Server-side guard against duplicate subscriptions. The UI hides the
  // checkout CTA for prime users and shows a portal button instead, but a
  // double-click race, the back button after a Stripe redirect, or a
  // second tab can still hit this endpoint. Stripe doesn't enforce
  // one-active-subscription-per-customer on its own, so we have to.
  if (session.profile.plan === "prime" || session.profile.plan === "enterprise") {
    return NextResponse.json(
      { error: "already_subscribed", message: "you already have an active prime subscription" },
      { status: 409 },
    );
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // Empty bodies are allowed; we'll auto-detect currency.
    body = {};
  }

  const hdrs = await headers();
  const country = detectCountryFromHeaders(hdrs as unknown as Headers);
  const currency: "sar" | "usd" =
    body.currency ?? pickCurrencyForCountry(country ?? session.profile.billing_country);

  const stripe = getStripe();
  const admin = getServiceRoleClient();

  let customerId = session.profile.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.email,
      name: session.profile.full_name ?? undefined,
      preferred_locales: ["ar-SA", "en"],
      metadata: {
        user_id: session.userId,
        referral_code: session.profile.referral_code ?? "",
      },
    });
    customerId = customer.id;
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId, billing_country: country })
      .eq("id", session.userId);
  } else if (country && country !== session.profile.billing_country) {
    await admin.from("profiles").update({ billing_country: country }).eq("id", session.userId);
  }

  const origin =
    hdrs.get("origin") ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

  const successUrl =
    safeRedirect(body.success_url, origin) ??
    `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = safeRedirect(body.cancel_url, origin) ?? `${origin}/subscription`;

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: resolvePriceId(currency), quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Stripe Checkout doesn't yet have a dedicated 'ar' locale, but 'auto'
    // honours the user's browser preference (which will be Arabic for our
    // primary audience) and falls back to English otherwise.
    locale: "auto",
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: PRIME_TRIAL_DAYS,
      metadata: {
        user_id: session.userId,
        plan: "prime",
      },
    },
    metadata: {
      user_id: session.userId,
    },
    automatic_tax: { enabled: false },
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "checkout_url_missing" }, { status: 502 });
  }

  return NextResponse.json({ url: checkout.url, currency });
}
