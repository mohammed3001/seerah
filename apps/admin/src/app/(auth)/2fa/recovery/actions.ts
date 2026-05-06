"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logAdminAction } from "@/lib/audit";
import { PENDING_COOKIE, PENDING_TTL_SECONDS } from "@/lib/auth/constants";
import { verifyPendingToken } from "@/lib/auth/pending";
import { consumeRecoveryCode } from "@/lib/auth/recovery";
import { createSession } from "@/lib/auth/session";
import { extractClientIp } from "@/lib/ip";
import { getServiceRoleClient } from "@/lib/supabase-admin";

export type RecoveryFormState = { ok: false; message: string | null };

// Recovery codes are 12 hex chars.  We accept any combination of dashes
// and whitespace between them and normalise inside consumeRecoveryCode().
// The shape check here is intentionally permissive — the strict
// validation lives in lib/auth/recovery.ts so the timing of malformed
// inputs stays consistent across callers.
const Schema = z.object({
  code: z.string().min(12, "أدخل رمز الاسترداد كاملًا.").max(64),
});

export interface RecoveryView {
  email: string;
}

/**
 * Server-side data fetcher for /2fa/recovery.  Same gating as the
 * standard verify route — the admin must hold a valid PENDING_COOKIE
 * that means "password was correct, prove second factor".  Difference:
 * here the second factor is a one-time recovery code instead of a TOTP.
 */
export async function loadRecovery(): Promise<RecoveryView> {
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
    .select("id, email, totp_secret, is_active")
    .eq("id", verified.admin_id)
    .maybeSingle();

  if (error || !admin || !admin.is_active) {
    cookieStore.delete(PENDING_COOKIE);
    redirect("/login");
  }

  // No TOTP enrolled means the admin has no recovery codes either —
  // bounce them back to /2fa/setup which is the only path that mints
  // codes today.
  if (!admin.totp_secret) redirect("/2fa/setup");
  return { email: admin.email };
}

export async function recoveryAction(
  _prev: RecoveryFormState,
  formData: FormData,
): Promise<RecoveryFormState> {
  const parsed = Schema.safeParse({ code: ((formData.get("code") as string) ?? "").trim() });
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
    .select("id, email, is_active, totp_verified_at")
    .eq("id", verified.admin_id)
    .maybeSingle();

  if (error || !admin || !admin.is_active) {
    cookieStore.delete(PENDING_COOKIE);
    redirect("/login");
  }

  const headerList = await headers();
  const ip = extractClientIp(headerList);
  const userAgent = headerList.get("user-agent");

  const result = await consumeRecoveryCode(admin.id, parsed.data.code, { ip, userAgent });
  if (!result.ok) {
    // Generic message — never leak whether the code was unknown vs
    // already-used vs belongs-to-different-admin.  Each differential
    // would let a brute-forcer probe the table.
    return { ok: false, message: "رمز الاسترداد غير صالح أو مُستخدَم مسبقًا." };
  }

  await supabase
    .from("admin_users")
    .update({
      totp_verified_at: admin.totp_verified_at ?? new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      last_login_ip: ip,
    })
    .eq("id", admin.id);

  await createSession({ adminId: admin.id, ip, userAgent });
  cookieStore.delete(PENDING_COOKIE);

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "admin.login.recovery_code_used",
    metadata: { remaining: result.remaining },
    ip,
    userAgent,
  });

  // Surface a separate audit event when the admin is one or two codes
  // away from running out — gives the operator a chance to remind them
  // to regenerate before they're locked out for real.
  if (result.remaining <= 2) {
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "admin.login.recovery_codes_low",
      metadata: { remaining: result.remaining },
      ip,
      userAgent,
    });
  }

  redirect("/");
}
