"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginFormState } from "@/app/(auth)/login/actions";

const initial: LoginFormState = { ok: false, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-[#635BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5046ff] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "جاري التحقّق…" : "تسجيل الدخول"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-200">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/30"
          placeholder="admin@seerah.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-200">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          minLength={1}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/30"
        />
      </div>
      {state.ok === false && state.message ? (
        <p
          role="alert"
          className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
