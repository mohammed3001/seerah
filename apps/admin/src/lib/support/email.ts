import "server-only";

/**
 * Outbound notifications to the user when an admin replies or resolves
 * a ticket.  Both use the existing internal-token-protected endpoints
 * exposed by `apps/web` (`/api/admin/support/...`).  The endpoints
 * actually call Resend; here we just fire-and-track.
 *
 * `ADMIN_INTERNAL_TOKEN` and `WEB_APP_URL` (the public origin of the
 * consumer web app) must both be set.  When either is missing we
 * resolve to a "skipped" outcome so the admin action still succeeds —
 * the operator sees a warning that the email wasn't sent.
 */

export type EmailOutcome = { sent: true } | { sent: false; reason: string };

interface SendOptions {
  ticketId: string;
  body?: string | null;
  resolution?: string | null;
}

// Notification-only endpoints.  The DB transitions (status, audit log)
// happen via the admin RPCs in the admin app — these endpoints just
// send Resend emails.  The legacy `/api/admin/support/resolve` route
// in apps/web still combines both for backwards compatibility but we
// don't call it from C3.
const NOTIFY_REPLY_PATH = "/api/admin/support/notify-reply";
const NOTIFY_RESOLVE_PATH = "/api/admin/support/notify-resolve";

function webOrigin(): string | null {
  return process.env["WEB_APP_URL"] ?? process.env["NEXT_PUBLIC_APP_URL"] ?? null;
}

function token(): string | null {
  return process.env["ADMIN_INTERNAL_TOKEN"] ?? null;
}

async function postJson(path: string, payload: Record<string, unknown>): Promise<EmailOutcome> {
  const origin = webOrigin();
  const auth = token();
  if (!origin) {
    return { sent: false, reason: "WEB_APP_URL غير مهيّأ" };
  }
  if (!auth) {
    return { sent: false, reason: "ADMIN_INTERNAL_TOKEN غير مهيّأ" };
  }

  let url: URL;
  try {
    url = new URL(path, origin);
  } catch {
    return { sent: false, reason: "WEB_APP_URL غير صالح" };
  }

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${auth}`,
      },
      body: JSON.stringify(payload),
      // The admin app should not block the operator on a slow email.
      // Resend usually responds in <500ms; bail at 5s.
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        sent: false,
        reason: `فشل إرسال البريد (HTTP ${response.status}): ${text.slice(0, 200)}`,
      };
    }
    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { sent: false, reason: `فشل الاتصال بنظام البريد: ${msg}` };
  }
}

/** Email-only — DB has already been updated by the caller. */
export function notifyReply(opts: SendOptions): Promise<EmailOutcome> {
  return postJson(NOTIFY_REPLY_PATH, {
    ticket_id: opts.ticketId,
    body: opts.body ?? "",
  });
}

/** Email-only — DB has already been updated by the caller. */
export function notifyResolve(opts: SendOptions): Promise<EmailOutcome> {
  return postJson(NOTIFY_RESOLVE_PATH, {
    ticket_id: opts.ticketId,
    resolution: opts.resolution ?? null,
  });
}
