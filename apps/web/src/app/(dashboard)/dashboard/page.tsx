import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard/shell";
import { ResumeList } from "@/components/dashboard/resume-list";
import { ResumeListSkeleton } from "@/components/dashboard/resume-list-skeleton";
import { getDashboardSession } from "@/lib/dashboard/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "سيرتي" };

async function fetchResumes(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, title, slug, template_id, completion_score, updated_at, language")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function DashboardHome() {
  const session = await getDashboardSession();
  return (
    <DashboardShell
      user={{
        fullName: session.profile.full_name,
        email: session.email,
        avatarUrl: session.profile.avatar_url,
        plan: session.profile.plan,
      }}
      title="سيرتي"
    >
      <Suspense fallback={<ResumeListSkeleton />}>
        <ResumesAsync userId={session.userId} maxResumes={session.profile.max_resumes} plan={session.profile.plan} />
      </Suspense>
    </DashboardShell>
  );
}

async function ResumesAsync({
  userId,
  maxResumes,
  plan,
}: {
  userId: string;
  maxResumes: number;
  plan: "free" | "prime" | "enterprise";
}) {
  const resumes = await fetchResumes(userId);
  return <ResumeList resumes={resumes} maxResumes={maxResumes} plan={plan} />;
}
