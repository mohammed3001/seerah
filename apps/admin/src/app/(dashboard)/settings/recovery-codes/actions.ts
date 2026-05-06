"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logAdminAction } from "@/lib/audit";
import { getCurrentAdmin } from "@/lib/auth/current";
import { countUnusedCodes, generateRecoveryCodes } from "@/lib/auth/recovery";
import { verifyTotp } from "@/lib/auth/totp";
import { extractClientIp } from "@/lib/ip";
import { getServiceRoleClient } from "@/lib/supabase-admin";

export interface RecoveryCodesView {
  email: string;
  remaining: number;
  generatedAt: string | null;
}

export type RegenerateFormState =
  | { ok: false; message: string | null }
  | { ok: true; codes: string[] };

const Schema = z.object({
  code: z.string().regex(/^\d{6}$/, "أدخل رمز TOTP من ٦ أرقام لتأكيد العمليّة."),
});

export async function loadRecoveryCodesView(): Promise<RecoveryCodesView> {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");

  const supabase = getServiceRoleClient();
  const { data: row } = await supabase
    .from("admin_users")
    .select("email, recovery_codes_generated_at")
    .eq("id", ctx.admin.id)
    .maybeSingle();

  return {
    email: row?.email ?? ctx.admin.email,
    remaining: await countUnusedCodes(ctx.admin.id),
    generatedAt: row?.recovery_codes_generated_at ?? null,
  };
}

/**
 * Regenerate the admin's recovery codes after re-confirming TOTP.
 *
 * Why TOTP again on the same session: the existing session was created
 * via TOTP at login, but it is currently long-lived (`SESSION_TTL_SECONDS`).
 * If the session cookie is stolen, an attacker who lands here without
 * the second factor would otherwise be able to wipe the legitimate
 * codes and replace them with their own — letting them keep access
 * even after the legit admin notices and rotates the password.  Forcing
 * a fresh TOTP closes that window.
 */
export async function regenerateAction(
  _prev: RegenerateFormState,
  formData: FormData,
): Promise<RegenerateFormState> {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");

  const parsed = Schema.safeParse({
    code: ((formData.get("code") as string) ?? "").replace(/\s+/g, ""),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "رمز غير صالح." };
  }

  const supabase = getServiceRoleClient();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("totp_secret, totp_verified_at")
    .eq("id", ctx.admin.id)
    .maybeSingle();
  if (!admin?.totp_secret || !admin.totp_verified_at) {
    redirect("/2fa/setup");
  }

  if (!verifyTotp(admin.totp_secret, ctx.admin.email, parsed.data.code)) {
    return { ok: false, message: "رمز TOTP غير صحيح. تأكد من توقيت الجهاز ثم حاول مجدّدًا." };
  }

  const codes = await generateRecoveryCodes(ctx.admin.id);

  const headerList = await headers();
  await logAdminAction({
    adminId: ctx.admin.id,
    adminEmail: ctx.admin.email,
    action: "admin.recovery_codes.regenerated",
    metadata: { count: codes.length },
    ip: extractClientIp(headerList),
    userAgent: headerList.get("user-agent"),
  });

  return { ok: true, codes };
}
