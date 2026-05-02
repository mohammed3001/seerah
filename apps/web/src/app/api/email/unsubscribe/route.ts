/**
 * GET /api/email/unsubscribe?token=<uuid>
 *
 * One-click unsubscribe flow used by the marketing-email footer. Looks up
 * the profile by `unsubscribe_token`, flips `marketing_emails_enabled` to
 * false, and returns a small HTML confirmation page so users see something
 * other than raw JSON when they click the link in Gmail / Apple Mail.
 *
 * Security:
 *   - Tokens are random uuids generated per profile at signup. No
 *     authentication required (the user can't reasonably stay logged in
 *     across the email client → browser hop).
 *   - This only flips the marketing flag — transactional mail (receipts,
 *     payment failures, support) keeps flowing because suppressing those
 *     is not legal under CAN-SPAM and similar regulations.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlPage(title: string, message: string): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body { margin:0; padding:48px 16px; background:#f8fafc; font-family:'Segoe UI', system-ui, 'Noto Sans Arabic', sans-serif; color:#0f172a; }
  main { max-width:480px; margin:0 auto; background:#fff; padding:32px; border-radius:12px; box-shadow:0 1px 2px rgba(15,23,42,.06); text-align:center; }
  h1 { font-size:22px; margin:0 0 12px; }
  p { font-size:15px; line-height:1.6; color:#334155; margin:0 0 16px; }
  a { color:#0f172a; text-decoration:none; font-weight:600; }
</style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <p>${message}</p>
  <p><a href="https://seerah.com">العودة إلى Seerah</a></p>
</main>
</body>
</html>`;
}

export async function GET(request: NextRequest): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return new NextResponse(
      htmlPage("رابط غير صالح", "الرابط ناقص المعطيات. لا يمكننا التعرف على الحساب."),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  const admin = getServiceRoleClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, marketing_emails_enabled")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!profile) {
    return new NextResponse(htmlPage("رابط غير صالح", "هذا الرابط غير صالح أو منتهي الصلاحية."), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (profile.marketing_emails_enabled === false) {
    return new NextResponse(
      htmlPage(
        "تم تأكيد إلغاء الاشتراك",
        "أنت بالفعل خارج قائمة الرسائل التسويقية. لن تصلك تذكيرات إضافية.",
      ),
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  await admin.from("profiles").update({ marketing_emails_enabled: false }).eq("id", profile.id);

  return new NextResponse(
    htmlPage(
      "تم إلغاء الاشتراك بنجاح",
      "لن تصلك رسائل تسويقية أو تذكيرات بعد الآن. سيستمر إرسال إشعارات الفواتير والاشتراك لأنها قانونيًا إلزامية.",
    ),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
