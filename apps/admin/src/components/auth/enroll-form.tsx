"use client";

import { useActionState } from "react";

import { confirmEnrollment, type EnrollmentFormState } from "@/app/(auth)/2fa/setup/actions";

import { TotpInput } from "./totp-input";

const initial: EnrollmentFormState = { ok: false, message: null };

export function EnrollForm() {
  const [state, formAction] = useActionState(confirmEnrollment, initial);
  return (
    <form action={formAction}>
      <TotpInput
        submitLabel="تأكيد التفعيل"
        pendingLabel="جاري التفعيل…"
        errorMessage={state.ok === false ? state.message : null}
      />
    </form>
  );
}
