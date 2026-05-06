"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  regenerateAction,
  type RegenerateFormState,
} from "@/app/(dashboard)/settings/recovery-codes/actions";

const initial: RegenerateFormState = { ok: false, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "جاري التوليد…" : "تأكيد ـ توليد دفعة جديدة"}
    </button>
  );
}

export function RegenerateRecoveryCodesPanel() {
  const [state, formAction] = useActionState(regenerateAction, initial);
  if (state.ok === true) {
    return <NewlyGeneratedCodes codes={state.codes} />;
  }
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-rose-900">توليد دفعة جديدة</h2>
      <p className="mt-1 text-sm text-rose-900/80">
        إعادة التوليد تُلغي كلّ الرموز غير المستخدَمة في الدفعة الحاليّة فورًا. سيُطلب منك إدخال رمز
        TOTP من تطبيق Authenticator لتأكيد العمليّة — هذا يحمي حسابك في حال سُرقت ملفات تعريف
        الارتباط للجلسة الحاليّة.
      </p>
      <form action={formAction} className="mt-4 space-y-3">
        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-rose-950">
            رمز TOTP الحالي
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,9}"
            maxLength={9}
            dir="ltr"
            className="w-full max-w-xs rounded-lg border border-rose-300 bg-white px-3 py-3 text-center text-xl tracking-[0.4em] text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30"
            placeholder="123456"
          />
        </div>
        {state.message ? (
          <p
            role="alert"
            className="rounded-md border border-rose-300 bg-rose-100 px-3 py-2 text-sm text-rose-900"
          >
            {state.message}
          </p>
        ) : null}
        <SubmitButton />
      </form>
    </section>
  );
}

function NewlyGeneratedCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");
  return (
    <section className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-emerald-900">دفعة جديدة جاهزة</h2>
      <p className="mt-1 text-sm text-emerald-900/80">
        احفظ الرموز التالية في مكان آمن قبل مغادرة هذه الصفحة. لن تظهر مرّة أخرى.
      </p>
      <ul
        className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-emerald-200 bg-white p-4 font-mono text-sm text-slate-900"
        dir="ltr"
      >
        {codes.map((code) => (
          <li key={code} className="select-all rounded bg-emerald-50 px-3 py-2 tracking-wider">
            {code}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-4 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm text-emerald-900 transition hover:bg-emerald-100"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "تم النسخ" : "نسخ كل الرموز"}
      </button>
    </section>
  );
}
