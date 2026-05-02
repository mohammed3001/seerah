/**
 * POST /api/admin/support/resolve
 *
 * Internal endpoint called by the admin app (apps/admin) to mark a support
 * ticket as resolved and trigger the resolution email. Authenticates with
 * `Authorization: Bearer $ADMIN_INTERNAL_TOKEN` to keep the route off the
 * public surface — the admin app stores the same token server-side.
 *
 * Body: { ticket_id: string, resolution?: string }
 *
 * `resolution` is optional plain-text shown to the user in the email; if
 * omitted the email just says "your ticket is resolved" without any
 * additional context.
 */

import { NextResponse, type NextRequest } from "next/server";

import { sendEmail } from "@/lib/email/send";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  ticket_id?: string;
  resolution?: string | null;
}

export async function POST(request: NextRequest): Promise<Response> {
  const adminToken = process.env["ADMIN_INTERNAL_TOKEN"];
  if (!adminToken) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const ticketId = body.ticket_id;
  if (!ticketId) {
    return NextResponse.json({ error: "missing_ticket_id" }, { status: 400 });
  }

  const admin = getServiceRoleClient();
  const { data: ticket, error: ticketErr } = await admin
    .from("support_tickets")
    .update({
      status: "resolved",
      admin_notes: body.resolution ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .select("id, user_id, subject")
    .maybeSingle();

  if (ticketErr || !ticket) {
    return NextResponse.json(
      { error: "ticket_not_found", message: ticketErr?.message ?? "no_row" },
      { status: 404 },
    );
  }

  if (ticket.user_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, locale")
      .eq("id", ticket.user_id)
      .maybeSingle();

    if (profile?.email) {
      await sendEmail({
        template: "support_ticket_resolved",
        to: profile.email,
        userId: ticket.user_id,
        props: {
          appUrl: process.env["NEXT_PUBLIC_APP_URL"] ?? "https://seerah.com",
          ticketId: ticket.id,
          subject: ticket.subject,
          resolution: body.resolution ?? null,
          locale: profile.locale ?? "ar",
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
