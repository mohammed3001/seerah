"use client";

import { useActionState } from "react";

import { sendDirectEmailToUser, type ActionState } from "@/lib/users/actions";

import { ActionFeedback, ActionWarning } from "./action-feedback";

interface SendEmailFormProps {
  userId: string;
  email: string;
  resendConfigured: boolean;
}

export function SendEmailForm({ userId, email, resendConfigured }: SendEmailFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    sendDirectEmailToUser,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="email" value={email} />

      {!resendConfigured ? (
        <ActionWarning message="Resend غير مفعّل (RESEND_API_KEY و RESEND_FROM_EMAIL مفقودان). يمكنك كتابة الرسالة لكن لن تُرسَل." />
      ) : null}

      <p className="text-xs text-slate-500">
        إلى:{" "}
        <span dir="ltr" className="font-mono text-slate-700">
          {email}
        </span>
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">العنوان</label>
        <input
          type="text"
          name="subject"
          required
          maxLength={200}
          placeholder="موضوع الرسالة"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">الرسالة</label>
        <textarea
          name="body"
          rows={6}
          required
          maxLength={10000}
          placeholder="نص الرسالة…"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <ActionFeedback state={state} />

      <button
        type="submit"
        disabled={pending || !resendConfigured}
        className="rounded-md bg-[#635BFF] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#5247d6] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "جاري الإرسال…" : "إرسال"}
      </button>
    </form>
  );
}
