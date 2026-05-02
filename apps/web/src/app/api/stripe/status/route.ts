/**
 * GET /api/stripe/status
 *
 * Returns the current subscription state for the signed-in user. Used by the
 * dashboard "Manage subscription" widget — purely informational, never gates
 * features (gating is plan-based via profiles.plan).
 */

import { NextResponse } from "next/server";

import { getDashboardSession } from "@/lib/dashboard/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface SubscriptionStatus {
  plan: "free" | "prime" | "enterprise";
  plan_expires_at: string | null;
  status: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  trial_end: string | null;
  provider: "stripe" | "paddle" | null;
  has_customer: boolean;
}

export async function GET(): Promise<Response> {
  let session;
  try {
    session = await getDashboardSession();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("subscriptions")
    .select(
      "status, cancel_at_period_end, current_period_end, trial_end, provider",
    )
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const body: SubscriptionStatus = {
    plan: session.profile.plan,
    plan_expires_at: session.profile.plan_expires_at,
    status: row?.status ?? null,
    cancel_at_period_end: row?.cancel_at_period_end ?? false,
    current_period_end: row?.current_period_end ?? null,
    trial_end: row?.trial_end ?? null,
    provider: row?.provider ?? null,
    has_customer: Boolean(session.profile.stripe_customer_id),
  };

  return NextResponse.json(body);
}
