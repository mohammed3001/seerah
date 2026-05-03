/**
 * Pure types + formatters shared between server (data fetcher) and client
 * (chart components).  Kept free of `server-only` so client islands can
 * import the formatting helpers without dragging the Supabase client in.
 */
import { format } from "date-fns";

export interface MetricCard {
  label: string;
  value: number;
  /** Percentage change vs the prior comparable window. */
  trendPct: number | null;
  formatter?: "integer" | "currency_usd";
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface SlicePoint {
  label: string;
  value: number;
}

export interface RecentSignup {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  plan: "free" | "prime" | "enterprise";
}

export interface RecentTicket {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  user_email: string | null;
}

export interface RecentSubscriptionEvent {
  user_id: string;
  user_email: string | null;
  status: string | null;
  provider: "stripe" | "paddle";
  updated_at: string;
}

export interface DashboardData {
  metrics: MetricCard[];
  newUsersByDay: DailyPoint[];
  planDistribution: SlicePoint[];
  templateUsage: SlicePoint[];
  monthlyRevenueUsd: SlicePoint[];
  aiActivityByDay: DailyPoint[];
  recent: {
    signups: RecentSignup[];
    tickets: RecentTicket[];
    subscriptionEvents: RecentSubscriptionEvent[];
  };
  /** Server time at which the snapshot was assembled, for "آخر تحديث ⋯". */
  generatedAt: string;
}

/** Used by chart x-axis labels to format YYYY-MM-DD nicely. */
export function formatDayLabel(iso: string): string {
  return format(new Date(iso), "d MMM");
}

/** YYYY-MM → 'يناير ٢٠٢٦' style label.  date-fns has no AR locale built-in
 *  here, so we fall back to month index + year. */
const MONTH_NAMES_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function formatMonthLabel(yyyymm: string): string {
  const [year, month] = yyyymm.split("-");
  const idx = Number(month) - 1;
  if (idx < 0 || idx > 11) return yyyymm;
  return `${MONTH_NAMES_AR[idx]} ${year}`;
}
