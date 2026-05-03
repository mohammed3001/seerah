import "server-only";

import type { Tables } from "@seerah/types";

import { getServiceRoleClient } from "../supabase-admin";

export type AuditRow = Pick<
  Tables<"admin_audit_log">,
  | "id"
  | "admin_id"
  | "admin_email"
  | "action"
  | "target_type"
  | "target_id"
  | "metadata"
  | "ip"
  | "user_agent"
  | "created_at"
>;

export type AuditPerPage = 20 | 50 | 100;

export interface AuditListFilters {
  q?: string;
  action?: string;
  adminEmail?: string;
  from?: string; // ISO start
  to?: string; // ISO end
  page?: number;
  /** Page size — the UI is restricted to {20, 50, 100} (see AuditPerPage),
   *  but the CSV export route needs to walk pages of 1000.  Plain `number`
   *  here lets both call sites share the helper. */
  perPage?: number;
}

export interface AuditListResult {
  rows: AuditRow[];
  total: number;
  page: number;
  perPage: number;
  /** Distinct action codes in the table — used to populate the filter
   *  dropdown so the admin doesn't have to remember the canonical names. */
  knownActions: string[];
}

const DEFAULT_PER_PAGE = 50;

/**
 * Build a filtered + paginated audit log query.  All filters compose with
 * AND — leaving a field unset means "don't filter on it".
 */
export async function listAudit(filters: AuditListFilters): Promise<AuditListResult> {
  const supabase = getServiceRoleClient();
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("admin_audit_log")
    .select(
      "id, admin_id, admin_email, action, target_type, target_id, metadata, ip, user_agent, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.adminEmail) query = query.eq("admin_email", filters.adminEmail);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  if (filters.q) {
    // Search across email, action, target_id (PostgREST `or` filter).
    const safe = filters.q.replace(/[,()]/g, " ");
    query = query.or(
      `admin_email.ilike.%${safe}%,action.ilike.%${safe}%,target_id.ilike.%${safe}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list audit log: ${error.message}`);

  // Distinct actions for the dropdown — server-side `SELECT DISTINCT` so a
  // single hot action with thousands of rows can't hide rarer ones.  See
  // migration 20260506000000_admin_dashboard_aggregates.sql.
  const { data: actionRows } = await supabase.rpc("admin_distinct_audit_actions");
  const knownActions = (actionRows ?? []).map((r) => r.action);

  return {
    rows: (data ?? []) as AuditRow[],
    total: count ?? 0,
    page,
    perPage,
    knownActions,
  };
}
