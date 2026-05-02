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
 */
export async function applyTemplate(
  resumeId: string,
  templateId: string,
): Promise<DesignActionResult> {
  const session = await getDashboardSession();
  const meta = TEMPLATE_BY_ID[templateId as TemplateId];
  if (!meta) return { error: "تصميم غير معروف" };
  if (meta.is_premium && session.profile.plan === "free") {
    return { error: "هذا التصميم متاح للمشتركين فقط" };
  }
  const supabase = await createSupabaseServerClient();
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
