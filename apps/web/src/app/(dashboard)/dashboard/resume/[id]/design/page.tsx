import { DashboardShell } from "@/components/dashboard/shell";
import { ResumeTabs } from "@/components/dashboard/resume-tabs";
import { getDashboardSession } from "@/lib/dashboard/get-session";
import { loadResume } from "@/lib/editor/load-resume";

import { TemplateGalleryClient } from "./template-gallery-client";

export const metadata = { title: "التصاميم" };

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ResumeDesignPage({ params }: Params) {
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
      title="التصاميم"
      breadcrumb={[
        { label: "سيرتي", href: "/dashboard" },
        { label: data.resume.title, href: `/dashboard/resume/${id}` },
        { label: "التصاميم" },
      ]}
    >
      <ResumeTabs resumeId={id} />
      <TemplateGalleryClient data={data} plan={session.profile.plan} />
    </DashboardShell>
  );
}
