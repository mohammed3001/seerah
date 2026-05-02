/** GET /api/export/quota — returns the caller's remaining export budget. */

import { NextResponse } from "next/server";

import { getDashboardSession } from "@/lib/dashboard/get-session";
import { fetchQuota } from "@/lib/pdf/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await getDashboardSession();
  const result = await fetchQuota(session.userId, session.profile.plan);
  if (!result) {
    return NextResponse.json(
      {
        plan: session.profile.plan,
        unlimited: session.profile.plan !== "free",
        rate_limit: { limit: 5, remaining: 5, reset_at: 0 },
      },
      { status: 200 },
    );
  }
  return NextResponse.json(result);
}
