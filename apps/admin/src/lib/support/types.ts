/**
 * Support center — shared types.
 */

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface SupportTicketRow {
  id: string;
  user_id: string | null;
  user_email: string;
  user_full_name: string | null;
  user_plan: string | null;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  attachment_url: string | null;
  assigned_to: string | null;
  assignee_email: string | null;
  last_admin_reply_at: string | null;
  /** First-message preview, used in the inbox row. */
  message_preview: string;
  created_at: string;
  updated_at: string;
}

export interface SupportListFilters {
  search: string;
  status: string;
  priority: string;
  assignee: string;
  /** "yes" / "no" / "" — when "yes" only show tickets with no assignee. */
  unassigned: string;
  from: string;
  to: string;
  sort: string;
  dir: "asc" | "desc";
  page: number;
  perPage: number;
}

export interface SupportListResult {
  rows: SupportTicketRow[];
  total: number;
}

export interface AssigneeOption {
  id: string;
  email: string;
  role: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_type: "user" | "admin";
  author_id: string;
  /** Resolved display label — admin email or user email. */
  author_label: string;
  body: string;
  attachment_url: string | null;
  is_internal: boolean;
  created_at: string;
}

export interface TicketDetail {
  ticket: SupportTicketRow & {
    /** First message body, kept verbatim for the detail view header. */
    message: string;
    /** Free-text "internal admin notes" stored on the ticket itself. */
    admin_notes: string | null;
  };
  user_profile: {
    id: string | null;
    email: string;
    full_name: string | null;
    plan: string | null;
    plan_expires_at: string | null;
    created_at: string | null;
    total_tickets: number;
  };
  messages: TicketMessage[];
}

export interface StatusSummary {
  /** Total tickets across all statuses. */
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  /** Tickets where status is open or in_progress. */
  unresolved: number;
  /** Open tickets with no assignee. */
  unassigned_open: number;
}

// Sortable columns are restricted to native support_tickets columns.
// Same constraint as the subscriptions list — we don't expose
// user_email sort because the relation isn't declared on Database
// types and PostgREST embed-orders aren't typesafe.
export const SORTABLE_COLUMNS = [
  "updated_at",
  "created_at",
  "status",
  "priority",
  "last_admin_reply_at",
] as const;
export type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

export const STATUS_LABELS_AR: Record<TicketStatus, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved: "محلولة",
  closed: "مغلقة",
};

export const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  open: "bg-rose-100 text-rose-800",
  in_progress: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-600",
};

export const PRIORITY_LABELS_AR: Record<TicketPriority, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "مرتفعة",
  urgent: "عاجلة",
};

export const PRIORITY_BADGE_CLASS: Record<TicketPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-sky-100 text-sky-800",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-rose-100 text-rose-800",
};

export const PRIORITY_RANK: Record<TicketPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};
