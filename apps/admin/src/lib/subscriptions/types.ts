/**
 * Subscriptions admin — shared types.
 */

export interface SubscriptionRow {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name: string | null;
  user_plan: string;
  user_plan_expires_at: string | null;
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
}

export interface SubscriptionsListFilters {
  search: string;
  status: string;
  provider: string;
  from: string;
  to: string;
  sort: string;
  dir: "asc" | "desc";
  page: number;
  perPage: number;
}

export interface SubscriptionsListResult {
  rows: SubscriptionRow[];
  total: number;
}

export interface StatusSummary {
  /** Total in DB across all statuses (excludes nulls). */
  total: number;
  /** Map of status -> count. */
  byStatus: Record<string, number>;
}

export interface RevenueSummary {
  configured: boolean;
  /** Pretty source label for the dashboard footer. */
  source: "stripe" | "estimate";
  mrr: { amount_cents: number; currency: string }[];
  arr: { amount_cents: number; currency: string }[];
  active_count: number;
  trialing_count: number;
  canceled_this_month: number;
  new_this_month: number;
  churn_rate: number | null;
}

// Sortable columns are restricted to native subscriptions columns.  We don't
// expose user_email sorting because the subscriptions->profiles relation
// isn't declared in the generated Database types — sorting would require a
// PostgREST embedded order which isn't typesafe here.  Admins can search by
// email instead.
export const SORTABLE_COLUMNS = ["created_at", "current_period_end", "status", "provider"] as const;
export type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

export const STATUS_LABELS_AR: Record<string, string> = {
  active: "نشط",
  trialing: "تجريبي",
  past_due: "متأخر الدفع",
  canceled: "ملغى",
  unpaid: "غير مدفوع",
  incomplete: "غير مكتمل",
  incomplete_expired: "منتهٍ غير مكتمل",
  paused: "متوقف",
  unknown: "غير معروف",
};

export const STATUS_BADGE_CLASS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  trialing: "bg-sky-100 text-sky-800",
  past_due: "bg-amber-100 text-amber-800",
  unpaid: "bg-rose-100 text-rose-800",
  canceled: "bg-slate-100 text-slate-600",
  incomplete: "bg-slate-100 text-slate-600",
  incomplete_expired: "bg-slate-100 text-slate-600",
  paused: "bg-slate-100 text-slate-600",
  unknown: "bg-slate-100 text-slate-500",
};
