"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentAdmin } from "../auth/current";
import { extractClientIp } from "../ip";
import { getServiceRoleClient } from "../supabase-admin";

import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  TEMPLATE_CATEGORIES,
  type TemplateImageKind,
} from "./types";

export interface ActionState {
  ok: boolean;
  message: string;
  /** Optional payload returned to the client after a successful action. */
  data?: Record<string, unknown>;
}

const OK = (message: string, data?: ActionState["data"]): ActionState => ({
  ok: true,
  message,
  ...(data ? { data } : {}),
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
    "template_manager",
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

// ---------- 1. Toggle pricing (premium / free) ----------------------------
const pricingSchema = z.object({
  templateId: z.string().min(1),
  isPremium: z.preprocess((v) => v === "true" || v === true, z.boolean()),
});

export async function setTemplatePricing(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = pricingSchema.safeParse({
    templateId: formData.get("templateId"),
    isPremium: formData.get("isPremium"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_set_template_pricing", {
    p_template_id: parsed.data.templateId,
    p_is_premium: parsed.data.isPremium,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر التحديث: ${error.message}`);

  revalidatePath("/templates");
  return OK(parsed.data.isPremium ? "أصبح مدفوعًا." : "أصبح مجانيًا.");
}

// ---------- 2. Toggle active / inactive -----------------------------------
const activeSchema = z.object({
  templateId: z.string().min(1),
  isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()),
});

export async function setTemplateActive(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = activeSchema.safeParse({
    templateId: formData.get("templateId"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_set_template_active", {
    p_template_id: parsed.data.templateId,
    p_is_active: parsed.data.isActive,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر التحديث: ${error.message}`);

  revalidatePath("/templates");
  return OK(parsed.data.isActive ? "تم التفعيل." : "تم التعطيل.");
}

// ---------- 3. Reorder templates ------------------------------------------
// Receives the current ordered list of template ids.  The client passes a
// JSON-encoded array via a single form field to keep FormData simple.
const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});

export async function reorderTemplates(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  let parsedIds: unknown;
  try {
    parsedIds = JSON.parse(String(formData.get("ids") ?? "[]"));
  } catch {
    return ERR("بيانات الترتيب غير صالحة.");
  }
  const parsed = reorderSchema.safeParse({ ids: parsedIds });
  if (!parsed.success) return ERR("بيانات الترتيب غير صالحة.");

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_reorder_templates", {
    p_template_ids: parsed.data.ids,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر تحديث الترتيب: ${error.message}`);

  revalidatePath("/templates");
  return OK("تم تحديث الترتيب.");
}

// ---------- 4. Update metadata --------------------------------------------
// Empty strings are coerced to null so we can distinguish "user cleared
// the field" (currently impossible — RPC ignores nulls) from "user didn't
// touch the field" (also null).  In practice the form always submits all
// fields, so the COALESCE-on-null in the RPC means nullable fields cannot
// be cleared via this UI; that's an intentional simplification.
const updateMetadataSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1).max(120),
  nameAr: z.string().min(1).max(120),
  descriptionEn: z.string().max(2000).optional().nullable(),
  descriptionAr: z.string().max(2000).optional().nullable(),
  category: z.enum(TEMPLATE_CATEGORIES),
  tags: z.string().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  previewUrl: z.string().url().optional().nullable(),
});

function parseTagsString(input: string | null | undefined): string[] | null {
  if (input === null || input === undefined) return null;
  const cleaned = input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return cleaned;
}

export async function updateTemplateMetadata(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = updateMetadataSchema.safeParse({
    templateId: formData.get("templateId"),
    name: formData.get("name"),
    nameAr: formData.get("nameAr"),
    descriptionEn: formData.get("descriptionEn") || null,
    descriptionAr: formData.get("descriptionAr") || null,
    category: formData.get("category"),
    tags: formData.get("tags") || null,
    thumbnailUrl: formData.get("thumbnailUrl") || null,
    previewUrl: formData.get("previewUrl") || null,
  });
  if (!parsed.success) {
    return ERR(
      `بيانات غير صالحة: ${parsed.error.errors.map((e) => e.message).join(", ")}`,
    );
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_update_template_metadata", {
    p_template_id: parsed.data.templateId,
    p_name: parsed.data.name,
    p_name_ar: parsed.data.nameAr,
    p_description_en: parsed.data.descriptionEn ?? null,
    p_description_ar: parsed.data.descriptionAr ?? null,
    p_category: parsed.data.category,
    p_tags: parseTagsString(parsed.data.tags),
    p_thumbnail_url: parsed.data.thumbnailUrl ?? null,
    p_preview_url: parsed.data.previewUrl ?? null,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر التحديث: ${error.message}`);

  revalidatePath("/templates");
  return OK("تم حفظ التغييرات.");
}

// ---------- 5. Create template --------------------------------------------
const createSchema = z.object({
  id: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9_]+$/, {
      message: "معرّف غير صالح (أحرف صغيرة وأرقام وشرطة سفلية فقط).",
    }),
  name: z.string().min(1).max(120),
  nameAr: z.string().min(1).max(120),
  descriptionEn: z.string().max(2000).optional().nullable(),
  descriptionAr: z.string().max(2000).optional().nullable(),
  category: z.enum(TEMPLATE_CATEGORIES),
  isPremium: z.preprocess((v) => v === "true" || v === true, z.boolean()),
  tags: z.string().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  previewUrl: z.string().url().optional().nullable(),
});

export async function createTemplate(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = createSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    nameAr: formData.get("nameAr"),
    descriptionEn: formData.get("descriptionEn") || null,
    descriptionAr: formData.get("descriptionAr") || null,
    category: formData.get("category"),
    isPremium: formData.get("isPremium"),
    tags: formData.get("tags") || null,
    thumbnailUrl: formData.get("thumbnailUrl") || null,
    previewUrl: formData.get("previewUrl") || null,
  });
  if (!parsed.success) {
    return ERR(
      `بيانات غير صالحة: ${parsed.error.errors.map((e) => e.message).join(", ")}`,
    );
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_create_template", {
    p_id: parsed.data.id,
    p_name: parsed.data.name,
    p_name_ar: parsed.data.nameAr,
    p_description_en: parsed.data.descriptionEn ?? null,
    p_description_ar: parsed.data.descriptionAr ?? null,
    p_category: parsed.data.category,
    p_is_premium: parsed.data.isPremium,
    p_tags: parseTagsString(parsed.data.tags),
    p_thumbnail_url: parsed.data.thumbnailUrl ?? null,
    p_preview_url: parsed.data.previewUrl ?? null,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر الإنشاء: ${error.message}`);

  revalidatePath("/templates");
  return OK("تم إنشاء القالب.", { id: data });
}

// ---------- 6. Delete template --------------------------------------------
// super_admin only — refuses if any resume still references the template.
const deleteSchema = z.object({
  templateId: z.string().min(1),
  confirm: z.string(),
});

export async function deleteTemplate(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin"]);
  if (!guard.ok) return guard.error;

  const parsed = deleteSchema.safeParse({
    templateId: formData.get("templateId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  if (parsed.data.confirm.trim().toUpperCase() !== "DELETE") {
    return ERR("اكتب DELETE للتأكيد.");
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_delete_template", {
    p_template_id: parsed.data.templateId,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) {
    return ERR(`تعذّر الحذف: ${error.message}`);
  }

  revalidatePath("/templates");
  return OK("تم حذف القالب.");
}

// ---------- 7. Upload template image --------------------------------------
// Validates file type + size, uploads to template-previews (public bucket),
// returns the public URL.  Server-side because the service-role key signs
// the upload — the browser never sees that key.
export async function uploadTemplateImage(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const file = formData.get("file");
  const templateId = String(formData.get("templateId") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "").trim();

  if (!(file instanceof File)) return ERR("لم يتم اختيار ملف.");
  if (!templateId) return ERR("معرّف القالب مفقود.");
  if (kindRaw !== "thumbnail" && kindRaw !== "preview") {
    return ERR("نوع الصورة غير صالح.");
  }
  const kind = kindRaw as TemplateImageKind;

  if (file.size === 0) return ERR("الملف فارغ.");
  if (file.size > MAX_IMAGE_BYTES) {
    return ERR("حجم الصورة أكبر من ١٠ ميغابايت.");
  }
  if (!ALLOWED_IMAGE_MIME.includes(file.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
    return ERR("الصيغة غير مدعومة (PNG / JPG / WebP فقط).");
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const safeId = templateId.replace(/[^a-z0-9_-]/gi, "_");
  const objectKey = `${safeId}/${kind}-${Date.now()}.${ext}`;

  const supabase = getServiceRoleClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from("template-previews")
    .upload(objectKey, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadErr) return ERR(`تعذّر رفع الصورة: ${uploadErr.message}`);

  const { data } = supabase.storage
    .from("template-previews")
    .getPublicUrl(objectKey);

  return OK("تم رفع الصورة.", { url: data.publicUrl, kind });
}
