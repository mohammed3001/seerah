import "server-only";

import { getServiceRoleClient } from "../supabase-admin";

import type {
  SupportTicketRow,
  TicketDetail,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from "./types";

/**
 * Loads everything the ticket detail page needs in parallel:
 *
 *   * the ticket row itself (+ admin_notes + initial message body)
 *   * the user profile with `total_tickets`
 *   * the assignee admin email (if any)
 *   * every threaded message (admin and user, internal and not),
 *     ordered chronologically.  Author labels are resolved from
 *     profiles + admin_users in two batch queries.
 *
 * Returns null if the ticket id doesn't exist.
 */
export async function loadTicketDetail(
  ticketId: string,
): Promise<TicketDetail | null> {
  const supabase = getServiceRoleClient();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select(
      "id, user_id, subject, message, attachment_url, status, priority, admin_notes, assigned_to, last_admin_reply_at, created_at, updated_at",
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load ticket: ${error.message}`);
  }
  if (!ticket) return null;

  const [profileResult, assigneeResult, messagesResult, ticketCountResult] =
    await Promise.all([
      ticket.user_id
        ? supabase
            .from("profiles")
            .select("id, email, full_name, plan, plan_expires_at, created_at")
            .eq("id", ticket.user_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      ticket.assigned_to
        ? supabase
            .from("admin_users")
            .select("id, email")
            .eq("id", ticket.assigned_to)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("support_ticket_messages")
        .select(
          "id, ticket_id, author_type, author_id, body, attachment_url, is_internal, created_at",
        )
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true }),
      ticket.user_id
        ? supabase
            .from("support_tickets")
            .select("id", { count: "exact", head: true })
            .eq("user_id", ticket.user_id)
        : Promise.resolve({ count: 0, error: null }),
    ]);

  if (profileResult.error) {
    throw new Error(`Failed to load profile: ${profileResult.error.message}`);
  }
  if (assigneeResult.error) {
    throw new Error(`Failed to load assignee: ${assigneeResult.error.message}`);
  }
  if (messagesResult.error) {
    throw new Error(
      `Failed to load messages: ${messagesResult.error.message}`,
    );
  }

  const messageRows = messagesResult.data ?? [];

  // Resolve author labels in two batches.
  const userAuthorIds = Array.from(
    new Set(
      messageRows
        .filter((m) => m.author_type === "user")
        .map((m) => m.author_id),
    ),
  );
  const adminAuthorIds = Array.from(
    new Set(
      messageRows
        .filter((m) => m.author_type === "admin")
        .map((m) => m.author_id),
    ),
  );

  const userLabelMap = new Map<string, string>();
  if (userAuthorIds.length > 0) {
    const { data: rows, error: uErr } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userAuthorIds);
    if (uErr) {
      throw new Error(`Failed to load message authors: ${uErr.message}`);
    }
    for (const r of rows ?? []) userLabelMap.set(r.id, r.email ?? "(مستخدم)");
  }

  const adminLabelMap = new Map<string, string>();
  if (adminAuthorIds.length > 0) {
    const { data: rows, error: aErr } = await supabase
      .from("admin_users")
      .select("id, email")
      .in("id", adminAuthorIds);
    if (aErr) {
      throw new Error(`Failed to load admin authors: ${aErr.message}`);
    }
    for (const r of rows ?? []) adminLabelMap.set(r.id, r.email);
  }

  const messages: TicketMessage[] = messageRows.map((m) => ({
    id: m.id,
    ticket_id: m.ticket_id,
    author_type: m.author_type,
    author_id: m.author_id,
    author_label:
      m.author_type === "user"
        ? userLabelMap.get(m.author_id) ?? "(مستخدم محذوف)"
        : adminLabelMap.get(m.author_id) ?? "(مشرف محذوف)",
    body: m.body,
    attachment_url: m.attachment_url,
    is_internal: m.is_internal,
    created_at: m.created_at,
  }));

  const profile = profileResult.data;
  const assignee = assigneeResult.data;

  const ticketRow: SupportTicketRow = {
    id: ticket.id,
    user_id: ticket.user_id,
    user_email: profile?.email ?? "",
    user_full_name: profile?.full_name ?? null,
    user_plan: profile?.plan ?? null,
    subject: ticket.subject,
    status: ticket.status as TicketStatus,
    priority: ticket.priority as TicketPriority,
    attachment_url: ticket.attachment_url,
    assigned_to: ticket.assigned_to,
    assignee_email: assignee?.email ?? null,
    last_admin_reply_at: ticket.last_admin_reply_at,
    message_preview:
      ticket.message.length > 140
        ? `${ticket.message.slice(0, 140)}…`
        : ticket.message,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
  };

  return {
    ticket: {
      ...ticketRow,
      message: ticket.message,
      admin_notes: ticket.admin_notes,
    },
    user_profile: {
      id: profile?.id ?? null,
      email: profile?.email ?? "",
      full_name: profile?.full_name ?? null,
      plan: profile?.plan ?? null,
      plan_expires_at: profile?.plan_expires_at ?? null,
      created_at: profile?.created_at ?? null,
      total_tickets: ticketCountResult.count ?? 0,
    },
    messages,
  };
}
