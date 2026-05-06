"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentAdmin } from "../auth/current";
import { extractClientIp } from "../ip";
import { getServiceRoleClient } from "../supabase-admin";

export interface ActionState {
  ok: boolean;
  message: string;
}

const OK = (message: string): ActionState => ({ ok: true, message });
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
  allowed: Array<"super_admin" | "support_agent" | "template_manager"> = ["super_admin"],
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

// ---------- 1. Change template --------------------------------------------
const changeTemplateSchema = z.object({
  resumeId: z.string().uuid(),
  templateId: z.string().min(1),
});

/**
 * Allowed for super_admin and template_manager.  The RPC validates that
 * the chosen template is active so the admin can't park a resume on a
 * disabled template.
 */
export async function changeResumeTemplate(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin", "template_manager"]);
  if (!guard.ok) return guard.error;

  const parsed = changeTemplateSchema.safeParse({
    resumeId: formData.get("resumeId"),
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_set_resume_template", {
    p_resume_id: parsed.data.resumeId,
    p_template_id: parsed.data.templateId,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر تغيير القالب: ${error.message}`);

  revalidatePath("/resumes");
  return OK("تم تغيير القالب.");
}

// ---------- 2. Toggle featured --------------------------------------------
const featuredSchema = z.object({
  resumeId: z.string().uuid(),
  featured: z.preprocess((v) => v === "true" || v === true, z.boolean()),
});

/**
 * Toggle the featured flag.  Allowed for super_admin and template_manager
 * (since the showcase is a curation surface).
 */
export async function setResumeFeatured(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin", "template_manager"]);
  if (!guard.ok) return guard.error;

  const parsed = featuredSchema.safeParse({
    resumeId: formData.get("resumeId"),
    featured: formData.get("featured"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_set_resume_featured", {
    p_resume_id: parsed.data.resumeId,
    p_featured: parsed.data.featured,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر التحديث: ${error.message}`);

  revalidatePath("/resumes");
  return OK(parsed.data.featured ? "تم التمييز." : "تم إلغاء التمييز.");
}

// ---------- 3. Delete resume ----------------------------------------------
const deleteSchema = z.object({
  resumeId: z.string().uuid(),
  confirm: z.string(),
});

/**
 * Delete a resume permanently.  super_admin only.  The admin must type the
 * full word "DELETE" to confirm — defends against accidental clicks and
 * copy-paste mistakes.  Cascade FKs clean up section rows automatically.
 */
export async function deleteResume(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin"]);
  if (!guard.ok) return guard.error;

  const parsed = deleteSchema.safeParse({
    resumeId: formData.get("resumeId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  if (parsed.data.confirm.trim().toUpperCase() !== "DELETE") {
    return ERR("اكتب DELETE للتأكيد.");
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_delete_resume", {
    p_resume_id: parsed.data.resumeId,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر حذف السيرة: ${error.message}`);

  revalidatePath("/resumes");
  return OK("تم حذف السيرة.");
}
