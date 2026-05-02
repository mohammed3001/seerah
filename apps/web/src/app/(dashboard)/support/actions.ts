"use server";

import { revalidatePath } from "next/cache";

import { trackServer } from "@/lib/analytics/posthog";
import { sendEmail } from "@/lib/email/send";
import { getDashboardSession } from "@/lib/dashboard/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface SubmitInput {
  subject: string;
  message: string;
}

interface SubmitResult {
  ok: boolean;
  error?: string;
  ticketId?: string;
}

/**
 * Insert a support_tickets row owned by the current user, fire the
 * confirmation email, and PostHog event. Returns `{ ok }` for the form to
 * render a success/error state — we don't redirect because the user may
 * want to file a follow-up immediately.
 */
export async function submitSupportTicket(input: SubmitInput): Promise<SubmitResult> {
  const session = await getDashboardSession();

  const subject = input.subject.trim();
  const message = input.message.trim();
  if (subject.length < 3 || subject.length > 200) {
    return { ok: false, error: "subject_invalid" };
  }
  if (message.length < 10 || message.length > 4000) {
    return { ok: false, error: "message_invalid" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: session.userId, subject, message })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "insert_failed" };
  }

  await trackServer(session.userId, "support_ticket_created", {
    ticket_id: data.id,
  });

  // Fire-and-forget the confirmation email; never block the response on it.
  void sendEmail({
    template: "support_ticket_received",
    to: session.email,
    userId: session.userId,
    props: {
      appUrl: process.env["NEXT_PUBLIC_APP_URL"] ?? "https://seerah.com",
      ticketId: data.id,
      subject,
      locale: session.profile.locale ?? "ar",
    },
  });

  revalidatePath("/support");
  return { ok: true, ticketId: data.id };
}
