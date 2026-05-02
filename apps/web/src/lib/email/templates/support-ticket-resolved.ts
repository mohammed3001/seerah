import { escape, renderEmail } from "../layout";
import type { RenderedEmail } from "./welcome";

export interface SupportTicketResolvedProps {
  appUrl: string;
  ticketId: string;
  subject: string;
  /** Optional admin reply markdown — rendered as plain text paragraph. */
  resolution: string | null;
  locale?: "ar" | "en";
}

function paragraph(text: string): string {
  // Plain-text paragraph; respects newlines so admins can write multi-paragraph
  // resolutions in support_tickets.admin_notes without needing a rich editor.
  return text
    .split(/\n{2,}/)
    .map((s) => `<p>${escape(s.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function renderSupportTicketResolved(p: SupportTicketResolvedProps): RenderedEmail {
  const locale = p.locale ?? "ar";
  const heading = locale === "ar" ? "تم حل طلبك" : "Your support request is resolved";
  const shortId = p.ticketId.slice(0, 8);

  const bodyAr = `
    <p>أُغلق طلبك (<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escape(shortId)}</code> — ${escape(p.subject)}).</p>
    ${p.resolution ? paragraph(p.resolution) : ""}
    <p>إذا لم يحلّ الموضوع تمامًا، فقط ردّ على هذه الرسالة وسنعيد فتحه.</p>
  `;
  const bodyEn = `
    <p>We've closed your request (<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escape(shortId)}</code> — ${escape(p.subject)}).</p>
    ${p.resolution ? paragraph(p.resolution) : ""}
    <p>If anything is still off, reply to this email and we'll reopen it.</p>
  `;

  return {
    subject: locale === "ar" ? "تم حل طلبك — Seerah" : "Your Seerah support request — resolved",
    html: renderEmail({
      subject: locale === "ar" ? "تم حل طلبك — Seerah" : "Your Seerah support request — resolved",
      heading,
      body: locale === "ar" ? bodyAr : bodyEn,
      preheader: locale === "ar" ? `طلب الدعم ${shortId} أُغلق.` : `Ticket ${shortId} resolved.`,
      locale,
    }),
  };
}
