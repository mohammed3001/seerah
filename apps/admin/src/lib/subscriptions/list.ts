import "server-only";

import { getServiceRoleClient } from "../supabase-admin";

import {
  SORTABLE_COLUMNS,
  type SortableColumn,
  type StatusSummary,
  type SubscriptionRow,
  type SubscriptionsListFilters,
  type SubscriptionsListResult,
} from "./types";

/**
 * Builds the admin /subscriptions table.
 *
 * Search resolves to one of:
 *   * exact stripe_subscription_id (`sub_…`) match
 *   * exact stripe_customer_id     (`cus_…`) match
 *   * exact subscription uuid match
 *   * profile email ILIKE %term%   → resolved to user_ids first
 *
 * The user_ids approach matches Phase B2's pattern (resolve once, then
 * `.in('user_id', ids)` on the main query) so PostgREST's `count: exact`
 * stays accurate after every filter is applied.
 *
 * The profiles join is *not* done via PostgREST embedding because
 * `subscriptions -> profiles` isn't declared on the generated Database
 * types (Relationships: []).  Instead we fetch subscriptions, then
 * batch-load matching profiles for the page slice — same pattern as
 * resumes/list.ts.  This keeps types clean and avoids the per-page
 * embed-vs-count race.
 */
export async function listSubscriptions(
  filters: SubscriptionsListFilters,
): Promise<SubscriptionsListResult> {
  const supabase = getServiceRoleClient();
  const page = Math.max(1, filters.page);
  const perPage = Math.max(1, filters.perPage);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const sort: SortableColumn = (SORTABLE_COLUMNS as readonly string[]).includes(filters.sort)
    ? (filters.sort as SortableColumn)
    : "created_at";
  const ascending = filters.dir === "asc";

  let userIdRestriction: string[] | null = null;
  let stripeSubExact: string | null = null;
  let stripeCustomerExact: string | null = null;
  let idExact: string | null = null;

  const term = filters.search.trim();
  if (term.length > 0) {
    if (/^sub_[A-Za-z0-9]+$/.test(term)) {
      stripeSubExact = term;
    } else if (/^cus_[A-Za-z0-9]+$/.test(term)) {
      stripeCustomerExact = term;
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)) {
      idExact = term;
    } else {
      // Email-ish search: resolve matching profile ids first.
      const safe = term.replace(/[,()%]/g, " ");
      const { data: matches, error } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", `%${safe}%`)
        .limit(500);
      if (error) {
        throw new Error(`Failed to resolve search term: ${error.message}`);
      }
      userIdRestriction = (matches ?? []).map((m) => m.id);
      if (userIdRestriction.length === 0) {
        return { rows: [], total: 0 };
      }
    }
  }

  let query = supabase
    .from("subscriptions")
    .select(
      `
        id, user_id, stripe_subscription_id, stripe_customer_id,
        stripe_price_id, status, provider, current_period_start,
        current_period_end, trial_end, canceled_at, cancel_at_period_end,
        currency, created_at, updated_at
      `,
      { count: "exact" },
    )
    .order(sort, { ascending, nullsFirst: false })
    .range(from, to);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.provider === "stripe" || filters.provider === "paddle") {
    query = query.eq("provider", filters.provider);
  }
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  if (idExact) query = query.eq("id", idExact);
  if (stripeSubExact) query = query.eq("stripe_subscription_id", stripeSubExact);
  if (stripeCustomerExact) {
    query = query.eq("stripe_customer_id", stripeCustomerExact);
  }
  if (userIdRestriction) query = query.in("user_id", userIdRestriction);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list subscriptions: ${error.message}`);
  }

  const baseRows = (data ?? []) as Array<{
    id: string;
    user_id: string;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    stripe_price_id: string | null;
    status: string | null;
    provider: "stripe" | "paddle";
    current_period_start: string | null;
    current_period_end: string | null;
    trial_end: string | null;
    canceled_at: string | null;
    cancel_at_period_end: boolean;
    currency: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const userIds = Array.from(new Set(baseRows.map((r) => r.user_id)));
  const profileMap = new Map<
    string,
    {
      email: string;
      full_name: string | null;
      plan: string;
      plan_expires_at: string | null;
    }
  >();
  if (userIds.length > 0) {
    const { data: profileRows, error: profileErr } = await supabase
      .from("profiles")
      .select("id, email, full_name, plan, plan_expires_at")
      .in("id", userIds);
    if (profileErr) {
      throw new Error(`Failed to load subscription owners: ${profileErr.message}`);
    }
    for (const p of profileRows ?? []) {
      profileMap.set(p.id, {
        email: p.email ?? "",
        full_name: p.full_name,
        plan: p.plan,
        plan_expires_at: p.plan_expires_at,
      });
    }
  }

  const rows: SubscriptionRow[] = baseRows.map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      id: r.id,
      user_id: r.user_id,
      user_email: profile?.email ?? "",
      user_full_name: profile?.full_name ?? null,
      user_plan: profile?.plan ?? "free",
      user_plan_expires_at: profile?.plan_expires_at ?? null,
      stripe_subscription_id: r.stripe_subscription_id,
      stripe_customer_id: r.stripe_customer_id,
      stripe_price_id: r.stripe_price_id,
      status: r.status,
      provider: r.provider,
      current_period_start: r.current_period_start,
      current_period_end: r.current_period_end,
      trial_end: r.trial_end,
      canceled_at: r.canceled_at,
      cancel_at_period_end: r.cancel_at_period_end,
      currency: r.currency,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  return { rows, total: count ?? 0 };
}

/** Distinct subscription statuses for the filter dropdown (Postgres-side DISTINCT). */
export async function listDistinctStatuses(): Promise<string[]> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_distinct_sub_statuses");
  if (error) {
    throw new Error(`Failed to load statuses: ${error.message}`);
  }
  return (data ?? []).map((r) => r.status);
}

/** Status counts for the cards.  Computed in Postgres. */
export async function loadStatusSummary(): Promise<StatusSummary> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_stats_subscriptions_summary");
  if (error) {
    throw new Error(`Failed to load status summary: ${error.message}`);
  }
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of data ?? []) {
    const c = Number(row.count);
    byStatus[row.status] = c;
    total += c;
  }
  return { total, byStatus };
}
