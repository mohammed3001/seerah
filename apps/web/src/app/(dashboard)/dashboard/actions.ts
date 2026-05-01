"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `resume-${Date.now().toString(36)}`
  );
}

export async function createResumeAction(): Promise<{ id: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("max_resumes, full_name, plan")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "لم يتم العثور على الملف الشخصي" };

  const { count } = await supabase
    .from("resumes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= profile.max_resumes) {
    return { error: "وصلت للحد الأقصى للسير. قم بترقية اشتراكك." };
  }

  const baseTitle = "سيرتي الذاتية";
  const baseSlug = slugify(baseTitle);
  const finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: resume, error } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      title: baseTitle,
      slug: finalSlug,
    })
    .select("id")
    .single();

  if (error || !resume) return { error: error?.message ?? "تعذّر إنشاء السيرة" };

  // Best-effort initial sections (personal_info + address are 1:1).
  await supabase.from("personal_info").insert({
    resume_id: resume.id,
    full_name: profile.full_name,
  });
  await supabase.from("address").insert({ resume_id: resume.id });

  revalidatePath("/dashboard");
  return { id: resume.id };
}

export async function duplicateResumeAction(
  sourceId: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("max_resumes")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "الملف الشخصي مفقود" };

  const { count } = await supabase
    .from("resumes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= profile.max_resumes) {
    return { error: "وصلت للحد الأقصى للسير. قم بترقية اشتراكك." };
  }

  const { data: source } = await supabase.from("resumes").select("*").eq("id", sourceId).single();
  if (!source) return { error: "السيرة الأصلية غير موجودة" };

  const newSlug = `${source.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
  const { data: copy, error } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      title: `${source.title} (نسخة)`,
      slug: newSlug,
      template_id: source.template_id,
      language: source.language,
      theme: source.theme,
      section_order: source.section_order,
      section_labels: source.section_labels,
      hidden_fields: source.hidden_fields,
      show_education_first: source.show_education_first,
    })
    .select("id")
    .single();

  if (error || !copy) return { error: error?.message ?? "فشل النسخ" };

  revalidatePath("/dashboard");
  return { id: copy.id };
}

export async function deleteResumeAction(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const { error } = await supabase.from("resumes").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
