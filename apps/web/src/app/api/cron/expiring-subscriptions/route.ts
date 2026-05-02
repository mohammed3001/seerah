/**
 * GET /api/cron/expiring-subscriptions
 *
 * Daily cron run by Vercel Scheduled Functions (configured in
 * apps/web/vercel.json). Sends a "your subscription renews/expires in 7
 * days" reminder to every user whose `current_period_end` falls within the
 * next 6.5 → 7.5 day window.
 *
 * Why a window and not exactly 7 days: cron runs once per day at a fixed
 * time, so we need ±0.5 day of slack to catch every subscription. The
 * `email_log` idempotency check (one `subscription_expiring` per
 * subscription per period) prevents double-sends if the window overlaps a
 * previous run.
 *
 * Auth: Vercel sets `Authorization: Bearer $CRON_SECRET` on cron requests.
 * If CRON_SECRET isn't configured, the route refuses to run (so a public
 * GET can't trigger a mass mailout).
 */

import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIX_AND_HALF_DAYS_MS = 6.5 * 24 * 60 * 60 * 1000;
const SEVEN_AND_HALF_DAYS_MS = 7.5 * 24 * 60 * 60 * 1000;

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env["CRON_SECRET"];
  if (!cronSecret) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getServiceRoleClient();
  const now = Date.now();
  const windowStart = new Date(now + SIX_AND_HALF_DAYS_MS).toISOString();
  const windowEnd = new Date(now + SEVEN_AND_HALF_DAYS_MS).toISOString();

  // Pull every subscription whose current period ends in the window. We don't
  // pre-filter on email-log because Postgres can't easily express "exclude
  // rows where email_log has a row referencing this subscription's
  // current_period_end" without a join we'd rather do server-side.
  const { data: rows } = await admin
    .from("subscriptions")
    .select("id, user_id, status, current_period_end, cancel_at_period_end, stripe_subscription_id")
    .in("status", ["active", "trialing"])
    .gte("current_period_end", windowStart)
    .lte("current_period_end", windowEnd);

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, sent: 0 });
  }

  const origin = process.env["NEXT_PUBLIC_APP_URL"] ?? new URL(request.url).origin;
  let sent = 0;
  for (const row of rows) {
    if (!row.user_id || !row.current_period_end) continue;

    // Idempotency: one expiring email per (user, subscription, period_end).
    // Storing the period_end in `metadata` lets us re-send in future periods
    // without keeping a separate "we already mailed" flag on subscriptions.
    const { data: prior } = await admin
      .from("email_log")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("template", "subscription_expiring")
      .eq("metadata->>subscription_id", row.stripe_subscription_id ?? "")
      .eq("metadata->>period_end", row.current_period_end)
      .limit(1)
      .maybeSingle();
    if (prior) continue;

    const { data: profile } = await admin
      .from("profiles")
      .select("email, locale, unsubscribe_token, marketing_emails_enabled")
      .eq("id", row.user_id)
      .maybeSingle();
    if (!profile?.email) continue;

    const unsubscribeUrl = profile.unsubscribe_token
      ? `${origin}/api/email/unsubscribe?token=${encodeURIComponent(profile.unsubscribe_token)}`
      : `${origin}/dashboard/account`;

    await sendEmail({
      template: "subscription_expiring",
      to: profile.email,
      userId: row.user_id,
      props: {
        appUrl: origin,
        expiresAt: row.current_period_end,
        // cancel_at_period_end=true means the user already cancelled; the
        // subscription will end on period_end rather than auto-renew.
        willAutoRenew: !row.cancel_at_period_end,
        unsubscribeUrl,
        locale: profile.locale ?? "ar",
      },
      metadata: {
        // Indexed by the idempotency lookup above so a re-run of the cron in
        // the same window doesn't double-send.
        subscription_id: row.stripe_subscription_id ?? null,
        period_end: row.current_period_end,
      },
    });

    sent += 1;
  }

  return NextResponse.json({ ok: true, processed: rows.length, sent });
}
