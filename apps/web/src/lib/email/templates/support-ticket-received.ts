import { escape, renderEmail } from "../layout";
import type { RenderedEmail } from "./welcome";

export interface SupportTicketReceivedProps {
  appUrl: string;
  ticketId: string;
  subject: string;
  locale?: "ar" | "en";
}

export function renderSupportTicketReceived(p: SupportTicketReceivedProps): RenderedEmail {
  const locale = p.locale ?? "ar";
  const heading = locale === "ar" ? "استلمنا طلبك للدعم" : "We've received your support request";
  const shortId = p.ticketId.slice(0, 8);

  const bodyAr = `
    <p>تم استلام طلبك. سنرد عليك خلال يوم عمل واحد على هذا البريد.</p>
    <p>تفاصيل الطلب:</p>
    <ul style="padding:0 18px;margin:8px 0;">
      <li>رقم الطلب: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escape(shortId)}</code></li>
      <li>الموضوع: ${escape(p.subject)}</li>
    </ul>
    <p>إن أردت إضافة معلومات أو ملف للطلب، يكفي الرد على هذه الرسالة.</p>
  `;
  const bodyEn = `
    <p>We've got your request and will get back to you within one business day on this email address.</p>
    <p>Request details:</p>
    <ul style="padding:0 18px;margin:8px 0;">
      <li>Ticket: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escape(shortId)}</code></li>
      <li>Subject: ${escape(p.subject)}</li>
    </ul>
    <p>You can reply to this email to add more details or attachments.</p>
  `;

  return {
    subject: locale === "ar" ? "استلمنا طلبك للدعم — Seerah" : "Your Seerah support request",
    html: renderEmail({
      subject: locale === "ar" ? "استلمنا طلبك للدعم — Seerah" : "Your Seerah support request",
      heading,
      body: locale === "ar" ? bodyAr : bodyEn,
      preheader:
        locale === "ar"
          ? `طلب الدعم رقم ${shortId} استُلم. الرد خلال يوم عمل.`
          : `Ticket ${shortId} received. We'll reply within one business day.`,
      locale,
    }),
  };
}
