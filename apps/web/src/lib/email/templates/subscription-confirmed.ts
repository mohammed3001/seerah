import { renderEmail } from "../layout";
import type { RenderedEmail } from "./welcome";

export interface SubscriptionConfirmedProps {
  appUrl: string;
  amount: number;
  currency: "sar" | "usd";
  trialEnd: string | null;
  nextBillingAt: string | null;
  locale?: "ar" | "en";
}

function formatPrice(amount: number, currency: "sar" | "usd"): string {
  if (currency === "sar") return `${amount.toFixed(2)} ر.س`;
  return `$${amount.toFixed(2)}`;
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

export function renderSubscriptionConfirmed(p: SubscriptionConfirmedProps): RenderedEmail {
  const locale = p.locale ?? "ar";
  const subject =
    locale === "ar" ? "تم تفعيل اشتراك برايم 👑" : "Your Seerah Prime subscription is live 👑";

  const trialDate = formatDate(p.trialEnd, locale);
  const renewDate = formatDate(p.nextBillingAt, locale);

  const bodyAr = `
    <p>تم تفعيل اشتراك <strong>برايم</strong> بنجاح. كل القوالب وميزات الـAI الموسّعة متاحة الآن.</p>
    ${
      trialDate
        ? `<p>فترة التجربة المجانية تنتهي في <strong>${trialDate}</strong> — يمكنك الإلغاء قبلها بدون أي خصم من بوابة العميل.</p>`
        : ""
    }
    ${
      renewDate
        ? `<p>سيُجدَّد الاشتراك تلقائيًا في <strong>${renewDate}</strong> بمبلغ <strong>${formatPrice(p.amount, p.currency)}</strong>.</p>`
        : `<p>المبلغ المدفوع: <strong>${formatPrice(p.amount, p.currency)}</strong>.</p>`
    }
    <p>يمكنك تحديث طريقة الدفع أو إلغاء الاشتراك في أي وقت من بوابة العميل.</p>
  `;
  const bodyEn = `
    <p><strong>Prime</strong> is now active. All templates and the higher AI quota are unlocked.</p>
    ${
      trialDate
        ? `<p>Your free trial runs until <strong>${trialDate}</strong> — cancel any time from the customer portal and you won't be charged.</p>`
        : ""
    }
    ${
      renewDate
        ? `<p>Your subscription renews automatically on <strong>${renewDate}</strong> for <strong>${formatPrice(p.amount, p.currency)}</strong>.</p>`
        : `<p>Amount charged: <strong>${formatPrice(p.amount, p.currency)}</strong>.</p>`
    }
    <p>Update your payment method or cancel any time from the customer portal.</p>
  `;

  return {
    subject,
    html: renderEmail({
      subject,
      body: locale === "ar" ? bodyAr : bodyEn,
      cta: {
        label: locale === "ar" ? "إدارة اشتراكي" : "Manage subscription",
        url: `${p.appUrl}/subscription`,
      },
      preheader:
        locale === "ar"
          ? "تم تفعيل اشتراك برايم. كل الميزات متاحة الآن."
          : "Prime is active. All features unlocked.",
      locale,
    }),
  };
}
