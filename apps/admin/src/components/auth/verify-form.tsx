"use client";

import { useActionState } from "react";

import { verifyAction, type VerifyFormState } from "@/app/(auth)/2fa/verify/actions";

import { TotpInput } from "./totp-input";

const initial: VerifyFormState = { ok: false, message: null };

export function VerifyForm() {
  const [state, formAction] = useActionState(verifyAction, initial);
  return (
    <form action={formAction}>
      <TotpInput
        submitLabel="تسجيل الدخول"
        pendingLabel="جاري التحقّق…"
        errorMessage={state.ok === false ? state.message : null}
      />
    </form>
  );
}
