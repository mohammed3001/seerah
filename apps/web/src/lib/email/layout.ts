/**
 * Shared HTML shell for every transactional email.
 *
 * Why hand-rolled and not react-email or mjml: 7 templates with simple
 * single-column content layouts, ~10MB of deps + a separate render step
 * is overkill. The CSS here is intentionally inlined and minimal because
 * Gmail / Outlook / Apple Mail strip half of what doesn't live on the
 * style attribute.
 */

interface LayoutOptions {
  /** Page <title>; also used as the H1 unless `heading` is overridden. */
  subject: string;
  /** Optional explicit heading (defaults to `subject`). */
  heading?: string;
  /** Body HTML — already-escaped or sanitised. */
  body: string;
  /** Primary CTA button. Optional. */
  cta?: { label: string; url: string };
  /** Whether to render the marketing-only unsubscribe footer. */
  showUnsubscribe?: boolean;
  /** Unsubscribe URL when `showUnsubscribe` is true. */
  unsubscribeUrl?: string;
  /** Pre-header (preview text shown by Gmail / Apple Mail next to subject). */
  preheader?: string;
  /** Email language; controls dir + lang attributes. Defaults to ar. */
  locale?: "ar" | "en";
}

const BRAND = {
  name: "Seerah",
  url: "https://seerah.com",
  // System-ui chain works without webfont loading (Cairo is a CDN ask we
  // don't want to depend on for email rendering — Gmail blocks remote
  // stylesheets anyway).
  fontStack:
    "'Segoe UI', 'Helvetica Neue', system-ui, -apple-system, 'Noto Sans Arabic', sans-serif",
} as const;

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmail(opts: LayoutOptions): string {
  const locale = opts.locale ?? "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";
  const heading = opts.heading ?? opts.subject;
  const cta = opts.cta
    ? `
      <tr>
        <td align="center" style="padding:24px 0 8px;">
          <a href="${escape(opts.cta.url)}"
             style="background:#0f172a;color:#ffffff;text-decoration:none;
                    padding:12px 28px;border-radius:8px;display:inline-block;
                    font-weight:600;font-size:15px;">
            ${escape(opts.cta.label)}
          </a>
        </td>
      </tr>`
    : "";
  const unsubscribe =
    opts.showUnsubscribe && opts.unsubscribeUrl
      ? `
      <tr>
        <td style="padding:16px 24px;font-size:12px;color:#94a3b8;text-align:center;">
          ${
            locale === "ar"
              ? `وصلتك هذه الرسالة لأنك مشترك في تحديثات Seerah.
                 <a href="${escape(opts.unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">إلغاء الاشتراك</a>`
              : `You received this because you opted in to Seerah updates.
                 <a href="${escape(opts.unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>`
          }
        </td>
      </tr>`
      : "";
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escape(opts.preheader)}</div>`
    : "";

  // Note: kept explicit table-based layout; modern flexbox/grid still aren't
  // safe in Outlook 2016/2019.
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(opts.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:${BRAND.fontStack};color:#0f172a;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
             style="background:#ffffff;border-radius:12px;
                    box-shadow:0 1px 2px rgba(15,23,42,0.06);overflow:hidden;
                    max-width:560px;width:100%;">
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #f1f5f9;">
            <a href="${BRAND.url}" style="text-decoration:none;color:#0f172a;
                font-weight:700;font-size:20px;letter-spacing:-0.01em;">
              ${BRAND.name}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;font-weight:700;color:#0f172a;">
              ${escape(heading)}
            </h1>
            <div style="font-size:15px;line-height:1.7;color:#334155;">
              ${opts.body}
            </div>
          </td>
        </tr>
        ${cta}
        <tr>
          <td style="padding:24px 32px;border-top:1px solid #f1f5f9;
                     font-size:12px;color:#94a3b8;text-align:center;">
            © ${new Date().getFullYear()} Seerah ·
            <a href="${BRAND.url}" style="color:#64748b;text-decoration:none;">${BRAND.url.replace(/^https?:\/\//, "")}</a>
          </td>
        </tr>
        ${unsubscribe}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export { escape };
