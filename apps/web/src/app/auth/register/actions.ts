"use server";

import { headers } from "next/headers";

import { validatePassword } from "@seerah/api/security";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SignupActionInput {
  email: string;
  password: string;
  fullName: string;
}

export interface SignupActionResult {
  ok: boolean;
  /** Arabic message — first failure, suitable for a toast. */
  message: string;
  /**
   * When the password is rejected by the policy, this carries every
   * failing rule so the form can render them inline.  Empty on
   * non-policy errors (e.g. Supabase rate limit).
   */
  passwordErrors?: string[];
}

/**
 * Server-side signup gate.
 *
 * Audit S4: the previous flow called `supabase.auth.signUp` directly
 * from the browser with only client-side zod validation in front.
 * That meant any caller hitting Supabase's REST endpoint with
 * `password: "Password1"` would succeed regardless of the form policy.
 * This action repeats the policy check authoritatively on the server
 * before forwarding to Supabase, so the password floor is enforced
 * even for callers that bypass our UI.
 *
 * Returns a structured result rather than throwing so the form can
 * render errors inline (consistent with React's `useFormState`
 * pattern).  Messages are intentionally ambiguous on duplicate-email
 * outcomes — the audit (1.1) requires that signup never reveals
 * whether an email is already registered.
 */
export async function signupAction(
  input: SignupActionInput,
): Promise<SignupActionResult> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (fullName.length < 2) {
    return { ok: false, message: "الاسم الكامل مطلوب" };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "صيغة البريد الإلكتروني غير صحيحة" };
  }

  const policyErrors = validatePassword(input.password, { email });
  if (policyErrors.length > 0) {
    return {
      ok: false,
      message: policyErrors[0]!.messageAr,
      passwordErrors: policyErrors.map((e) => e.messageAr),
    };
  }

  const supabase = await createSupabaseServerClient();

  // Build the email-callback URL from the request's own host so the
  // confirmation link round-trips back to the same deployment, even
  // when NEXT_PUBLIC_APP_URL is not set.
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const appUrl =
    process.env["NEXT_PUBLIC_APP_URL"] || (host ? `${proto}://${host}` : null);

  const { error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: appUrl ? `${appUrl}/auth/callback` : undefined,
    },
  });

  if (error) {
    // Do not surface Supabase's "User already registered" message —
    // that leaks account existence.  Anything other than rate-limit
    // gets a generic failure message.
    if (/rate limit|too many/i.test(error.message)) {
      return { ok: false, message: "محاولات كثيرة، حاول لاحقًا" };
    }
    return { ok: false, message: "تعذّر إنشاء الحساب، حاول مرة أخرى" };
  }

  return {
    ok: true,
    message: "تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد.",
  };
}
