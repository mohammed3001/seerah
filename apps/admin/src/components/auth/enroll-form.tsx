"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { confirmEnrollment, type EnrollmentFormState } from "@/app/(auth)/2fa/setup/actions";

import { TotpInput } from "./totp-input";

const initial: EnrollmentFormState = { ok: false, message: null };

export function EnrollForm() {
  const [state, formAction] = useActionState(confirmEnrollment, initial);
  if (state.ok === true) {
    return <RecoveryCodesView codes={state.codes} />;
  }
  return (
    <form action={formAction}>
      <TotpInput
        submitLabel="تأكيد التفعيل"
        pendingLabel="جاري التفعيل…"
        errorMessage={state.message}
      />
    </form>
  );
}

function RecoveryCodesView({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-700/40 bg-amber-950/30 p-4 text-sm text-amber-100">
        <p className="font-semibold">احفظ هذه الرموز في مكان آمن قبل المتابعة.</p>
        <p className="mt-1 text-amber-200/80">
          كل رمز يُستخدم مرّة واحدة فقط لتسجيل الدخول إذا فقدت تطبيق Authenticator. لن تظهر هذه
          الرموز مرّة أخرى — يمكنك توليد دفعة جديدة من صفحة الإعدادات (سيتم إلغاء الدفعة الحاليّة).
        </p>
      </div>
      <ul
        className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4 font-mono text-sm text-slate-100"
        dir="ltr"
      >
        {codes.map((code) => (
          <li key={code} className="select-all rounded bg-slate-900/70 px-3 py-2 tracking-wider">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "تم النسخ" : "نسخ كل الرموز"}
        </button>
        <Link
          href="/"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          حفظتها — متابعة إلى لوحة التحكّم
        </Link>
      </div>
    </div>
  );
}
