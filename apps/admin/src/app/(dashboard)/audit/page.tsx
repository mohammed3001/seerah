import { redirect } from "next/navigation";

import { ExportButton } from "@/components/audit/export-button";
import { AuditFilters } from "@/components/audit/filters";
import { AuditPagination } from "@/components/audit/pagination";
import { AuditTable } from "@/components/audit/table";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentAdmin } from "@/lib/auth/current";
import type { AuditPerPage } from "@/lib/audit/list";
import { listAudit } from "@/lib/audit/list";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  // App-Router 15 — searchParams is async.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const DEFAULT_PER_PAGE: AuditPerPage = 50;

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function asPerPage(value: string | string[] | undefined): AuditPerPage {
  const n = Number(asString(value));
  if (n === 20 || n === 50 || n === 100) return n;
  return DEFAULT_PER_PAGE;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");

  // Audit log is sensitive; only super_admin can see it.  The middleware
  // covers public exposure, but a support_agent landing here via deep-link
  // should also be sent home rather than seeing everything.
  if (ctx.admin.role !== "super_admin") redirect("/");

  const sp = await searchParams;
  const perPage = asPerPage(sp.perPage);
  const result = await listAudit({
    q: asString(sp.q),
    action: asString(sp.action),
    adminEmail: asString(sp.adminEmail),
    from: asString(sp.from),
    to: asString(sp.to),
    page: Number(asString(sp.page) ?? "1") || 1,
    perPage,
  });

  const sections = visibleSections(ctx.admin.role);

  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title="سجل المراجعة"
        subtitle="كل إجراء قام به أي مشرف، قابل للبحث والتصدير"
      />

      <main className="flex-1 space-y-4 px-4 py-6 lg:px-8 lg:py-8">
        <AuditFilters knownActions={result.knownActions} perPage={result.perPage} />

        <div className="flex items-center justify-end">
          <ExportButton />
        </div>

        <AuditTable rows={result.rows} />

        <AuditPagination
          page={result.page}
          perPage={result.perPage}
          total={result.total}
        />
      </main>
    </>
  );
}
