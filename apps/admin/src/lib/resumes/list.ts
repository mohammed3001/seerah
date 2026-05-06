import "server-only";

import { getServiceRoleClient } from "../supabase-admin";

import {
  DEFAULT_PER_PAGE,
  type ResumeFeaturedFilter,
  type ResumeLanguage,
  type ResumeListFilters,
  type ResumeListResult,
  type ResumeListRow,
  type ResumeSortKey,
  SORT_KEYS,
  type TemplateOption,
} from "./types";

const ALLOWED_SORT_KEYS: readonly ResumeSortKey[] = SORT_KEYS;

/**
 * List resumes with filters, search, sort, and pagination.
 *
 * Why we don't use a single PostgREST query with embedded joins
 * --------------------------------------------------------------
 * `profiles` is not declared as a foreign key target on `resumes` in the
 * generated Database types, so embedding (`profiles(...)`) is brittle —
 * the embedding-name resolution depends on supabase-js's relationship
 * cache.  Two small queries (resumes page + per-page user batch) are
 * easier to reason about and bounded by `perPage`, never by the underlying
 * `profiles` table size.
 *
 * Featured filter
 * ---------------
 * The `featured_resumes` table is bounded (curation list, dozens to a few
 * hundred rows at most), so we resolve all featured IDs up-front and push
 * the filter into the main resumes query as `.in('id', ids)` (or `not('id',
 * 'in', ids)` for the inverse).  This way:
 *
 *   1. PostgREST returns exactly `perPage` rows per page (no client-side
 *      under-filling), and
 *   2. the `count` returned by PostgREST already reflects every active
 *      filter — including featured — so pagination math is correct even
 *      when the admin combines featured with template/language/date/
 *      completion/search filters.
 */
export async function listResumes(filters: ResumeListFilters): Promise<ResumeListResult> {
  const supabase = getServiceRoleClient();
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const sortKey: ResumeSortKey = ALLOWED_SORT_KEYS.includes(filters.sort as ResumeSortKey)
    ? (filters.sort as ResumeSortKey)
    : "created_at";
  const ascending = filters.dir === "asc";

  // ---- Template options for the filter dropdown ---------------------------
  // RPC returns only active templates so the admin can't filter on a
  // disabled template.
  const { data: templateRows, error: templateErr } = await supabase.rpc(
    "admin_distinct_resume_templates",
  );
  if (templateErr) {
    throw new Error(`Failed to load templates: ${templateErr.message}`);
  }
  const templates: TemplateOption[] = (templateRows ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    name_ar: t.name_ar,
  }));

  // ---- Featured ID set (resolved up-front) -------------------------------
  // We always need this set to:
  //   - hydrate the `is_featured` flag on the page rows, and
  //   - (optionally) constrain the resumes query when `filters.featured`
  //     is set.
  // Bounded by the curation list size, not the resumes table.
  const { data: allFeaturedRows, error: featuredAllErr } = await supabase
    .from("featured_resumes")
    .select("resume_id");
  if (featuredAllErr) {
    throw new Error(`Failed to load featured set: ${featuredAllErr.message}`);
  }
  const allFeaturedIds = (allFeaturedRows ?? []).map((r) => r.resume_id);
  const featuredSet = new Set<string>(allFeaturedIds);

  // ---- Page of resumes ----------------------------------------------------
  let query = supabase
    .from("resumes")
    .select(
      "id, title, slug, template_id, language, completion_score, views_count, created_at, updated_at, user_id",
      { count: "exact" },
    )
    .order(sortKey, { ascending, nullsFirst: false })
    .range(from, to);

  if (filters.templateId) query = query.eq("template_id", filters.templateId);
  if (filters.language) query = query.eq("language", filters.language);
  if (typeof filters.completionMin === "number") {
    query = query.gte("completion_score", filters.completionMin);
  }
  if (typeof filters.completionMax === "number") {
    query = query.lte("completion_score", filters.completionMax);
  }
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) {
    // `<input type="date">` returns "YYYY-MM-DD"; Postgres casts that to
    // midnight UTC, which would exclude any row created during the
    // selected day.  Anchor the upper bound to end-of-day UTC instead.
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  // Push featured filter into the DB query so pagination + count compose
  // correctly with all other filters.
  if (filters.featured === "featured") {
    if (allFeaturedIds.length === 0) {
      return { rows: [], total: 0, page, perPage, templates };
    }
    query = query.in("id", allFeaturedIds);
  } else if (filters.featured === "not_featured") {
    if (allFeaturedIds.length > 0) {
      // PostgREST `not.in.(...)` syntax via the typed helper.
      query = query.not("id", "in", `(${allFeaturedIds.join(",")})`);
    }
  }

  if (filters.q) {
    // Strip PostgREST `or` separators from user input — same defensive
    // treatment as the users list.
    const safe = filters.q.replace(/[,()]/g, " ");
    // Search against resume title only here.  Joining on user_email would
    // require a server-side function (no embedding); when q looks like an
    // email, we resolve to user_ids first and add an `in.(...)` clause.
    if (safe.includes("@")) {
      const { data: matchingUsers } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", `%${safe}%`)
        .limit(500);
      const userIds = (matchingUsers ?? []).map((u) => u.id);
      if (userIds.length === 0) {
        // No users matched — short-circuit to an empty result so we don't
        // hit PostgREST with an `in.()` clause that would 400.
        return {
          rows: [],
          total: 0,
          page,
          perPage,
          templates,
        };
      }
      query = query.in("user_id", userIds);
    } else {
      query = query.ilike("title", `%${safe}%`);
    }
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list resumes: ${error.message}`);

  const baseRows = (data ?? []) as Array<{
    id: string;
    title: string;
    slug: string;
    template_id: string;
    language: ResumeLanguage;
    completion_score: number;
    views_count: number;
    created_at: string;
    updated_at: string;
    user_id: string;
  }>;

  // ---- Per-page user batch -----------------------------------------------
  const userIds = Array.from(new Set(baseRows.map((r) => r.user_id)));
  const userMap = new Map<
    string,
    { email: string; full_name: string | null; avatar_url: string | null }
  >();
  if (userIds.length > 0) {
    const { data: userRows, error: userErr } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .in("id", userIds);
    if (userErr) {
      throw new Error(`Failed to load resume owners: ${userErr.message}`);
    }
    for (const u of userRows ?? []) {
      userMap.set(u.id, {
        email: u.email ?? "",
        full_name: u.full_name,
        avatar_url: u.avatar_url,
      });
    }
  }

  const rows: ResumeListRow[] = baseRows.map((r) => toRow(r, templates, userMap, featuredSet));

  return {
    rows,
    total: count ?? 0,
    page,
    perPage,
    templates,
  };
}

function toRow(
  r: {
    id: string;
    title: string;
    slug: string;
    template_id: string;
    language: ResumeLanguage;
    completion_score: number;
    views_count: number;
    created_at: string;
    updated_at: string;
    user_id: string;
  },
  templates: TemplateOption[],
  userMap: Map<string, { email: string; full_name: string | null; avatar_url: string | null }>,
  featuredSet: Set<string>,
): ResumeListRow {
  const tpl = templates.find((t) => t.id === r.template_id);
  const owner = userMap.get(r.user_id);
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    template_id: r.template_id,
    template_name: tpl?.name ?? null,
    template_name_ar: tpl?.name_ar ?? null,
    language: r.language,
    completion_score: r.completion_score,
    views_count: r.views_count,
    is_featured: featuredSet.has(r.id),
    created_at: r.created_at,
    updated_at: r.updated_at,
    user_id: r.user_id,
    user_email: owner?.email ?? null,
    user_full_name: owner?.full_name ?? null,
    user_avatar_url: owner?.avatar_url ?? null,
  };
}

// Re-export the unused-but-referenced filter type so consumers compile.
export type { ResumeFeaturedFilter };
