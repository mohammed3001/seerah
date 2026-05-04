import "server-only";

import { getServiceRoleClient } from "../supabase-admin";

import {
  SORTABLE_COLUMNS,
  type AssigneeOption,
  type SortableColumn,
  type StatusSummary,
  type SupportListFilters,
  type SupportListResult,
  type SupportTicketRow,
  type TicketPriority,
  type TicketStatus,
} from "./types";

/**
 * Build the admin /support inbox.
 *
 * Search resolves to one of:
 *   * exact ticket uuid
 *   * subject ILIKE %term%
 *   * profile email ILIKE %term% → resolved to user_ids first
 *
 * Subject + email are OR'd together by issuing the email-resolution
 * separately and then `.or(subject.ilike, user_id.in)` on PostgREST.
 *
 * Profiles are batch-loaded after the page slice to keep `count: exact`
 * accurate after every filter — same pattern as resumes/list.ts and
 * subscriptions/list.ts.
 */
export async function listTickets(
  filters: SupportListFilters,
): Promise<SupportListResult> {
  const supabase = getServiceRoleClient();
  const page = Math.max(1, filters.page);
  const perPage = Math.max(1, filters.perPage);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const sort: SortableColumn = (
    SORTABLE_COLUMNS as readonly string[]
  ).includes(filters.sort)
    ? (filters.sort as SortableColumn)
    : "updated_at";
  const ascending = filters.dir === "asc";

  // Search resolution.
  let idExact: string | null = null;
  let subjectLike: string | null = null;
  let userIdRestriction: string[] | null = null;

  const term = filters.search.trim();
  if (term.length > 0) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        term,
      );
    if (isUuid) {
      idExact = term;
    } else {
      const safe = term.replace(/[,()%]/g, " ");
      subjectLike = safe;

      // Resolve any profiles that match the email term too — combined
      // with the subject ILIKE via .or() below.
      const { data: matches, error } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", `%${safe}%`)
        .limit(500);
      if (error) {
        throw new Error(`Failed to resolve search term: ${error.message}`);
      }
      userIdRestriction = (matches ?? []).map((m) => m.id);
    }
  }

  let query = supabase
    .from("support_tickets")
    .select(
      `
        id, user_id, subject, message, attachment_url, status, priority,
        assigned_to, last_admin_reply_at, created_at, updated_at
      `,
      { count: "exact" },
    )
    .order(sort, { ascending, nullsFirst: false })
    .range(from, to);

  if (
    filters.status === "open" ||
    filters.status === "in_progress" ||
    filters.status === "resolved" ||
    filters.status === "closed"
  ) {
    query = query.eq("status", filters.status);
  }
  if (
    filters.priority === "low" ||
    filters.priority === "normal" ||
    filters.priority === "high" ||
    filters.priority === "urgent"
  ) {
    query = query.eq("priority", filters.priority);
  }
  if (filters.assignee) {
    query = query.eq("assigned_to", filters.assignee);
  } else if (filters.unassigned === "yes") {
    query = query.is("assigned_to", null);
  }
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) {
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  if (idExact) {
    query = query.eq("id", idExact);
  } else if (subjectLike !== null) {
    // Either subject matches OR user_id is in the resolved email cohort.
    // PostgREST's `.or()` syntax expects comma-separated filters with
    // commas escaped inside ilike values.
    const safeForOr = subjectLike.replace(/,/g, " ");
    const parts = [`subject.ilike.%${safeForOr}%`];
    if (userIdRestriction && userIdRestriction.length > 0) {
      parts.push(`user_id.in.(${userIdRestriction.join(",")})`);
    }
    query = query.or(parts.join(","));
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list tickets: ${error.message}`);
  }

  const baseRows = (data ?? []) as Array<{
    id: string;
    user_id: string | null;
    subject: string;
    message: string;
    attachment_url: string | null;
    status: TicketStatus;
    priority: TicketPriority;
    assigned_to: string | null;
    last_admin_reply_at: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const userIds = Array.from(
    new Set(
      baseRows
        .map((r) => r.user_id)
        .filter((id): id is string => id !== null),
    ),
  );
  const assigneeIds = Array.from(
    new Set(
      baseRows
        .map((r) => r.assigned_to)
        .filter((id): id is string => id !== null),
    ),
  );

  const profileMap = new Map<
    string,
    { email: string; full_name: string | null; plan: string }
  >();
  if (userIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, full_name, plan")
      .in("id", userIds);
    if (pErr) {
      throw new Error(`Failed to load ticket owners: ${pErr.message}`);
    }
    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        email: p.email ?? "",
        full_name: p.full_name,
        plan: p.plan,
      });
    }
  }

  const assigneeMap = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: admins, error: aErr } = await supabase
      .from("admin_users")
      .select("id, email")
      .in("id", assigneeIds);
    if (aErr) {
      throw new Error(`Failed to load assignees: ${aErr.message}`);
    }
    for (const a of admins ?? []) {
      assigneeMap.set(a.id, a.email);
    }
  }

  const rows: SupportTicketRow[] = baseRows.map((r) => {
    const profile = r.user_id ? profileMap.get(r.user_id) : undefined;
    return {
      id: r.id,
      user_id: r.user_id,
      user_email: profile?.email ?? "",
      user_full_name: profile?.full_name ?? null,
      user_plan: profile?.plan ?? null,
      subject: r.subject,
      status: r.status,
      priority: r.priority,
      attachment_url: r.attachment_url,
      assigned_to: r.assigned_to,
      assignee_email: r.assigned_to
        ? assigneeMap.get(r.assigned_to) ?? null
        : null,
      last_admin_reply_at: r.last_admin_reply_at,
      message_preview:
        r.message.length > 140 ? `${r.message.slice(0, 140)}…` : r.message,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  return { rows, total: count ?? 0 };
}

/** Active admin users with role super_admin or support_agent. */
export async function listAssignees(): Promise<AssigneeOption[]> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_distinct_support_assignees");
  if (error) {
    throw new Error(`Failed to load assignees: ${error.message}`);
  }
  return (data ?? []).map((r) => ({ id: r.id, email: r.email, role: r.role }));
}

/** Aggregate counts for the inbox header. */
export async function loadStatusSummary(): Promise<StatusSummary> {
  const supabase = getServiceRoleClient();

  const [
    { count: total },
    { count: openCount },
    { count: inProgressCount },
    { count: resolvedCount },
    { count: closedCount },
    { count: lowCount },
    { count: normalCount },
    { count: highCount },
    { count: urgentCount },
    { count: unassignedOpen },
  ] = await Promise.all([
    supabase.from("support_tickets").select("id", { count: "exact", head: true }),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "closed"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("priority", "low"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("priority", "normal"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("priority", "high"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("priority", "urgent"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"])
      .is("assigned_to", null),
  ]);

  const open = openCount ?? 0;
  const in_progress = inProgressCount ?? 0;

  return {
    total: total ?? 0,
    byStatus: {
      open,
      in_progress,
      resolved: resolvedCount ?? 0,
      closed: closedCount ?? 0,
    },
    byPriority: {
      low: lowCount ?? 0,
      normal: normalCount ?? 0,
      high: highCount ?? 0,
      urgent: urgentCount ?? 0,
    },
    unresolved: open + in_progress,
    unassigned_open: unassignedOpen ?? 0,
  };
}
