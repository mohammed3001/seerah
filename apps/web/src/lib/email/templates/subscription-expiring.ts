import { renderEmail } from "../layout";
import type { RenderedEmail } from "./welcome";

export interface SubscriptionExpiringProps {
  appUrl: string;
  /** When the subscription's current period ends. */
  expiresAt: string;
  /** Whether the subscription is set to cancel at period end (vs auto-renew). */
  willAutoRenew: boolean;
  unsubscribeUrl: string;
  locale?: "ar" | "en";
}

function formatDate(iso: string, locale: "ar" | "en"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function renderSubscriptionExpiring(p: SubscriptionExpiringProps): RenderedEmail {
  const locale = p.locale ?? "ar";
  const subject =
    locale === "ar"
      ? p.willAutoRenew
        ? "تذكير: اشتراك Seerah يُجدَّد بعد 7 أيام"
        : "تذكير: اشتراك Seerah ينتهي بعد 7 أيام"
      : p.willAutoRenew
        ? "Reminder: your Seerah subscription renews in 7 days"
        : "Reminder: your Seerah subscription expires in 7 days";
  const date = formatDate(p.expiresAt, locale);

  const bodyAr = p.willAutoRenew
    ? `
      <p>اشتراكك في <strong>برايم</strong> سيُجدَّد تلقائيًا في <strong>${date}</strong>.</p>
      <p>إذا أردت إيقاف التجديد التلقائي يمكنك ذلك من بوابة العميل قبل التاريخ. سيظل اشتراكك فعّالًا حتى نهاية الفترة الحالية حتى لو ألغيت الآن.</p>
    `
    : `
      <p>اشتراكك في <strong>برايم</strong> ينتهي في <strong>${date}</strong> ولن يُجدَّد تلقائيًا.</p>
      <p>بعد التاريخ سيرجع حسابك للخطة المجانية وستفقد ميزات برايم (القوالب المميزة، حصة الـAI الموسّعة، التصدير غير المحدود). يمكنك إعادة التفعيل بضغطة واحدة.</p>
    `;
  const bodyEn = p.willAutoRenew
    ? `
      <p>Your <strong>Prime</strong> subscription renews automatically on <strong>${date}</strong>.</p>
      <p>To stop auto-renewal, manage your subscription from the customer portal before then. You'll keep Prime until the end of the current period either way.</p>
    `
    : `
      <p>Your <strong>Prime</strong> subscription ends on <strong>${date}</strong> and won't renew.</p>
      <p>After that you'll move back to the free plan and lose Prime benefits (premium templates, larger AI quota, unlimited exports). Reactivate any time in one click.</p>
    `;

  return {
    subject,
    html: renderEmail({
      subject,
      body: locale === "ar" ? bodyAr : bodyEn,
      cta: {
        label: locale === "ar" ? "إدارة الاشتراك" : "Manage subscription",
        url: `${p.appUrl}/subscription`,
      },
      preheader:
        locale === "ar"
          ? p.willAutoRenew
            ? `سيُجدَّد اشتراكك في ${date}.`
            : `ينتهي اشتراكك في ${date}.`
          : p.willAutoRenew
            ? `Renewing on ${date}.`
            : `Expires on ${date}.`,
      showUnsubscribe: true,
      unsubscribeUrl: p.unsubscribeUrl,
      locale,
    }),
  };
}
