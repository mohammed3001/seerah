import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { AdminNotesForm } from "@/components/support/admin-notes-form";
import { AssigneeControl } from "@/components/support/assignee-control";
import { PriorityBadge, StatusBadge } from "@/components/support/badges";
import { MessageThread } from "@/components/support/message-thread";
import { PriorityControl } from "@/components/support/priority-control";
import { ReplyForm } from "@/components/support/reply-form";
import { StatusControl } from "@/components/support/status-control";
import { UserSidebar } from "@/components/support/user-sidebar";
import { getCurrentAdmin } from "@/lib/auth/current";
import { loadTicketDetail } from "@/lib/support/detail";
import { listAssignees } from "@/lib/support/list";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SupportTicketDetailPage({ params }: PageProps) {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "support_agent") {
    redirect("/");
  }

  const { id } = await params;
  const sections = visibleSections(ctx.admin.role);

  const [detail, assignees] = await Promise.all([
    loadTicketDetail(id),
    listAssignees(),
  ]);

  if (!detail) notFound();

  const { ticket, user_profile, messages } = detail;

  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title={ticket.subject}
        subtitle={`تذكرة #${ticket.id.slice(0, 8)} — ${user_profile.email || "(مستخدم محذوف)"}`}
      />

      <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/support"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            العودة لصندوق التذاكر
          </Link>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <MessageThread
              initialMessage={{
                body: ticket.message,
                attachment_url: ticket.attachment_url,
                created_at: ticket.created_at,
                user_label: user_profile.email || "(مستخدم محذوف)",
              }}
              messages={messages}
            />

            <ReplyForm ticketId={ticket.id} />
          </div>

          <div className="space-y-4">
            <UserSidebar profile={user_profile} />

            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                إجراءات التذكرة
              </h2>
              <StatusControl ticketId={ticket.id} current={ticket.status} />
              <PriorityControl
                ticketId={ticket.id}
                current={ticket.priority}
              />
              <AssigneeControl
                ticketId={ticket.id}
                current={ticket.assigned_to}
                assignees={assignees}
              />
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                ملاحظات داخلية
              </h2>
              <AdminNotesForm
                ticketId={ticket.id}
                initial={ticket.admin_notes ?? ""}
              />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
