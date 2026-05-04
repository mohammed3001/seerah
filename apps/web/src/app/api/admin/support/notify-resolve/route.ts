/**
 * POST /api/admin/support/notify-resolve
 *
 * Email-only counterpart to `notify-reply`.  Called by the admin app
 * after it has flipped a ticket's status to `resolved` via
 * `admin_support_change_status`.  Sends the existing
 * `support_ticket_resolved` template and nothing else (no DB writes).
 *
 * Body: { ticket_id: string, resolution?: string | null }
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
    .select("id, user_id, subject")
    .eq("id", ticketId)
    .maybeSingle();
  if (ticketErr || !ticket) {
    return NextResponse.json(
      { error: "ticket_not_found", message: ticketErr?.message ?? "no_row" },
      { status: 404 },
    );
  }
  if (!ticket.user_id) {
    return NextResponse.json({ ok: true, skipped: "no_user" });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, locale")
    .eq("id", ticket.user_id)
    .maybeSingle();

  if (!profile?.email) {
    return NextResponse.json({ ok: true, skipped: "no_email" });
  }

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

  return NextResponse.json({ ok: true });
}
