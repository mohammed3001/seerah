"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { recoveryAction, type RecoveryFormState } from "@/app/(auth)/2fa/recovery/actions";

const initial: RecoveryFormState = { ok: false, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-[#635BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5046ff] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "جاري التحقق…" : "تأكيد الرمز"}
    </button>
  );
}

export function RecoveryForm() {
  const [state, formAction] = useActionState(recoveryAction, initial);
  return (
    <form action={formAction}>
      <div className="space-y-4">
        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-slate-200">
            رمز الاسترداد
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            inputMode="text"
            autoComplete="one-time-code"
            // 12 hex chars + optional dashes/whitespace; the action does
            // its own strict validation after normalisation.
            maxLength={20}
            dir="ltr"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-center font-mono text-lg tracking-widest text-slate-50 outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/30"
            placeholder="xxxx-xxxx-xxxx"
          />
        </div>
        {state.message ? (
          <p
            role="alert"
            className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          >
            {state.message}
          </p>
        ) : null}
        <SubmitButton />
      </div>
    </form>
  );
}
