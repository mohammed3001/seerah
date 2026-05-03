"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logAdminAction } from "@/lib/audit";
import { PENDING_COOKIE, PENDING_TTL_SECONDS } from "@/lib/auth/constants";
import { verifyPendingToken } from "@/lib/auth/pending";
import { createSession } from "@/lib/auth/session";
import { verifyTotp } from "@/lib/auth/totp";
import { extractClientIp } from "@/lib/ip";
import { getServiceRoleClient } from "@/lib/supabase-admin";

export type VerifyFormState = { ok: false; message: string | null };

const Schema = z.object({
  code: z.string().regex(/^\d{6}$/, "أدخل رمز TOTP من ٦ أرقام."),
});

export interface VerifyView {
  email: string;
}

export async function loadVerify(): Promise<VerifyView> {
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

  if (!admin.totp_secret) redirect("/2fa/setup");
  return { email: admin.email };
}

export async function verifyAction(
  _prev: VerifyFormState,
  formData: FormData,
): Promise<VerifyFormState> {
  const parsed = Schema.safeParse({
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

  await createSession({ adminId: admin.id, ip, userAgent });
  cookieStore.delete(PENDING_COOKIE);

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "admin.login.totp_ok",
    ip,
    userAgent,
  });

  redirect("/");
}
