"use server";

import { revalidatePath } from "next/cache";

import { TEMPLATE_BY_ID, type TemplateId } from "@/templates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/dashboard/get-session";

export type DesignActionResult = { ok: true } | { error: string };

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/**
 * Apply a template to a resume. Premium templates are gated to prime/enterprise
 * accounts — free users get a friendly upgrade error instead of a successful
 * write so the UI can prompt them.
 *
 * Two layers of validation:
 *
 *   1. **Code registry** (`TEMPLATE_BY_ID`).  This is the only place that
 *      knows how to render a template — every entry has a React component
 *      attached.  A template id that isn't in code can never produce
 *      output, so we reject it early with a clear "unknown" message.
 *
 *   2. **DB row** (`public.templates`).  Admins flex pricing
 *      (`is_premium`) and visibility (`is_active`) via the admin panel.
 *      The DB is the source of truth for those two flags — the
 *      `is_premium` field on the in-code registry is just a build-time
 *      hint shown in the picker.  Reading them server-side here means
 *      an admin can deactivate or re-price a template without a code
 *      deploy, and a malicious request that posts a deactivated id is
 *      rejected even if the client UI hasn't refreshed.
 *
 * RLS on the user-bound supabase client filters templates to
 * `is_active = true`, so a query for a deactivated template returns
 * null — that's the same path as a fully unknown DB row.  We surface
 * a single "currently unavailable" message for both because the
 * distinction doesn't matter to the user (and we don't want to leak
 * the existence of soft-deleted templates).
 */
export async function applyTemplate(
  resumeId: string,
  templateId: string,
): Promise<DesignActionResult> {
  const session = await getDashboardSession();
  const meta = TEMPLATE_BY_ID[templateId as TemplateId];
  if (!meta) return { error: "تصميم غير معروف" };
  const supabase = await createSupabaseServerClient();
  const { data: dbRow, error: lookupError } = await supabase
    .from("templates")
    .select("is_premium, is_active")
    .eq("id", meta.id)
    .maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (!dbRow || !dbRow.is_active) {
    return { error: "هذا التصميم غير متاح حاليًا." };
  }
  if (dbRow.is_premium && session.profile.plan === "free") {
    return { error: "هذا التصميم متاح للمشتركين فقط" };
  }
  const { error } = await supabase
    .from("resumes")
    .update({ template_id: meta.id })
    .eq("id", resumeId)
    .eq("user_id", session.userId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/resume/${resumeId}`);
  revalidatePath(`/dashboard/resume/${resumeId}/design`);
  return { ok: true };
}

/**
 * Set the resume's accent colour. Stored alongside theme.mode under the
 * `theme` jsonb column so a single fetch hydrates the entire visual config.
 */
export async function applyAccentColor(
  resumeId: string,
  color: string | null,
): Promise<DesignActionResult> {
  const session = await getDashboardSession();
  if (color !== null && !HEX_COLOUR.test(color)) {
    return { error: "اللون غير صالح" };
  }
  const supabase = await createSupabaseServerClient();
  const { data: row, error: readError } = await supabase
    .from("resumes")
    .select("theme")
    .eq("id", resumeId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (readError) return { error: readError.message };
  if (!row) return { error: "السيرة غير موجودة" };

  const current = (row.theme as { mode?: "light" | "dark"; primary_color?: string } | null) ?? {};
  const next = {
    mode: current.mode ?? "light",
    ...(color ? { primary_color: color } : {}),
  } as { mode: "light" | "dark"; primary_color?: string };
  if (color === null) delete (next as { primary_color?: string }).primary_color;

  const { error } = await supabase
    .from("resumes")
    .update({ theme: next })
    .eq("id", resumeId)
    .eq("user_id", session.userId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/resume/${resumeId}`);
  revalidatePath(`/dashboard/resume/${resumeId}/design`);
  return { ok: true };
}

/** Toggle theme mode (light/dark) for the rendered template. */
export async function applyThemeMode(
  resumeId: string,
  mode: "light" | "dark",
): Promise<DesignActionResult> {
  const session = await getDashboardSession();
  const supabase = await createSupabaseServerClient();
  const { data: row, error: readError } = await supabase
    .from("resumes")
    .select("theme")
    .eq("id", resumeId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (readError) return { error: readError.message };
  if (!row) return { error: "السيرة غير موجودة" };

  const current = (row.theme as { mode?: "light" | "dark"; primary_color?: string } | null) ?? {};
  const next = { ...current, mode };

  const { error } = await supabase
    .from("resumes")
    .update({ theme: next })
    .eq("id", resumeId)
    .eq("user_id", session.userId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/resume/${resumeId}`);
  revalidatePath(`/dashboard/resume/${resumeId}/design`);
  return { ok: true };
}
