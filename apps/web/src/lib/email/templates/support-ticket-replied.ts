import { escape, renderEmail } from "../layout";
import type { RenderedEmail } from "./welcome";

export interface SupportTicketRepliedProps {
  appUrl: string;
  ticketId: string;
  subject: string;
  /** Plain-text reply body (admin-authored).  Rendered as paragraphs. */
  body: string;
  locale?: "ar" | "en";
}

function paragraph(text: string): string {
  // Same plain-text-to-HTML strategy as `support_ticket_resolved`: split
  // on blank lines, escape, preserve single newlines as <br>.  Keeps
  // admin replies free of any markup risk.
  return text
    .split(/\n{2,}/)
    .map((s) => `<p>${escape(s.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function renderSupportTicketReplied(p: SupportTicketRepliedProps): RenderedEmail {
  const locale = p.locale ?? "ar";
  const heading = locale === "ar" ? "ردّ من فريق الدعم" : "A reply from support";
  const shortId = p.ticketId.slice(0, 8);

  const bodyAr = `
    <p>وصل ردّ على طلبك (<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escape(shortId)}</code> — ${escape(p.subject)}):</p>
    ${paragraph(p.body)}
    <p>إذا أردت المتابعة، فقط ردّ على هذه الرسالة.</p>
  `;
  const bodyEn = `
    <p>You have a new reply on your request (<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escape(shortId)}</code> — ${escape(p.subject)}):</p>
    ${paragraph(p.body)}
    <p>To follow up, just reply to this email.</p>
  `;

  return {
    subject: locale === "ar" ? "ردّ من فريق الدعم — Seerah" : "Reply from Seerah support",
    html: renderEmail({
      subject: locale === "ar" ? "ردّ من فريق الدعم — Seerah" : "Reply from Seerah support",
      heading,
      body: locale === "ar" ? bodyAr : bodyEn,
      preheader:
        locale === "ar" ? `ردّ جديد على طلبك ${shortId}.` : `New reply on ticket ${shortId}.`,
      locale,
    }),
  };
}
