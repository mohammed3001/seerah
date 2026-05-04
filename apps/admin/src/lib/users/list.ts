import "server-only";

import { getServiceRoleClient } from "../supabase-admin";

import {
  DEFAULT_PER_PAGE,
  type Plan,
  type UserListFilters,
  type UserListResult,
  type UserListRow,
  type UserSortKey,
} from "./types";

const ALLOWED_SORT_KEYS: readonly UserSortKey[] = [
  "created_at",
  "last_seen_at",
  "email",
  "full_name",
  "plan",
];

/**
 * List users with filters, search, sort, and pagination.  Aggregate counts
 * (resume_count) are computed via a SECURITY DEFINER RPC over the page's
 * user-id slice — so the result size is bounded by the page size, never
 * by the underlying resumes table size.
 */
export async function listUsers(filters: UserListFilters): Promise<UserListResult> {
  const supabase = getServiceRoleClient();
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const sortKey: UserSortKey = ALLOWED_SORT_KEYS.includes(
    filters.sort as UserSortKey,
  )
    ? (filters.sort as UserSortKey)
    : "created_at";
  const ascending = filters.dir === "asc";

  let query = supabase
    .from("profiles")
    .select(
      "id, email, full_name, avatar_url, plan, plan_expires_at, is_disabled, billing_country, created_at, last_seen_at",
      { count: "exact" },
    )
    .order(sortKey, { ascending, nullsFirst: false })
    .range(from, to);

  if (filters.plan) query = query.eq("plan", filters.plan);
  if (filters.country) query = query.eq("billing_country", filters.country);
  if (filters.status === "disabled") query = query.eq("is_disabled", true);
  if (filters.status === "active") query = query.eq("is_disabled", false);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) {
    // `<input type="date">` returns "YYYY-MM-DD"; Postgres casts that to
    // midnight UTC, which would exclude any row created during the
    // selected day.  Anchor the upper bound to end-of-day UTC instead.
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  if (filters.q) {
    // Search across email and full_name; we strip PostgREST `or` separators
    // from the input so a stray comma can't shift filter boundaries.
    const safe = filters.q.replace(/[,()]/g, " ");
    query = query.or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list users: ${error.message}`);

  const rows = (data ?? []) as Array<Omit<UserListRow, "resume_count">>;

  // Resume counts via RPC — server-side GROUP BY so the response is bounded
  // by the number of users on this page (≤ 100), not by the resumes table
  // size.  Without this the previous JS-side count would silently truncate
  // at 1000 rows once the platform crossed that threshold.
  const userIds = rows.map((r) => r.id);
  const countMap = new Map<string, number>();
  if (userIds.length > 0) {
    const { data: countRows, error: countErr } = await supabase.rpc(
      "admin_user_resume_counts",
      { p_user_ids: userIds },
    );
    if (countErr) {
      throw new Error(`Failed to load resume counts: ${countErr.message}`);
    }
    for (const row of countRows ?? []) {
      countMap.set(row.user_id, Number(row.count));
    }
  }

  // Distinct countries for the filter dropdown — DISTINCT-as-RPC for the
  // same reason as the audit log's action filter.
  const { data: countryRows } = await supabase.rpc(
    "admin_distinct_user_countries",
  );
  const countries = (countryRows ?? []).map((r) => r.country);

  const result: UserListRow[] = rows.map((r) => ({
    id: r.id,
    email: r.email,
    full_name: r.full_name,
    avatar_url: r.avatar_url,
    plan: r.plan as Plan,
    plan_expires_at: r.plan_expires_at,
    is_disabled: r.is_disabled,
    billing_country: r.billing_country,
    created_at: r.created_at,
    last_seen_at: r.last_seen_at,
    resume_count: countMap.get(r.id) ?? 0,
  }));

  return {
    rows: result,
    total: count ?? 0,
    page,
    perPage,
    countries,
  };
}
