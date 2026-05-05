/**
 * Landing page for the global "التصاميم" sidebar link.  Templates and
 * exports both live per-resume (`/dashboard/resume/[id]/design` and
 * `/dashboard/resume/[id]/export`), so this page just lists the user's
 * resumes and routes the chosen one into the per-resume design picker.
 *
 * The dead-link bug it fixes: `nav-config.ts` advertised
 * `/dashboard/templates` as a top-level destination, but no page
 * existed at that route — clicking the sidebar item produced a 404.
 */

import { DashboardShell } from "@/components/dashboard/shell";
import { ResumePickerList } from "@/components/dashboard/resume-picker-list";
import { getDashboardSession } from "@/lib/dashboard/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "التصاميم" };

async function fetchResumes(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, title, template_id, completion_score, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function DashboardTemplatesPage() {
  const session = await getDashboardSession();
  const resumes = await fetchResumes(session.userId);

  return (
    <DashboardShell
      user={{
        fullName: session.profile.full_name,
        email: session.email,
        avatarUrl: session.profile.avatar_url,
        plan: session.profile.plan,
      }}
      title="التصاميم"
      breadcrumb={[{ label: "سيرتي", href: "/dashboard" }, { label: "التصاميم" }]}
    >
      <ResumePickerList
        resumes={resumes}
        hrefFor={(id) => `/dashboard/resume/${id}/design`}
        leadCopy="اختر سيرة لإدارة تصميمها وألوانها."
        emptyState={{
          title: "لا توجد سير ذاتية بعد.",
          body: "أنشئ سيرة ذاتية أوّلًا من صفحة سيرتي ثم اختر تصميمها من هنا.",
        }}
      />
    </DashboardShell>
  );
}
