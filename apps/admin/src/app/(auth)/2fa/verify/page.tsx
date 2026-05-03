import { loadVerify } from "./actions";

import { VerifyForm } from "@/components/auth/verify-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function VerifyPage() {
  const view = await loadVerify();
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
      <p className="mb-4 text-sm text-slate-400">
        تسجيل الدخول كـ <span className="text-slate-100" dir="ltr">{view.email}</span>
      </p>
      <p className="mb-5 text-sm text-slate-300">
        افتح تطبيق Authenticator لديك وأدخل الرمز المعروض حاليًا.
      </p>
      <VerifyForm />
    </div>
  );
}
