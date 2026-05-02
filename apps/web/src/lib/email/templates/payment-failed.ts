import { renderEmail } from "../layout";
import type { RenderedEmail } from "./welcome";

export interface PaymentFailedProps {
  appUrl: string;
  /** When Stripe will next attempt the charge. ISO 8601 or null. */
  nextRetryAt: string | null;
  locale?: "ar" | "en";
}

function formatDate(iso: string | null, locale: "ar" | "en"): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function renderPaymentFailed(p: PaymentFailedProps): RenderedEmail {
  const locale = p.locale ?? "ar";
  const subject =
    locale === "ar" ? "تعذّر تجديد اشتراك Seerah" : "We couldn't renew your Seerah subscription";
  const retry = formatDate(p.nextRetryAt, locale);

  const bodyAr = `
    <p>حاولنا تجديد اشتراكك في <strong>برايم</strong> لكن البطاقة رفضت العملية.</p>
    <p>اشتراكك لا يزال فعّالًا الآن — Stripe سيحاول تلقائيًا عدة مرات خلال الأسبوعين القادمين${
      retry ? ` (المحاولة التالية في <strong>${retry}</strong>)` : ""
    }. لتفادي فقدان الميزات، يرجى تحديث طريقة الدفع من بوابة العميل.</p>
    <p>أسباب الرفض الشائعة: انتهاء صلاحية البطاقة، عدم كفاية الرصيد، أو حظر العملية من البنك.</p>
  `;
  const bodyEn = `
    <p>We tried to renew your <strong>Prime</strong> subscription but the card was declined.</p>
    <p>Your access is still active — Stripe will retry the charge a few more times over the next two weeks${
      retry ? ` (next retry on <strong>${retry}</strong>)` : ""
    }. Update your payment method from the customer portal so you don't lose access.</p>
    <p>Common causes: expired card, insufficient funds, or the bank flagging the transaction.</p>
  `;

  return {
    subject,
    html: renderEmail({
      subject,
      body: locale === "ar" ? bodyAr : bodyEn,
      cta: {
        label: locale === "ar" ? "تحديث طريقة الدفع" : "Update payment method",
        url: `${p.appUrl}/subscription`,
      },
      preheader:
        locale === "ar"
          ? "بطاقتك رُفضت أثناء تجديد الاشتراك. حدّث طريقة الدفع لتفادي فقدان الميزات."
          : "Your card was declined while renewing. Update your payment method to keep Prime.",
      locale,
    }),
  };
}
