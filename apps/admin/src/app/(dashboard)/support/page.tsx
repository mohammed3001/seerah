import { redirect } from "next/navigation";

import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { SupportExportButton } from "@/components/support/export-button";
import { SupportFilters } from "@/components/support/filters";
import { SupportInbox } from "@/components/support/inbox";
import { SupportPagination } from "@/components/support/pagination";
import { SupportSummaryCards } from "@/components/support/summary-cards";
import { getCurrentAdmin } from "@/lib/auth/current";
import { listAssignees, listTickets, loadStatusSummary } from "@/lib/support/list";
import { SORTABLE_COLUMNS, type SortableColumn } from "@/lib/support/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PER_PAGE_OPTIONS = [20, 50, 100] as const;
type PerPage = (typeof PER_PAGE_OPTIONS)[number];

function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function asPerPage(value: string | string[] | undefined): PerPage {
  const n = Number(asString(value));
  if ((PER_PAGE_OPTIONS as readonly number[]).includes(n)) return n as PerPage;
  return 20;
}

function asSort(value: string | string[] | undefined): SortableColumn {
  const v = asString(value);
  if ((SORTABLE_COLUMNS as readonly string[]).includes(v)) {
    return v as SortableColumn;
  }
  return "updated_at";
}

function asDir(value: string | string[] | undefined): "asc" | "desc" {
  return asString(value) === "asc" ? "asc" : "desc";
}

function buildSortHrefs(
  current: { sort: SortableColumn; dir: "asc" | "desc" },
  searchParams: Record<string, string | string[] | undefined>,
): Record<SortableColumn, string> {
  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string" && v.length > 0) base.set(k, v);
  }
  base.delete("page");

  const out = {} as Record<SortableColumn, string>;
  for (const key of SORTABLE_COLUMNS) {
    const next = new URLSearchParams(base.toString());
    next.set("sort", key);
    next.set("dir", current.sort === key ? (current.dir === "asc" ? "desc" : "asc") : "desc");
    out[key] = `/support?${next.toString()}`;
  }
  return out;
}

export default async function SupportPage({ searchParams }: PageProps) {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "support_agent") {
    redirect("/");
  }

  const sp = await searchParams;
  const sections = visibleSections(ctx.admin.role);
  const perPage = asPerPage(sp.perPage);
  const sort = asSort(sp.sort);
  const dir = asDir(sp.dir);
  const page = Number(asString(sp.page)) > 0 ? Number(asString(sp.page)) : 1;

  const [list, assignees, summary] = await Promise.all([
    listTickets({
      search: asString(sp.q),
      status: asString(sp.status),
      priority: asString(sp.priority),
      assignee: asString(sp.assignee),
      unassigned: asString(sp.unassigned),
      from: asString(sp.from),
      to: asString(sp.to),
      sort,
      dir,
      page,
      perPage,
    }),
    listAssignees(),
    loadStatusSummary(),
  ]);

  const sortHrefs = buildSortHrefs({ sort, dir }, sp);

  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title="مركز الدعم"
        subtitle="صندوق التذاكر، الردّ بنصّ عادي، الحالة/الأولوية، التعيين، إجراءات جماعية، ملاحظات داخلية."
      />

      <main className="flex-1 space-y-4 px-4 py-6 lg:px-8 lg:py-8">
        <SupportSummaryCards summary={summary} />

        <SupportFilters assignees={assignees} perPage={perPage} />

        <div className="flex items-center justify-end">
          <SupportExportButton />
        </div>

        <SupportInbox
          rows={list.rows}
          sort={sort}
          dir={dir}
          sortHrefs={sortHrefs}
          assignees={assignees}
        />

        <SupportPagination page={page} perPage={perPage} total={list.total} />
      </main>
    </>
  );
}
