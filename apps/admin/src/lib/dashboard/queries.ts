import "server-only";

import { format, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";

import { getServiceRoleClient } from "../supabase-admin";

import type {
  DailyPoint,
  DashboardData,
  MetricCard,
  RecentSignup,
  RecentSubscriptionEvent,
  RecentTicket,
  SlicePoint,
} from "./types";

const DAY_WINDOW = 30;
const MONTH_WINDOW = 12;
const TEMPLATE_USAGE_LIMIT = 8;

function pctChange(current: number, prior: number): number | null {
  if (prior === 0) {
    if (current === 0) return 0;
    return null; // can't compute a meaningful % from zero
  }
  return Math.round(((current - prior) / prior) * 100);
}

function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function emptyDailyWindow(days: number): DailyPoint[] {
  const today = startOfDay(new Date());
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push({ date: dateKey(subDays(today, i)), count: 0 });
  }
  return out;
}

function emptyMonthlyWindow(months: number): SlicePoint[] {
  const now = startOfMonth(new Date());
  const out: SlicePoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    out.push({ label: format(subMonths(now, i), "yyyy-MM"), value: 0 });
  }
  return out;
}

/**
 * Builds the full dashboard snapshot.  Counts use `head: true + count: exact`,
 * which is exact even past the 1000-row PostgREST ceiling.  All distribution
 * and time-series data uses `admin_stats_*` SECURITY DEFINER RPCs that do the
 * GROUP BY in Postgres — so the response is bounded by the number of buckets,
 * never the underlying row count.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getServiceRoleClient();
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = subDays(todayStart, 1);
  const monthStart = startOfMonth(now);
  const lastMonthStart = subMonths(monthStart, 1);
  const thirtyDaysStart = subDays(todayStart, DAY_WINDOW - 1);
  const sixtyDaysStart = subDays(todayStart, DAY_WINDOW * 2 - 1);
  const thirtyDayWindowEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const twelveMonthsStart = subMonths(monthStart, MONTH_WINDOW - 1);
  const twelveMonthWindowEnd = new Date(monthStart.getTime() + 32 * 24 * 60 * 60 * 1000);

  const [
    totalUsersRes,
    usersTodayRes,
    usersYesterdayRes,
    totalResumesRes,
    primeUsersRes,
    aiUsersTodayRes,
    aiUsersYesterdayRes,
    monthRevenueRes,
    lastMonthRevenueRes,
    signupsCurrentRes,
    signupsPriorRes,
    planDistRes,
    templateUsageRes,
    aiUsageDailyRes,
    monthlySubsRes,
    recentSignupsRes,
    recentTicketsRes,
    recentSubscriptionsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", yesterdayStart.toISOString())
      .lt("created_at", todayStart.toISOString()),
    supabase.from("resumes").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "prime"),
    supabase
      .from("ai_usage")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("ai_usage")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", yesterdayStart.toISOString())
      .lt("created_at", todayStart.toISOString()),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("provider", "stripe")
      .eq("status", "active")
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("provider", "stripe")
      .eq("status", "active")
      .gte("created_at", lastMonthStart.toISOString())
      .lt("created_at", monthStart.toISOString()),
    // Daily signup buckets — server-side GROUP BY to avoid 1000-row truncation.
    supabase.rpc("admin_stats_signups_daily", {
      p_from: thirtyDaysStart.toISOString(),
      p_to: thirtyDayWindowEnd.toISOString(),
    }),
    supabase.rpc("admin_stats_signups_daily", {
      p_from: sixtyDaysStart.toISOString(),
      p_to: thirtyDaysStart.toISOString(),
    }),
    supabase.rpc("admin_stats_plan_distribution"),
    supabase.rpc("admin_stats_template_usage", { p_limit: TEMPLATE_USAGE_LIMIT }),
    supabase.rpc("admin_stats_ai_usage_daily", {
      p_from: thirtyDaysStart.toISOString(),
      p_to: thirtyDayWindowEnd.toISOString(),
    }),
    supabase.rpc("admin_stats_subscriptions_monthly", {
      p_from: twelveMonthsStart.toISOString(),
      p_to: twelveMonthWindowEnd.toISOString(),
    }),
    supabase
      .from("profiles")
      .select("id, email, full_name, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("support_tickets")
      .select("id, subject, status, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("subscriptions")
      .select("user_id, status, provider, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const totalUsers = totalUsersRes.count ?? 0;
  const usersToday = usersTodayRes.count ?? 0;
  const usersYesterday = usersYesterdayRes.count ?? 0;
  const totalResumes = totalResumesRes.count ?? 0;
  const primeUsers = primeUsersRes.count ?? 0;
  const aiUsersToday = aiUsersTodayRes.count ?? 0;
  const aiUsersYesterday = aiUsersYesterdayRes.count ?? 0;
  const monthSubs = monthRevenueRes.count ?? 0;
  const lastMonthSubs = lastMonthRevenueRes.count ?? 0;

  // Revenue is computed from active-subscription count × monthly price since
  // we don't store amount_paid on the subscription row.  PR-Admin-C2 wires
  // the real Stripe API for line-item-accurate revenue.
  const PRICE_PRIME_USD_PER_MONTH = 9.99;
  const monthRevenueUsd = monthSubs * PRICE_PRIME_USD_PER_MONTH;
  const lastMonthRevenueUsd = lastMonthSubs * PRICE_PRIME_USD_PER_MONTH;

  // ── Daily signups, last 30 days ────────────────────────────────────────
  const newUsersByDay = emptyDailyWindow(DAY_WINDOW);
  const dayIndex = new Map(newUsersByDay.map((p) => [p.date, p]));
  let signupsCurrentWindow = 0;
  for (const row of signupsCurrentRes.data ?? []) {
    const point = dayIndex.get(row.day);
    if (point) point.count = Number(row.count);
    signupsCurrentWindow += Number(row.count);
  }
  let signupsPriorWindow = 0;
  for (const row of signupsPriorRes.data ?? []) {
    signupsPriorWindow += Number(row.count);
  }

  // ── Plan distribution ──────────────────────────────────────────────────
  const planDistribution: SlicePoint[] = (planDistRes.data ?? [])
    .map((row) => ({ label: row.plan ?? "free", value: Number(row.count) }))
    .sort((a, b) => b.value - a.value);

  // ── Template usage (top N) ─────────────────────────────────────────────
  const templateUsage: SlicePoint[] = (templateUsageRes.data ?? [])
    .map((row) => ({ label: row.template_id, value: Number(row.count) }))
    .sort((a, b) => b.value - a.value);

  // ── AI activity, last 30 days ──────────────────────────────────────────
  const aiActivityByDay = emptyDailyWindow(DAY_WINDOW);
  const aiIndex = new Map(aiActivityByDay.map((p) => [p.date, p]));
  for (const row of aiUsageDailyRes.data ?? []) {
    const point = aiIndex.get(row.day);
    if (point) point.count = Number(row.count);
  }

  // ── Monthly revenue, last 12 months ────────────────────────────────────
  const monthlyRevenueUsd = emptyMonthlyWindow(MONTH_WINDOW);
  const monthIndex = new Map(monthlyRevenueUsd.map((p) => [p.label, p]));
  for (const row of monthlySubsRes.data ?? []) {
    const point = monthIndex.get(row.month);
    if (point) point.value = Number(row.count) * PRICE_PRIME_USD_PER_MONTH;
  }

  // ── Recent activity feed ───────────────────────────────────────────────
  const signups: RecentSignup[] = (recentSignupsRes.data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    created_at: p.created_at,
    plan: p.plan,
  }));

  const ticketUserIds = Array.from(
    new Set((recentTicketsRes.data ?? []).map((t) => t.user_id).filter((x): x is string => !!x)),
  );
  const subUserIds = Array.from(
    new Set(
      (recentSubscriptionsRes.data ?? []).map((s) => s.user_id).filter((x): x is string => !!x),
    ),
  );
  const allUserIds = Array.from(new Set([...ticketUserIds, ...subUserIds]));
  const userEmailMap = new Map<string, string>();
  if (allUserIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", allUserIds);
    for (const row of profileRows ?? []) {
      userEmailMap.set(row.id, row.email);
    }
  }

  const tickets: RecentTicket[] = (recentTicketsRes.data ?? []).map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    created_at: t.created_at,
    user_email: t.user_id ? (userEmailMap.get(t.user_id) ?? null) : null,
  }));

  const subscriptionEvents: RecentSubscriptionEvent[] = (recentSubscriptionsRes.data ?? []).map(
    (s) => ({
      user_id: s.user_id,
      user_email: userEmailMap.get(s.user_id) ?? null,
      status: s.status,
      provider: s.provider,
      updated_at: s.updated_at,
    }),
  );

  // ── Compose metric cards ───────────────────────────────────────────────
  const metrics: MetricCard[] = [
    {
      label: "إجمالي المستخدمين",
      value: totalUsers,
      trendPct: pctChange(signupsCurrentWindow, signupsPriorWindow),
      formatter: "integer",
    },
    {
      label: "مستخدمون جدد اليوم",
      value: usersToday,
      trendPct: pctChange(usersToday, usersYesterday),
      formatter: "integer",
    },
    {
      label: "إجمالي السير الذاتية",
      value: totalResumes,
      trendPct: null,
      formatter: "integer",
    },
    {
      label: "المشتركون في برايم",
      value: primeUsers,
      trendPct: null,
      formatter: "integer",
    },
    {
      label: "إيرادات الشهر الحالي",
      value: Math.round(monthRevenueUsd * 100) / 100,
      trendPct: pctChange(monthRevenueUsd, lastMonthRevenueUsd),
      formatter: "currency_usd",
    },
    {
      label: "مستخدمو الذكاء الاصطناعي اليوم",
      value: aiUsersToday,
      trendPct: pctChange(aiUsersToday, aiUsersYesterday),
      formatter: "integer",
    },
  ];

  return {
    metrics,
    newUsersByDay,
    planDistribution,
    templateUsage,
    monthlyRevenueUsd,
    aiActivityByDay,
    recent: { signups, tickets, subscriptionEvents },
    generatedAt: now.toISOString(),
  };
}
