import { loadEnrollment } from "./actions";

import { EnrollForm } from "@/components/auth/enroll-form";
import { QrCode } from "@/components/auth/qr-code";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SetupPage() {
  const view = await loadEnrollment();
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
      <p className="mb-4 text-sm text-slate-400">
        تفعيل المصادقة الثنائية لـ{" "}
        <span className="text-slate-100" dir="ltr">
          {view.email}
        </span>
      </p>
      <ol className="mb-5 list-decimal space-y-1.5 pr-5 text-sm text-slate-300">
        <li>افتح تطبيق Google Authenticator أو Authy.</li>
        <li>امسح الرمز التالي ضوئيًا، أو أدخل المفتاح يدويًا.</li>
        <li>أدخل الرمز المكوَّن من ٦ أرقام أدناه لتأكيد التفعيل.</li>
      </ol>

      <div className="mb-4">
        <QrCode uri={view.uri} />
      </div>

      <div className="mb-5 rounded-lg border border-slate-800 bg-slate-950 p-3">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">المفتاح اليدوي</p>
        <code dir="ltr" className="select-all break-all text-xs text-slate-200">
          {view.base32}
        </code>
      </div>

      <EnrollForm />
      <p className="mt-4 text-xs text-slate-500">
        احفظ المفتاح في مكان آمن (مدير كلمات سرّ مثلًا) — ستحتاجه إن فقدت الجهاز.
      </p>
    </div>
  );
}
