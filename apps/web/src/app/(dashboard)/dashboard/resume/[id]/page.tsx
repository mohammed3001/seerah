import { DashboardShell } from "@/components/dashboard/shell";
import { ResumeEditor } from "@/components/editor/resume-editor";
import { getDashboardSession } from "@/lib/dashboard/get-session";
import { loadResume } from "@/lib/editor/load-resume";

export const metadata = { title: "تعديل السيرة" };

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ResumeEditorPage({ params }: Params) {
  const { id } = await params;
  const session = await getDashboardSession();
  const data = await loadResume(id, session.userId);

  return (
    <DashboardShell
      user={{
        fullName: session.profile.full_name,
        email: session.email,
        avatarUrl: session.profile.avatar_url,
        plan: session.profile.plan,
      }}
      title={data.resume.title}
      breadcrumb={[{ label: "سيرتي", href: "/dashboard" }, { label: data.resume.title }]}
      fullBleed
    >
      <ResumeEditor data={data} />
    </DashboardShell>
  );
}
