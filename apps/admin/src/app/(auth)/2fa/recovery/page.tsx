import Link from "next/link";

import { loadRecovery } from "./actions";

import { RecoveryForm } from "@/components/auth/recovery-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RecoveryPage() {
  const view = await loadRecovery();
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
      <p className="mb-4 text-sm text-slate-400">
        تسجيل الدخول كـ{" "}
        <span className="text-slate-100" dir="ltr">
          {view.email}
        </span>
      </p>
      <p className="mb-5 text-sm text-slate-300">
        أدخل أحد رموز الاسترداد التي حفظتها عند تفعيل المصادقة الثنائيّة. كلّ رمز يُستخدم مرّة واحدة
        فقط.
      </p>
      <RecoveryForm />
      <p className="mt-5 text-center text-sm">
        <Link href="/2fa/verify" className="text-slate-300 underline hover:text-slate-100">
          العودة إلى التحقّق العادي عبر تطبيق Authenticator
        </Link>
      </p>
    </div>
  );
}
