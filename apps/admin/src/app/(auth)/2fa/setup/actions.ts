"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logAdminAction } from "@/lib/audit";
import { PENDING_COOKIE, PENDING_TTL_SECONDS } from "@/lib/auth/constants";
import { verifyPendingToken } from "@/lib/auth/pending";
import { generateRecoveryCodes } from "@/lib/auth/recovery";
import { createSession } from "@/lib/auth/session";
import { newTotpEnrollment, verifyTotp } from "@/lib/auth/totp";
import { extractClientIp } from "@/lib/ip";
import { getServiceRoleClient } from "@/lib/supabase-admin";

export interface PendingEnrollmentView {
  email: string;
  base32: string;
  uri: string;
}

export type EnrollmentFormState =
  | { ok: false; message: string | null }
  | { ok: true; codes: string[] };

/**
 * Server-side data fetcher for /2fa/setup.  Validates the pending cookie,
 * generates a fresh TOTP secret if the admin doesn't have one yet, and
 * returns the QR/URI for rendering.  Throws (via redirect) if the pending
 * token is missing/expired or the admin already has a verified TOTP.
 */
export async function loadEnrollment(): Promise<PendingEnrollmentView> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_COOKIE)?.value;
  if (!token) redirect("/login");

  const verified = await verifyPendingToken(token, PENDING_TTL_SECONDS);
  if (!verified) {
    cookieStore.delete(PENDING_COOKIE);
    redirect("/login");
  }

  const supabase = getServiceRoleClient();
  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("id, email, totp_secret, totp_verified_at, is_active")
    .eq("id", verified.admin_id)
    .maybeSingle();

  if (error || !admin || !admin.is_active) {
    cookieStore.delete(PENDING_COOKIE);
    redirect("/login");
  }

  if (admin.totp_secret && admin.totp_verified_at) {
    redirect("/2fa/verify");
  }

  // Reuse stored secret if a previous enrollment was started but never
  // confirmed; otherwise generate a fresh one and persist it.
  let base32 = admin.totp_secret;
  if (!base32) {
    const enrollment = newTotpEnrollment(admin.email);
    base32 = enrollment.base32;
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({ totp_secret: base32 })
      .eq("id", admin.id);
    if (updateError) {
      throw new Error(`Failed to persist TOTP secret: ${updateError.message}`);
    }
    return { email: admin.email, base32, uri: enrollment.uri };
  }

  // Rebuild the URI from the stored secret.
  const enrollment = newTotpEnrollment(admin.email);
  // We want the URI to match the *stored* secret, not the freshly-generated
  // one. Reconstruct by swapping the secret param.
  const uri = enrollment.uri.replace(/secret=[^&]+/, `secret=${encodeURIComponent(base32)}`);
  return { email: admin.email, base32, uri };
}

const VerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "أدخل رمز TOTP من ٦ أرقام."),
});

export async function confirmEnrollment(
  _prev: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const parsed = VerifySchema.safeParse({
    code: ((formData.get("code") as string) ?? "").replace(/\s+/g, ""),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "رمز غير صالح." };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_COOKIE)?.value;
  if (!token) redirect("/login");

  const verified = await verifyPendingToken(token, PENDING_TTL_SECONDS);
  if (!verified) {
    cookieStore.delete(PENDING_COOKIE);
    redirect("/login");
  }

  const supabase = getServiceRoleClient();
  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("id, email, totp_secret, totp_verified_at, is_active")
    .eq("id", verified.admin_id)
    .maybeSingle();

  if (error || !admin || !admin.is_active || !admin.totp_secret) {
    cookieStore.delete(PENDING_COOKIE);
    redirect("/login");
  }

  if (!verifyTotp(admin.totp_secret, admin.email, parsed.data.code)) {
    return { ok: false, message: "رمز TOTP غير صحيح. تأكد من توقيت الجهاز ثم حاول مجدّدًا." };
  }

  const headerList = await headers();
  const ip = extractClientIp(headerList);
  const userAgent = headerList.get("user-agent");

  await supabase
    .from("admin_users")
    .update({
      totp_verified_at: admin.totp_verified_at ?? new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      last_login_ip: ip,
    })
    .eq("id", admin.id);

  // Mint the recovery codes *before* the session.  generateRecoveryCodes
  // is the only path that returns the raw codes (they are never re-readable
  // after this); if it throws, the admin won't have a session yet, so they
  // can simply retry the enrollment without ending up in a half-state.
  const codes = await generateRecoveryCodes(admin.id);

  await createSession({ adminId: admin.id, ip, userAgent });
  cookieStore.delete(PENDING_COOKIE);

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "admin.login.totp_enrolled",
    ip,
    userAgent,
  });

  // We are now authenticated, but instead of redirecting we hand the codes
  // back to the form.  The page renders them once and the admin clicks
  // "I saved them" to land on /.  If the admin closes the tab without
  // saving, they can regenerate from /settings (the codes already in the
  // DB are unrecoverable but a regen wipes + replaces them atomically).
  return { ok: true, codes };
}
