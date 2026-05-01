import "server-only";

import { notFound } from "next/navigation";

import type { Tables } from "@seerah/types";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoadedResume {
  resume: Tables<"resumes">;
  personal: Tables<"personal_info"> | null;
  education: Tables<"education">[];
  experience: Tables<"experience">[];
  courses: Tables<"courses">[];
  skills: Tables<"skills">[];
  projects: Tables<"projects">[];
  references: Tables<"references">[];
  languages: Tables<"languages">[];
  links: Tables<"social_links">[];
  hobbies: Tables<"hobbies">[];
  address: Tables<"address"> | null;
}

export async function loadResume(resumeId: string, userId: string): Promise<LoadedResume> {
  const supabase = await createSupabaseServerClient();
  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", resumeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!resume) notFound();

  const [
    { data: personal },
    { data: education },
    { data: experience },
    { data: courses },
    { data: skills },
    { data: projects },
    { data: references },
    { data: languages },
    { data: links },
    { data: hobbies },
    { data: address },
  ] = await Promise.all([
    supabase.from("personal_info").select("*").eq("resume_id", resumeId).maybeSingle(),
    supabase
      .from("education")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("experience")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("courses")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("skills")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("projects")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("references")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("languages")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("social_links")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("hobbies")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true }),
    supabase.from("address").select("*").eq("resume_id", resumeId).maybeSingle(),
  ]);

  return {
    resume,
    personal,
    education: education ?? [],
    experience: experience ?? [],
    courses: courses ?? [],
    skills: skills ?? [],
    projects: projects ?? [],
    references: references ?? [],
    languages: languages ?? [],
    links: links ?? [],
    hobbies: hobbies ?? [],
    address,
  };
}
