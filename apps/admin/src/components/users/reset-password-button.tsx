"use client";

import { useActionState } from "react";

import { sendPasswordResetEmail, type ActionState } from "@/lib/users/actions";

import { ActionFeedback } from "./action-feedback";

interface ResetPasswordButtonProps {
  userId: string;
  email: string;
}

export function ResetPasswordButton({ userId, email }: ResetPasswordButtonProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    sendPasswordResetEmail,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="email" value={email} />

      <p className="text-xs text-slate-500">
        سيتم إرسال رابط إعادة تعيين كلمة المرور إلى:{" "}
        <span dir="ltr" className="font-mono text-slate-700">
          {email}
        </span>
      </p>

      <ActionFeedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "جاري الإرسال…" : "إرسال رابط إعادة التعيين"}
      </button>
    </form>
  );
}
