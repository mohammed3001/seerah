import "server-only";

import { getServiceRoleClient } from "../supabase-admin";

import { getStripeOptional, isStripeConfigured } from "./stripe";
import type { RevenueSummary } from "./types";

/**
 * Compute MRR/ARR/churn/new-this-month for the dashboard summary cards.
 *
 * Strategy:
 *
 *   * If `STRIPE_SECRET_KEY` is set, ask Stripe directly for
 *     active subscriptions and sum the line item amounts (the only
 *     reliable source of truth — local DB doesn't store unit prices,
 *     just the price id).  We keep the iteration bounded by paging
 *     through `subscriptions.list({ status: 'active' })` up to a
 *     hard 1k cap.
 *
 *   * Otherwise we fall back to a DB-only estimate based on row
 *     counts.  Useful for staging or before billing is wired up.
 *
 * Churn is computed from local data either way (subs canceled in the
 * last 30 days / active 30 days ago); Stripe's hosted equivalent
 * differs subtly (it uses MRR-weighted churn) and we'd rather show a
 * consistent number across modes.
 */
export async function loadRevenueSummary(): Promise<RevenueSummary> {
  const configured = isStripeConfigured();
  const counts = await loadCountsFromDb();

  if (!configured) {
    return {
      configured: false,
      source: "estimate",
      mrr: [],
      arr: [],
      ...counts,
    };
  }

  const stripe = getStripeOptional();
  if (!stripe) {
    return {
      configured: false,
      source: "estimate",
      mrr: [],
      arr: [],
      ...counts,
    };
  }

  const buckets = new Map<string, number>(); // currency -> mrr cents

  let starting_after: string | undefined;
  let pages = 0;
  while (pages < 10) {
    pages += 1;
    const params: import("stripe").Stripe.SubscriptionListParams = {
      status: "active",
      limit: 100,
      expand: ["data.items.data.price"],
    };
    if (starting_after) params.starting_after = starting_after;
    const page = await stripe.subscriptions.list(params);
    for (const sub of page.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        if (!price.unit_amount || !price.recurring) continue;
        const itemMrr = monthlyEquivalentCents(
          price.unit_amount * (item.quantity ?? 1),
          price.recurring.interval,
          price.recurring.interval_count ?? 1,
        );
        buckets.set(price.currency, (buckets.get(price.currency) ?? 0) + itemMrr);
      }
    }
    if (!page.has_more) break;
    starting_after = page.data[page.data.length - 1]?.id;
    if (!starting_after) break;
  }

  const mrr = Array.from(buckets.entries())
    .map(([currency, amount_cents]) => ({
      currency,
      amount_cents,
    }))
    .sort((a, b) => b.amount_cents - a.amount_cents);

  const arr = mrr.map((b) => ({
    currency: b.currency,
    amount_cents: b.amount_cents * 12,
  }));

  return {
    configured: true,
    source: "stripe",
    mrr,
    arr,
    ...counts,
  };
}

function monthlyEquivalentCents(
  amount_cents: number,
  interval: "day" | "week" | "month" | "year",
  count: number,
): number {
  switch (interval) {
    case "month":
      return Math.round(amount_cents / count);
    case "year":
      return Math.round(amount_cents / (12 * count));
    case "week":
      return Math.round((amount_cents * 52) / 12 / count);
    case "day":
      return Math.round((amount_cents * 365) / 12 / count);
  }
}

interface DbCounts {
  active_count: number;
  trialing_count: number;
  canceled_this_month: number;
  new_this_month: number;
  churn_rate: number | null;
}

async function loadCountsFromDb(): Promise<DbCounts> {
  const supabase = getServiceRoleClient();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  // The cohort for monthly churn is "subs that were live at t-30d".
  // Both numerator and denominator must come from that cohort, otherwise
  // a sub created and canceled inside the same 30-day window can land in
  // the numerator but never in the denominator — which can push churn
  // above 100%.
  //
  //   denom    = stillActiveFromBefore (lived through the whole window)
  //            + canceledInWindowFromBefore (lived at t-30d, churned since)
  //   numer    = canceledInWindowFromBefore   (the churn slice of denom)
  //
  // We deliberately don't count all `canceled_at >= t-30d` rows here:
  // that double-counts the "born and died inside the window" cohort.
  const [
    { count: activeCount },
    { count: trialingCount },
    { count: newThisMonth },
    { count: canceledThisMonth },
    { count: stillActiveFromBefore },
    { count: canceledInWindowFromBefore },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "trialing"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStartIso),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "canceled")
      .gte("canceled_at", monthStartIso),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .lte("created_at", thirtyDaysAgoIso)
      .in("status", ["active", "trialing", "past_due", "unpaid"]),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .lte("created_at", thirtyDaysAgoIso)
      .eq("status", "canceled")
      .gte("canceled_at", thirtyDaysAgoIso),
  ]);

  const denom = (stillActiveFromBefore ?? 0) + (canceledInWindowFromBefore ?? 0);
  const churn_rate = denom > 0 ? (canceledInWindowFromBefore ?? 0) / denom : null;

  return {
    active_count: activeCount ?? 0,
    trialing_count: trialingCount ?? 0,
    new_this_month: newThisMonth ?? 0,
    canceled_this_month: canceledThisMonth ?? 0,
    churn_rate,
  };
}

export function formatMoney(amount_cents: number, currency: string): string {
  const value = amount_cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // Fallback for unknown currency codes.
    return `${value.toFixed(0)} ${currency.toUpperCase()}`;
  }
}
