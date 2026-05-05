"use server";

import { validatePassword } from "@seerah/api/security";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ResetPasswordActionResult {
  ok: boolean;
  message: string;
  passwordErrors?: string[];
}

/**
 * Server-side reset-password gate.
 *
 * Audit S4: previously the new password was sent directly to Supabase
 * from the browser, so the policy check was advisory only.  This
 * server action runs `validatePassword` authoritatively before
 * forwarding to `supabase.auth.updateUser`.
 *
 * The user must already be in a recovery session for `updateUser` to
 * succeed.  We re-derive the session via the cookie-bound server
 * client; a stale or unauthenticated request fails with the same
 * generic error message Supabase would have returned, so we don't
 * leak whether the recovery link was valid.
 */
export async function resetPasswordAction(
  password: string,
): Promise<ResetPasswordActionResult> {
  const policyErrors = validatePassword(password);
  if (policyErrors.length > 0) {
    return {
      ok: false,
      message: policyErrors[0]!.messageAr,
      passwordErrors: policyErrors.map((e) => e.messageAr),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, message: "تعذّر تحديث كلمة المرور، حاول مرة أخرى" };
  }

  return { ok: true, message: "تم تحديث كلمة المرور" };
}
