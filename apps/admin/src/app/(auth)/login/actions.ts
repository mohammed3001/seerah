"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logAdminAction } from "@/lib/audit";
import {
  LOCKOUT_MINUTES,
  MAX_FAILED_LOGINS,
  PENDING_COOKIE,
  PENDING_TTL_SECONDS,
} from "@/lib/auth/constants";
import { createPendingToken } from "@/lib/auth/pending";
import { extractClientIp } from "@/lib/ip";
import { getServiceRoleClient } from "@/lib/supabase-admin";

export type LoginFormState =
  | { ok: false; message: string | null }
  | { ok: true; redirectTo: string };

const Schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(512),
});

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = Schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "البريد الإلكتروني أو كلمة المرور غير صالحة." };
  }

  const supabase = getServiceRoleClient();
  const headerList = await headers();
  const ip = extractClientIp(headerList);
  const userAgent = headerList.get("user-agent");

  // Look up admin by email (case-insensitive).
  const { data: admin, error } = await supabase
    .from("admin_users")
    .select(
      "id, email, password_hash, role, totp_secret, totp_verified_at, is_active, failed_login_attempts, locked_until",
    )
    .eq("email", parsed.data.email.toLowerCase())
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[admin-login] lookup failed", error);
    return { ok: false, message: "حدث خطأ غير متوقع. حاول مرّة أخرى." };
  }

  // The lockout check MUST happen before the bcrypt comparison.  If we
  // checked it after, an attacker could distinguish a correct password from
  // a wrong one during the lockout window — correct passwords would fall
  // through to a "locked" message while wrong ones would hit the generic
  // "incorrect" branch.  That difference would leak the password and
  // defeat the brute-force protection entirely.
  //
  // We still always run bcrypt below (against the real hash on hit, against
  // a fixed dummy hash on miss) so that response time is constant whether
  // the email exists or not.  A dummy bcrypt is also run when an account is
  // locked, again for timing parity.
  const dummyHash = "$2a$10$cJZb6gvxQ.bgF2YkU8w/F.hOQwpxGzOEyB7jdEpQp.B7p8s7xqpVu";
  const lockedUntil = admin?.locked_until ? new Date(admin.locked_until).getTime() : 0;
  const isLocked = lockedUntil > Date.now();

  if (isLocked) {
    // Constant-time response regardless of whether the password is right.
    await bcrypt.compare(parsed.data.password, dummyHash);
    await logAdminAction({
      adminId: admin?.id ?? null,
      adminEmail: admin?.email ?? parsed.data.email.toLowerCase(),
      action: "admin.login.locked_attempt",
      ip,
      userAgent,
    });
    // Deliberately the same wording as a regular failure: revealing the
    // exact unlock time would also confirm the account exists.
    return { ok: false, message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }

  const matched = admin
    ? await bcrypt.compare(parsed.data.password, admin.password_hash)
    : await bcrypt.compare(parsed.data.password, dummyHash);

  if (!admin || !matched || !admin.is_active) {
    if (admin && !matched) {
      const nextAttempts = admin.failed_login_attempts + 1;
      const update: { failed_login_attempts: number; locked_until?: string } = {
        failed_login_attempts: nextAttempts,
      };
      if (nextAttempts >= MAX_FAILED_LOGINS) {
        update.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
      }
      await supabase.from("admin_users").update(update).eq("id", admin.id);
      await logAdminAction({
        adminId: admin.id,
        adminEmail: admin.email,
        action: "admin.login.failed",
        metadata: { attempts: nextAttempts, locked: nextAttempts >= MAX_FAILED_LOGINS },
        ip,
        userAgent,
      });
    } else {
      await logAdminAction({
        adminId: null,
        adminEmail: parsed.data.email.toLowerCase(),
        action: "admin.login.unknown_email",
        ip,
        userAgent,
      });
    }
    return { ok: false, message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }

  // Reset failed-login counter on success.
  if (admin.failed_login_attempts !== 0 || admin.locked_until !== null) {
    await supabase
      .from("admin_users")
      .update({ failed_login_attempts: 0, locked_until: null })
      .eq("id", admin.id);
  }

  // Issue pending cookie carrying the admin id.  Routes other than /2fa/*
  // reject this cookie; /2fa/* routes verify the signature + age.
  const pendingToken = await createPendingToken(admin.id);
  const cookieStore = await cookies();
  cookieStore.set(PENDING_COOKIE, pendingToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_TTL_SECONDS,
  });

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "admin.login.password_ok",
    metadata: { has_totp: !!admin.totp_secret, totp_verified: !!admin.totp_verified_at },
    ip,
    userAgent,
  });

  const target = admin.totp_secret ? "/2fa/verify" : "/2fa/setup";
  redirect(target);
}
