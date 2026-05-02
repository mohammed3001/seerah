/**
 * POST /api/stripe/checkout
 *
 * Body: { currency?: "sar" | "usd" }
 *
 * Creates a Stripe Checkout session for the Prime annual subscription with a
 * 7-day trial. Reuses the customer.id stored on profiles.stripe_customer_id;
 * if missing, creates one and persists it. Returns the redirect URL.
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
}

export async function POST(request: Request): Promise<Response> {
  let session;
  try {
    session = await getDashboardSession();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
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
    await admin
      .from("profiles")
      .update({ billing_country: country })
      .eq("id", session.userId);
  }

  const origin =
    hdrs.get("origin") ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: resolvePriceId(currency), quantity: 1 }],
    success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscription`,
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
