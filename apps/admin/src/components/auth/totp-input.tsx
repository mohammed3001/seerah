"use client";

import { useFormStatus } from "react-dom";

interface Props {
  pendingLabel?: string;
  submitLabel?: string;
  errorMessage: string | null;
}

function SubmitButton({
  pendingLabel,
  submitLabel,
}: {
  pendingLabel: string;
  submitLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-[#635BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5046ff] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : submitLabel}
    </button>
  );
}

export function TotpInput({
  pendingLabel = "جاري التحقّق…",
  submitLabel = "تأكيد",
  errorMessage,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-slate-200">
          رمز التحقّق (TOTP)
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
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-center text-xl tracking-[0.4em] text-slate-50 outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/30"
          placeholder="123456"
        />
      </div>
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {errorMessage}
        </p>
      ) : null}
      <SubmitButton pendingLabel={pendingLabel} submitLabel={submitLabel} />
    </div>
  );
}
