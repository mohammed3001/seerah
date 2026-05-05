"use server";

import { revalidatePath } from "next/cache";

import { pickAllowed, pickAllowedResumeMeta } from "@seerah/api/security";

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
  // Audit F1: drop forbidden keys (id, user_id, created_at, ...) before
  // forwarding to Supabase.  Without this, a "use server" caller could
  // post `{ user_id: "victim-id" }` and re-parent the resume.
  const safePatch = pickAllowedResumeMeta(patch as Record<string, unknown>);
  if (Object.keys(safePatch).length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  // The cast is necessary because `pickAllowedResumeMeta` returns
  // `unknown`-valued entries (it has no schema knowledge); after the
  // allowlist filter, every key is guaranteed to be a real column.
  const { error } = await (supabase.from("resumes") as unknown as {
    update: (p: Record<string, unknown>) => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .update(safePatch)
    .eq("id", resumeId)
    .eq("user_id", ownerCheck.userId);
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
  // Audit F1: filter the patch through the per-table allowlist BEFORE
  // re-attaching the trusted `resume_id`.  This guarantees the client
  // can never override resume_id, id, or any system-managed column.
  const safePatch = pickAllowed(table, patch);
  const supabase = await createSupabaseServerClient();
  // Upsert against the unique resume_id; rely on the index from migrations.
  const { error } = await (supabase.from(table) as unknown as {
    upsert: (
      v: Record<string, unknown>,
      o: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  }).upsert({ resume_id: resumeId, ...safePatch }, { onConflict: "resume_id" });
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
  // Audit F1: clients must not be able to seed system fields (id,
  // resume_id, created_at) at insert time.  Strip everything but the
  // allowlisted content columns, then re-attach the trusted resume_id.
  const safeValues = pickAllowed(table, values);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await (supabase.from(table) as unknown as {
    insert: (v: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
  })
    .insert({ resume_id: resumeId, ...safeValues })
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
  // Audit F1 (mass-assignment): drop client-controlled system fields
  // before forwarding the patch.
  const safePatch = pickAllowed(table, patch);
  if (Object.keys(safePatch).length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  // Audit F1 (IDOR, defence in depth): filtering on `id` alone trusts
  // RLS to reject cross-resume writes.  Adding `resume_id = resumeId`
  // makes the safety property obvious without depending on the
  // section-table policies, which mirrors the existing pattern in
  // `reorderSectionItems` below.
  const { error } = await (supabase.from(table) as unknown as {
    update: (p: Record<string, unknown>) => {
      eq: (col: string, v: string) => {
        eq: (col: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .update(safePatch)
    .eq("id", id)
    .eq("resume_id", resumeId);
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
  // Audit F1 (IDOR, defence in depth): scope DELETE by both id AND
  // resume_id so a caller can never delete a section that belongs to
  // a different resume — even one they don't own — by passing their
  // own resumeId for the ownership check and someone else's section id.
  const { error } = await (supabase.from(table) as unknown as {
    delete: () => {
      eq: (col: string, v: string) => {
        eq: (col: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .delete()
    .eq("id", id)
    .eq("resume_id", resumeId);
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
  await supabase
    .from("resumes")
    .update({ completion_score: data })
    .eq("id", resumeId)
    .eq("user_id", ownerCheck.userId);
  return data;
}
