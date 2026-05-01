"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type SectionTable =
  | "personal_info"
  | "education"
  | "experience"
  | "courses"
  | "skills"
  | "projects"
  | "references"
  | "social_links"
  | "languages"
  | "hobbies"
  | "address";

async function ensureResumeOwner(resumeId: string): Promise<{ userId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };
  const { data } = await supabase
    .from("resumes")
    .select("id")
    .eq("id", resumeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { error: "السيرة غير موجودة" };
  return { userId: user.id };
}

export async function updateResumeMeta(
  resumeId: string,
  patch: { title?: string; language?: "ar" | "en"; template_id?: string },
): Promise<{ ok: true } | { error: string }> {
  const ownerCheck = await ensureResumeOwner(resumeId);
  if ("error" in ownerCheck) return ownerCheck;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("resumes").update(patch).eq("id", resumeId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/resume/${resumeId}`);
  return { ok: true };
}

export async function upsertSingletonAction<T extends Record<string, unknown>>(
  resumeId: string,
  table: "personal_info" | "address",
  patch: T,
): Promise<{ ok: true } | { error: string }> {
  const ownerCheck = await ensureResumeOwner(resumeId);
  if ("error" in ownerCheck) return ownerCheck;
  const supabase = await createSupabaseServerClient();
  // Upsert against the unique resume_id; rely on the index from migrations.
  const { error } = await (supabase.from(table) as unknown as {
    upsert: (
      v: Record<string, unknown>,
      o: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  }).upsert({ resume_id: resumeId, ...patch }, { onConflict: "resume_id" });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/resume/${resumeId}`);
  return { ok: true };
}

export async function insertSectionItem<T extends Record<string, unknown>>(
  resumeId: string,
  table: Exclude<SectionTable, "personal_info" | "address">,
  values: T,
): Promise<{ id: string } | { error: string }> {
  const ownerCheck = await ensureResumeOwner(resumeId);
  if ("error" in ownerCheck) return ownerCheck;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await (supabase.from(table) as unknown as {
    insert: (v: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
  })
    .insert({ resume_id: resumeId, ...values })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "تعذّر الإضافة" };
  revalidatePath(`/dashboard/resume/${resumeId}`);
  return { id: data.id };
}

export async function updateSectionItem<T extends Record<string, unknown>>(
  resumeId: string,
  table: Exclude<SectionTable, "personal_info" | "address">,
  id: string,
  patch: T,
): Promise<{ ok: true } | { error: string }> {
  const ownerCheck = await ensureResumeOwner(resumeId);
  if ("error" in ownerCheck) return ownerCheck;
  const supabase = await createSupabaseServerClient();
  const { error } = await (supabase.from(table) as unknown as {
    update: (p: Record<string, unknown>) => {
      eq: (col: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  }).update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/resume/${resumeId}`);
  return { ok: true };
}

export async function deleteSectionItem(
  resumeId: string,
  table: Exclude<SectionTable, "personal_info" | "address">,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const ownerCheck = await ensureResumeOwner(resumeId);
  if ("error" in ownerCheck) return ownerCheck;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/resume/${resumeId}`);
  return { ok: true };
}

export async function reorderSectionItems(
  resumeId: string,
  table: Exclude<SectionTable, "personal_info" | "address">,
  orderedIds: string[],
): Promise<{ ok: true } | { error: string }> {
  const ownerCheck = await ensureResumeOwner(resumeId);
  if ("error" in ownerCheck) return ownerCheck;
  const supabase = await createSupabaseServerClient();
  // Update each row's sort_order. Doing individual updates avoids RLS edge cases
  // with bulk upserts.
  type UpdateResult = { error: { message: string } | null };
  const results = await Promise.all(
    orderedIds.map(
      (id, idx) =>
        (
          supabase.from(table) as unknown as {
            update: (p: Record<string, unknown>) => {
              eq: (c: string, v: string) => {
                eq: (c: string, v: string) => Promise<UpdateResult>;
              };
            };
          }
        )
          .update({ sort_order: idx })
          .eq("id", id)
          .eq("resume_id", resumeId) as Promise<UpdateResult>,
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };
  revalidatePath(`/dashboard/resume/${resumeId}`);
  return { ok: true };
}

export async function recomputeCompletionScore(resumeId: string): Promise<number | null> {
  const ownerCheck = await ensureResumeOwner(resumeId);
  if ("error" in ownerCheck) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("calculate_completion_score", {
    p_resume_id: resumeId,
  });
  if (error || data == null) return null;
  await supabase.from("resumes").update({ completion_score: data }).eq("id", resumeId);
  return data;
}
