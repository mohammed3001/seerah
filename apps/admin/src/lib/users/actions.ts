"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { deleteUserStorageArtifacts } from "@seerah/api/security";

import { logAdminAction } from "../audit";
import { getCurrentAdmin } from "../auth/current";
import { sendDirectEmail } from "../email";
import { extractClientIp } from "../ip";
import { getServiceRoleClient } from "../supabase-admin";

import { type Plan, PLAN_OPTIONS } from "./types";

export interface ActionState {
  ok: boolean;
  message: string;
  /** When set, the UI should toast this as a warning rather than an error
   *  (e.g. "Resend not configured — email not sent but plan still updated"). */
  warning?: string;
}

const OK = (message: string, warning?: string): ActionState => ({
  ok: true,
  message,
  ...(warning !== undefined ? { warning } : {}),
});
const ERR = (message: string): ActionState => ({ ok: false, message });

type RequireAdminResult =
  | { ok: false; error: ActionState }
  | {
      ok: true;
      ctx: NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>;
      ip: string | null;
      userAgent: string | null;
    };

async function requireAdmin(
  allowed: Array<"super_admin" | "support_agent" | "template_manager"> = [
    "super_admin",
  ],
): Promise<RequireAdminResult> {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (!allowed.includes(ctx.admin.role)) {
    return { ok: false, error: ERR("ليس لديك صلاحية لتنفيذ هذا الإجراء.") };
  }
  const hdrs = await headers();
  return {
    ok: true,
    ctx,
    ip: extractClientIp(hdrs),
    userAgent: hdrs.get("user-agent"),
  };
}

// ---------- 1. Change plan -------------------------------------------------
const changePlanSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["free", "prime", "enterprise"]),
  // <input type="date" /> submits an empty string when blank, which is the
  // expected case (label says "اختياري").  Don't enforce min(1) — that would
  // fire before .optional()/.nullable() and reject the empty submission.
  expiresAt: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function changeUserPlan(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin"]);
  if (!guard.ok) return guard.error;

  const parsed = changePlanSchema.safeParse({
    userId: formData.get("userId"),
    plan: formData.get("plan"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  const { userId, plan, expiresAt } = parsed.data;
  const supabase = getServiceRoleClient();

  // The RPC handles the UPDATE + audit insert atomically.
  const { error } = await supabase.rpc("admin_set_user_plan", {
    p_user_id: userId,
    p_plan: plan,
    p_expires_at: expiresAt,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });

  if (error) return ERR(`تعذّر تحديث الخطة: ${error.message}`);

  revalidatePath(`/users/${userId}`);
  revalidatePath(`/users`);
  return OK(`تم تحديث الخطة إلى ${plan}.`);
}

// ---------- 2. Reset password ---------------------------------------------
const resetSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
});

export async function sendPasswordResetEmail(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin", "support_agent"]);
  if (!guard.ok) return guard.error;

  const parsed = resetSchema.safeParse({
    userId: formData.get("userId"),
    email: formData.get("email"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  const supabase = getServiceRoleClient();
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://seerah.com";
  const redirectTo = `${appUrl.replace(/\/$/, "")}/auth/reset-password`;

  // resetPasswordForEmail actually triggers Supabase to send the recovery
  // email via its configured SMTP.  generateLink (admin) only generates the
  // URL — it does NOT send anything, and we'd silently leave the admin
  // believing the mail shipped.
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo },
  );

  if (error) return ERR(`تعذّر إرسال رابط إعادة التعيين: ${error.message}`);

  await logAdminAction({
    adminId: guard.ctx.admin.id,
    adminEmail: guard.ctx.admin.email,
    action: "admin.user.password_reset_sent",
    targetType: "user",
    targetId: parsed.data.userId,
    metadata: { email: parsed.data.email },
    ip: guard.ip,
    userAgent: guard.userAgent,
  });

  revalidatePath(`/users/${parsed.data.userId}`);
  return OK("تم إرسال بريد إعادة تعيين كلمة المرور.");
}

// ---------- 3. Disable / enable -------------------------------------------
const toggleSchema = z.object({
  userId: z.string().uuid(),
  disabled: z.preprocess((v) => v === "true" || v === true, z.boolean()),
  reason: z.string().max(500).optional().default(""),
});

export async function setUserDisabled(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin"]);
  if (!guard.ok) return guard.error;

  const parsed = toggleSchema.safeParse({
    userId: formData.get("userId"),
    disabled: formData.get("disabled"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  const supabase = getServiceRoleClient();

  const { error } = await supabase.rpc("admin_set_user_disabled", {
    p_user_id: parsed.data.userId,
    p_disabled: parsed.data.disabled,
    p_reason: parsed.data.reason,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });

  if (error) return ERR(`تعذّر تحديث الحالة: ${error.message}`);

  // When disabling, also revoke all of the user's active auth sessions so
  // they can't continue using the app on a stale JWT.
  if (parsed.data.disabled) {
    const { error: signOutErr } = await supabase.auth.admin.signOut(
      parsed.data.userId,
    );
    if (signOutErr) {
      // Non-fatal: the profile is disabled, the gating layer in apps/web
      // checks `is_disabled` server-side on every request, so the user
      // can't actually do anything.  Log and move on.
      console.error("[admin] failed to sign out disabled user:", signOutErr);
    }
  }

  revalidatePath(`/users/${parsed.data.userId}`);
  revalidatePath(`/users`);
  return OK(parsed.data.disabled ? "تم تعطيل الحساب." : "تم تفعيل الحساب.");
}

// ---------- 4. Delete account ---------------------------------------------
const deleteSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  confirm: z.string(),
});

export async function deleteUserAccount(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin"]);
  if (!guard.ok) return guard.error;

  const parsed = deleteSchema.safeParse({
    userId: formData.get("userId"),
    email: formData.get("email"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  // Require the admin to type DELETE — defends against accidental clicks
  // and copy-paste mistakes.  The match is case-insensitive but trimmed.
  if (parsed.data.confirm.trim().toUpperCase() !== "DELETE") {
    return ERR("اكتب DELETE للتأكيد.");
  }

  const supabase = getServiceRoleClient();
  // Audit F3: storage cleanup must happen BEFORE auth.admin.deleteUser.
  // Once the user row is gone we lose the userId binding the storage
  // policies use to authorise deletion (and the user-scoped client
  // can't run anyway).  Storage failures are non-fatal — the audit log
  // captures the counts so an operator can sweep manually if needed.
  const storage = await deleteUserStorageArtifacts(supabase, parsed.data.userId);

  const { error } = await supabase.auth.admin.deleteUser(parsed.data.userId);

  if (error) return ERR(`تعذّر حذف الحساب: ${error.message}`);

  await logAdminAction({
    adminId: guard.ctx.admin.id,
    adminEmail: guard.ctx.admin.email,
    action: "admin.user.deleted",
    targetType: "user",
    targetId: parsed.data.userId,
    metadata: {
      email: parsed.data.email,
      storage_avatars_deleted: storage.avatars,
      storage_attachments_deleted: storage.attachments,
      storage_errors: storage.errors.length > 0 ? storage.errors : undefined,
    },
    ip: guard.ip,
    userAgent: guard.userAgent,
  });

  revalidatePath(`/users`);
  // The detail page no longer exists; redirect to the list.
  redirect("/users");
}

// ---------- 5. Add internal admin note ------------------------------------
const noteSchema = z.object({
  userId: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

export async function addUserAdminNote(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin", "support_agent"]);
  if (!guard.ok) return guard.error;

  const parsed = noteSchema.safeParse({
    userId: formData.get("userId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return ERR("الملاحظة فارغة أو طويلة جداً.");

  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("admin_notes").insert({
    target_type: "user",
    target_id: parsed.data.userId,
    admin_id: guard.ctx.admin.id,
    admin_email: guard.ctx.admin.email,
    body: parsed.data.body,
  });

  if (error) return ERR(`تعذّر إضافة الملاحظة: ${error.message}`);

  await logAdminAction({
    adminId: guard.ctx.admin.id,
    adminEmail: guard.ctx.admin.email,
    action: "admin.user.note_added",
    targetType: "user",
    targetId: parsed.data.userId,
    metadata: { length: parsed.data.body.length },
    ip: guard.ip,
    userAgent: guard.userAgent,
  });

  revalidatePath(`/users/${parsed.data.userId}`);
  return OK("تمت إضافة الملاحظة.");
}

const deleteNoteSchema = z.object({
  noteId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function deleteUserAdminNote(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin", "support_agent"]);
  if (!guard.ok) return guard.error;

  const parsed = deleteNoteSchema.safeParse({
    noteId: formData.get("noteId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  const supabase = getServiceRoleClient();
  // Scope the DELETE to the user we're acting on so a support_agent can't
  // delete a note attached to a different user / resume / ticket by passing
  // an arbitrary noteId in the form.
  const { error } = await supabase
    .from("admin_notes")
    .delete()
    .eq("id", parsed.data.noteId)
    .eq("target_type", "user")
    .eq("target_id", parsed.data.userId);

  if (error) return ERR(`تعذّر حذف الملاحظة: ${error.message}`);

  await logAdminAction({
    adminId: guard.ctx.admin.id,
    adminEmail: guard.ctx.admin.email,
    action: "admin.user.note_deleted",
    targetType: "user",
    targetId: parsed.data.userId,
    metadata: { note_id: parsed.data.noteId },
    ip: guard.ip,
    userAgent: guard.userAgent,
  });

  revalidatePath(`/users/${parsed.data.userId}`);
  return OK("تم حذف الملاحظة.");
}

// ---------- 6. Send direct email ------------------------------------------
const directEmailSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
});

export async function sendDirectEmailToUser(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin", "support_agent"]);
  if (!guard.ok) return guard.error;

  const parsed = directEmailSchema.safeParse({
    userId: formData.get("userId"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) return ERR("بيانات البريد غير صالحة.");

  const result = await sendDirectEmail({
    to: parsed.data.email,
    subject: parsed.data.subject,
    body: parsed.data.body,
  });

  await logAdminAction({
    adminId: guard.ctx.admin.id,
    adminEmail: guard.ctx.admin.email,
    action: "admin.user.email_sent",
    targetType: "user",
    targetId: parsed.data.userId,
    metadata: {
      to: parsed.data.email,
      subject: parsed.data.subject,
      ok: result.ok,
      reason: result.reason,
      message_id: result.messageId,
    },
    ip: guard.ip,
    userAgent: guard.userAgent,
  });

  if (result.ok) return OK("تم إرسال البريد.");
  if (result.reason === "not_configured") {
    return ERR("Resend غير مفعّل. أضف RESEND_API_KEY و RESEND_FROM_EMAIL ثم أعد المحاولة.");
  }
  return ERR(`فشل الإرسال: ${result.error ?? "خطأ غير معروف"}`);
}

// ---------- export typed plan list for forms ------------------------------
export const ADMIN_PLAN_OPTIONS: readonly Plan[] = PLAN_OPTIONS;
