/**
 * POST /api/stripe/portal
 *
 * Returns a Stripe Customer Portal URL so the signed-in user can manage their
 * subscription, payment method, or cancel. Requires the user to already have a
 * Stripe customer id (created at checkout time).
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getDashboardSession } from "@/lib/dashboard/get-session";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  let session;
  try {
    session = await getDashboardSession();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const customerId = session.profile.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "no_customer" }, { status: 400 });
  }

  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

  const portal = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/subscription`,
    // Stripe Portal supports 'auto' locale; full Arabic localisation lives on
    // Stripe's roadmap.
    locale: "auto",
  });

  return NextResponse.json({ url: portal.url });
}
