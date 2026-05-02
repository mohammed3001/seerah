import { DashboardShell } from "@/components/dashboard/shell";
import { ResumeTabs } from "@/components/dashboard/resume-tabs";
import { getDashboardSession } from "@/lib/dashboard/get-session";
import { loadResume } from "@/lib/editor/load-resume";
import { fetchQuota } from "@/lib/pdf/server";

import { ExportClient } from "./export-client";

export const metadata = { title: "تحميل ومشاركة" };

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ResumeExportPage({ params }: Params) {
  const { id } = await params;
  const session = await getDashboardSession();
  const data = await loadResume(id, session.userId);

  // Best-effort: if the export service is unreachable we still want to render
  // the page (the buttons will surface their own errors when clicked).
  const quota = await fetchQuota(session.userId, session.profile.plan);

  const appUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://seerah.example.com";
  const shareUrl = `${appUrl.replace(/\/$/, "")}/r/${data.resume.slug}`;

  return (
    <DashboardShell
      user={{
        fullName: session.profile.full_name,
        email: session.email,
        avatarUrl: session.profile.avatar_url,
        plan: session.profile.plan,
      }}
      title="تحميل ومشاركة"
      breadcrumb={[
        { label: "سيرتي", href: "/dashboard" },
        { label: data.resume.title, href: `/dashboard/resume/${id}` },
        { label: "تحميل ومشاركة" },
      ]}
    >
      <ResumeTabs resumeId={id} />
      <ExportClient
        resumeId={id}
        resumeTitle={data.resume.title}
        completionScore={data.resume.completion_score}
        shareUrl={shareUrl}
        plan={session.profile.plan}
        initialQuota={
          quota
            ? {
                limit: quota.rate_limit.limit,
                remaining: quota.rate_limit.remaining,
                reset_at: quota.rate_limit.reset_at,
                unlimited: quota.unlimited,
              }
            : null
        }
      />
    </DashboardShell>
  );
}
