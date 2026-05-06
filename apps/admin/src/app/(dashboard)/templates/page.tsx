import { redirect } from "next/navigation";

import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { CreateTemplateModal } from "@/components/templates/create-template-modal";
import { TemplatesGrid } from "@/components/templates/grid";
import { getCurrentAdmin } from "@/lib/auth/current";
import { listTemplates } from "@/lib/templates/list";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TemplatesPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "template_manager") {
    redirect("/");
  }

  const sections = visibleSections(ctx.admin.role);
  const { rows } = await listTemplates();
  const canDelete = ctx.admin.role === "super_admin";
  const totalActive = rows.filter((r) => r.is_active).length;
  const totalPremium = rows.filter((r) => r.is_premium).length;

  return (
    <>
      <Topbar sections={sections} adminEmail={ctx.admin.email} title="القوالب" />
      <main className="mx-auto w-full max-w-6xl space-y-5 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">إدارة القوالب</h1>
            <p className="text-xs text-slate-500">
              {rows.length} قالب — {totalActive} مفعّل — {totalPremium} مدفوع
            </p>
          </div>
          <CreateTemplateModal />
        </header>

        <TemplatesGrid templates={rows} canDelete={canDelete} />
      </main>
    </>
  );
}
