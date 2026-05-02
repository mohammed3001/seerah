import { headers } from "next/headers";
import Link from "next/link";

import { detectCountryFromHeaders, shouldOfferPaddle } from "@/lib/billing/country";
import { getDashboardSession } from "@/lib/dashboard/get-session";
import {
  PRIME_PLAN,
  getStripeConfig,
  pickCurrencyForCountry,
} from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { SubscriptionClient } from "./subscription-client";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const session = await getDashboardSession();
  const hdrs = await headers();
  const country =
    detectCountryFromHeaders(hdrs as unknown as Headers) ??
    session.profile.billing_country;
  const currency = pickCurrencyForCountry(country);
  const stripe = getStripeConfig();

  const supabase = await createSupabaseServerClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      "status, cancel_at_period_end, current_period_end, trial_end, provider, currency",
    )
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-16 pt-10">
      <header className="mb-8 space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:underline">
            ← الرجوع للوحة التحكم
          </Link>
        </p>
        <h1 className="text-3xl font-bold">الاشتراك والباقة</h1>
        <p className="text-muted-foreground">
          أنت حاليًا على {session.profile.plan === "prime" ? "باقة برايم" : "الباقة المجانية"}.
          قارن الميزات أدناه واترقَّ متى ما أردت.
        </p>
      </header>

      <SubscriptionClient
        plan={session.profile.plan}
        currency={currency}
        priceSar={PRIME_PLAN.price_sar}
        priceUsd={PRIME_PLAN.price_usd}
        trialDays={PRIME_PLAN.trial_days}
        stripeConfigured={stripe.configured}
        offerPaddle={shouldOfferPaddle(country)}
        hasCustomer={Boolean(session.profile.stripe_customer_id)}
        currentSubscription={subscription ?? null}
      />
    </main>
  );
}
