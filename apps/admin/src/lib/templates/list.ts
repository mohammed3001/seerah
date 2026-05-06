import "server-only";

import { getServiceRoleClient } from "../supabase-admin";

import type { AdminTemplateRow, TemplatesListResult } from "./types";

/**
 * Loads the full template catalog plus a per-template usage count.
 *
 * The catalog is small (≤ 50 rows in practice) so we pull everything in
 * one query and join the usage count from `admin_stats_template_usage`
 * (defined in 20260506000000_admin_dashboard_aggregates.sql).  That RPC
 * already returns `(id, count)` pairs aggregated in Postgres, so we
 * avoid GROUP BYs in JS.
 */
export async function listTemplates(): Promise<TemplatesListResult> {
  const supabase = getServiceRoleClient();

  const [{ data: rows, error }, { data: usage, error: usageErr }] = await Promise.all([
    supabase
      .from("templates")
      .select(
        [
          "id",
          "name",
          "name_ar",
          "description_en",
          "description_ar",
          "preview_url",
          "thumbnail_url",
          "is_premium",
          "is_active",
          "category",
          "tags",
          "sort_order",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase.rpc("admin_stats_template_usage", { p_limit: null }),
  ]);

  if (error) throw new Error(`Failed to load templates: ${error.message}`);
  if (usageErr) {
    throw new Error(`Failed to load usage stats: ${usageErr.message}`);
  }

  const usageMap = new Map<string, number>();
  for (const u of usage ?? []) {
    usageMap.set(u.template_id, Number(u.count) || 0);
  }

  // Cast through unknown to a typed array — Supabase's JoinAll inference
  // collapses to `any` here, so we narrow to AdminTemplateRow[] at the
  // boundary rather than peppering `any` through the codebase.
  const raw = (rows ?? []) as unknown as Omit<AdminTemplateRow, "usage_count">[];
  const out: AdminTemplateRow[] = raw.map((r) => ({
    ...r,
    usage_count: usageMap.get(r.id) ?? 0,
  }));

  return { rows: out };
}
