import "server-only";

import { Resend } from "resend";

let cached: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env["RESEND_API_KEY"] && process.env["RESEND_FROM_EMAIL"]);
}

export function getResendClient(): Resend | null {
  if (cached) return cached;
  const key = process.env["RESEND_API_KEY"];
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

interface SendArgs {
  to: string;
  subject: string;
  /** Plain text body — converted to a minimal HTML wrapper for Resend. */
  body: string;
  /** Optional Arabic prefix in the subject ("[Seerah]" by default). */
  subjectPrefix?: string;
}

export interface SendDirectEmailResult {
  ok: boolean;
  /** Reason the email could not be sent. `null` on success. */
  reason: "not_configured" | "send_failed" | null;
  /** Resend message id when the call succeeded. */
  messageId: string | null;
  /** Underlying error string for diagnostics — never shown to end users. */
  error: string | null;
}

/**
 * Send a one-off plain-text email to a user.  Used by the admin "Send direct
 * email" action.  Returns a structured result so the UI can show a clear
 * "Resend not configured" badge instead of pretending the email shipped.
 */
export async function sendDirectEmail(args: SendArgs): Promise<SendDirectEmailResult> {
  if (!isResendConfigured()) {
    return { ok: false, reason: "not_configured", messageId: null, error: null };
  }

  const resend = getResendClient();
  if (!resend) {
    return { ok: false, reason: "not_configured", messageId: null, error: null };
  }

  const from = process.env["RESEND_FROM_EMAIL"]!;
  const prefix = args.subjectPrefix ?? "[Seerah]";

  // Minimal HTML wrapper: paragraphs split on blank lines, line breaks
  // preserved.  Keep it simple — admins write a free-form message and we
  // ship it without "send via Word for the Web" surprises.
  const escaped = args.body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!doctype html>
<html dir="rtl" lang="ar">
  <body style="font-family: system-ui, sans-serif; line-height: 1.7; color: #0f172a;">
    ${escaped
      .split(/\n{2,}/)
      .map((para) => `<p style="margin:0 0 1em 0;">${para.replace(/\n/g, "<br>")}</p>`)
      .join("\n")}
  </body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: args.to,
      subject: `${prefix} ${args.subject}`,
      text: args.body,
      html,
    });
    if (error) {
      return {
        ok: false,
        reason: "send_failed",
        messageId: null,
        error: typeof error === "string" ? error : (error.message ?? "resend_error"),
      };
    }
    return { ok: true, reason: null, messageId: data?.id ?? null, error: null };
  } catch (e) {
    return {
      ok: false,
      reason: "send_failed",
      messageId: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
