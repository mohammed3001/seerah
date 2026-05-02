import { escape, renderEmail } from "../layout";

export interface WelcomeProps {
  fullName: string | null;
  appUrl: string;
  unsubscribeUrl: string;
  locale?: "ar" | "en";
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

export function renderWelcome(p: WelcomeProps): RenderedEmail {
  const locale = p.locale ?? "ar";
  const greetingName = p.fullName ? escape(p.fullName) : locale === "ar" ? "مرحبًا بك" : "there";

  const subject = locale === "ar" ? "أهلًا بك في Seerah 👋" : "Welcome to Seerah 👋";
  const heading =
    locale === "ar"
      ? `أهلًا ${p.fullName ? `يا ${greetingName}` : ""} في Seerah`
      : `Welcome${p.fullName ? `, ${greetingName}` : ""}`;

  const bodyAr = `
    <p>سعداء بانضمامك. خلال أقل من ٥ دقائق يمكنك إنشاء سيرتك الذاتية الأولى — اختيار قالب، إضافة تجربتك، وتصدير PDF احترافي.</p>
    <p>هذا ما يميز Seerah:</p>
    <ul style="padding:0 18px;margin:8px 0;">
      <li>ذكاء اصطناعي عربي يصحّح الصياغة ويقترح تحسينات.</li>
      <li>قوالب احترافية صُمّمت خصيصًا للسوق العربي.</li>
      <li>تصدير PDF / PNG عالي الدقة وجاهز للتوظيف.</li>
    </ul>
    <p>إذا احتجت أي مساعدة، فقط ردّ على هذه الرسالة وسنكون متاحين.</p>
  `;
  const bodyEn = `
    <p>Glad to have you on board. In under 5 minutes you can spin up your first resume — pick a template, add your experience, and export a clean PDF.</p>
    <p>What you get with Seerah:</p>
    <ul style="padding:0 18px;margin:8px 0;">
      <li>Arabic-first AI that polishes phrasing and suggests upgrades.</li>
      <li>Professional templates designed for the MENA hiring market.</li>
      <li>High-fidelity PDF / PNG export, recruiter-ready.</li>
    </ul>
    <p>Reply to this email any time if you need a hand.</p>
  `;

  return {
    subject,
    html: renderEmail({
      subject,
      heading,
      body: locale === "ar" ? bodyAr : bodyEn,
      cta: {
        label: locale === "ar" ? "ابدأ سيرتك الآن" : "Start your resume",
        url: `${p.appUrl}/dashboard`,
      },
      preheader:
        locale === "ar"
          ? "حسابك جاهز. ابدأ بإنشاء سيرتك في أقل من ٥ دقائق."
          : "Your account is ready. Start your resume in under 5 minutes.",
      showUnsubscribe: true,
      unsubscribeUrl: p.unsubscribeUrl,
      locale,
    }),
  };
}
