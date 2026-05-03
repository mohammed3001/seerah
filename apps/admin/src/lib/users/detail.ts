import "server-only";

import { subDays } from "date-fns";

import type { Tables } from "@seerah/types";

import { getServiceRoleClient } from "../supabase-admin";

import type { Plan } from "./types";

export interface UserProfileFull {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: Plan;
  plan_expires_at: string | null;
  stripe_customer_id: string | null;
  max_resumes: number;
  is_disabled: boolean;
  disabled_reason: string | null;
  disabled_at: string | null;
  billing_country: string | null;
  referral_code: string | null;
  marketing_emails_enabled: boolean;
  locale: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserResumeRow {
  id: string;
  title: string;
  slug: string;
  template_id: string;
  language: string;
  completion_score: number;
  views_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type UserSubscriptionRow = Pick<
  Tables<"subscriptions">,
  | "id"
  | "stripe_subscription_id"
  | "stripe_price_id"
  | "status"
  | "current_period_start"
  | "current_period_end"
  | "cancel_at_period_end"
  | "provider"
  | "currency"
  | "trial_end"
  | "canceled_at"
  | "created_at"
  | "updated_at"
>;

export type UserTicketRow = Pick<
  Tables<"support_tickets">,
  "id" | "subject" | "status" | "created_at" | "updated_at"
>;

export interface UserAiBreakdownRow {
  action_type: string;
  count: number;
  total_tokens: number;
}

export interface UserAdminNoteRow {
  id: string;
  body: string;
  admin_id: string | null;
  admin_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDetail {
  profile: UserProfileFull;
  resumes: UserResumeRow[];
  subscriptions: UserSubscriptionRow[];
  tickets: UserTicketRow[];
  aiTotals: { last30Days: number; last30DaysTokens: number };
  aiBreakdown: UserAiBreakdownRow[];
  adminNotes: UserAdminNoteRow[];
}

/**
 * Load the full per-user view for /admin/users/[id].  Each table is
 * queried independently so the page degrades gracefully if any optional
 * source (e.g. ai_usage on a brand-new user) returns nothing.
 */
export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const supabase = getServiceRoleClient();

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, avatar_url, plan, plan_expires_at, stripe_customer_id, max_resumes, is_disabled, disabled_reason, disabled_at, billing_country, referral_code, marketing_emails_enabled, locale, last_seen_at, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    throw new Error(`Failed to load profile: ${profileErr.message}`);
  }
  if (!profile) return null;

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [
    resumesRes,
    subsRes,
    ticketsRes,
    aiCountsRes,
    aiBreakdownRes,
    notesRes,
  ] = await Promise.all([
    supabase
      .from("resumes")
      .select(
        "id, title, slug, template_id, language, completion_score, views_count, is_public, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("subscriptions")
      .select(
        "id, stripe_subscription_id, stripe_price_id, status, current_period_start, current_period_end, cancel_at_period_end, provider, currency, trial_end, canceled_at, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("support_tickets")
      .select("id, subject, status, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.rpc("admin_user_ai_counts", {
      p_user_ids: [userId],
      p_from: thirtyDaysAgo.toISOString(),
      p_to: tomorrow.toISOString(),
    }),
    supabase.rpc("admin_user_ai_breakdown", {
      p_user_id: userId,
      p_from: thirtyDaysAgo.toISOString(),
      p_to: tomorrow.toISOString(),
    }),
    supabase
      .from("admin_notes")
      .select("id, body, admin_id, admin_email, created_at, updated_at")
      .eq("target_type", "user")
      .eq("target_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const last30Days = aiCountsRes.data?.[0]?.count
    ? Number(aiCountsRes.data[0].count)
    : 0;

  const aiBreakdown = (aiBreakdownRes.data ?? []).map((r) => ({
    action_type: r.action_type ?? "unknown",
    count: Number(r.count),
    total_tokens: Number(r.total_tokens),
  }));

  const last30DaysTokens = aiBreakdown.reduce(
    (sum, r) => sum + r.total_tokens,
    0,
  );

  return {
    profile: {
      ...profile,
      plan: profile.plan as Plan,
    },
    resumes: (resumesRes.data ?? []) as UserResumeRow[],
    subscriptions: (subsRes.data ?? []) as UserSubscriptionRow[],
    tickets: (ticketsRes.data ?? []) as UserTicketRow[],
    aiTotals: { last30Days, last30DaysTokens },
    aiBreakdown,
    adminNotes: (notesRes.data ?? []) as UserAdminNoteRow[],
  };
}
