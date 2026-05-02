import { renderEmail } from "../layout";
import type { RenderedEmail } from "./welcome";

export interface SubscriptionCancelledProps {
  appUrl: string;
  /** When access ends. Null when cancellation is effective immediately. */
  endsAt: string | null;
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

export function renderSubscriptionCancelled(p: SubscriptionCancelledProps): RenderedEmail {
  const locale = p.locale ?? "ar";
  const subject =
    locale === "ar" ? "تم إلغاء اشتراك Seerah" : "Your Seerah subscription is cancelled";
  const ends = formatDate(p.endsAt, locale);

  const bodyAr = `
    <p>أكدنا إلغاء اشتراكك في <strong>برايم</strong>.</p>
    ${
      ends
        ? `<p>ستحتفظ بميزات برايم حتى نهاية الفترة الحالية في <strong>${ends}</strong>، وبعدها سيرجع حسابك للخطة المجانية.</p>`
        : `<p>تم تحويل حسابك للخطة المجانية.</p>`
    }
    <p>سيرتك وكل بياناتك تبقى محفوظة كما هي. يمكنك إعادة الاشتراك في أي وقت بضغطة واحدة.</p>
    <p style="font-size:13px;color:#64748b;">إن كان هناك سبب دفعك للإلغاء — نسعد لو شاركتنا بـردّ سريع على هذه الرسالة.</p>
  `;
  const bodyEn = `
    <p>We've confirmed the cancellation of your <strong>Prime</strong> subscription.</p>
    ${
      ends
        ? `<p>You'll keep Prime benefits until the current period ends on <strong>${ends}</strong>, after which your account moves back to the free plan.</p>`
        : `<p>Your account is now on the free plan.</p>`
    }
    <p>Your resumes and data stay exactly where they are. Resubscribe any time in one click.</p>
    <p style="font-size:13px;color:#64748b;">If something specific drove the cancellation, we'd love a quick reply telling us what.</p>
  `;

  return {
    subject,
    html: renderEmail({
      subject,
      body: locale === "ar" ? bodyAr : bodyEn,
      cta: {
        label: locale === "ar" ? "إعادة الاشتراك" : "Resubscribe",
        url: `${p.appUrl}/subscription`,
      },
      preheader:
        locale === "ar"
          ? ends
            ? `الاشتراك ملغى. الوصول حتى ${ends}.`
            : "تم تحويل حسابك للخطة المجانية."
          : ends
            ? `Cancelled. Access until ${ends}.`
            : "You're now on the free plan.",
      locale,
    }),
  };
}
