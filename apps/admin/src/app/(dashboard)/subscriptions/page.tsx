import { redirect } from "next/navigation";

import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { SubscriptionsExportButton } from "@/components/subscriptions/export-button";
import { SubscriptionsFilters } from "@/components/subscriptions/filters";
import { GrantPrimeModal } from "@/components/subscriptions/grant-prime-modal";
import { SubscriptionsPagination } from "@/components/subscriptions/pagination";
import { RevenueSummaryCards } from "@/components/subscriptions/revenue-summary";
import { SubscriptionsTable } from "@/components/subscriptions/table";
import { getCurrentAdmin } from "@/lib/auth/current";
import {
  listDistinctStatuses,
  listSubscriptions,
  loadStatusSummary,
} from "@/lib/subscriptions/list";
import { loadRevenueSummary } from "@/lib/subscriptions/revenue";
import { SORTABLE_COLUMNS, type SortableColumn } from "@/lib/subscriptions/types";

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
  if ((SORTABLE_COLUMNS as readonly string[]).includes(v)) return v as SortableColumn;
  return "created_at";
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
    out[key] = `/subscriptions?${next.toString()}`;
  }
  return out;
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin") redirect("/");

  const sp = await searchParams;
  const sections = visibleSections(ctx.admin.role);
  const perPage = asPerPage(sp.perPage);
  const sort = asSort(sp.sort);
  const dir = asDir(sp.dir);
  const page = Number(asString(sp.page)) > 0 ? Number(asString(sp.page)) : 1;

  const [list, statuses, statusSummary, revenue] = await Promise.all([
    listSubscriptions({
      search: asString(sp.q),
      status: asString(sp.status),
      provider: asString(sp.provider),
      from: asString(sp.from),
      to: asString(sp.to),
      sort,
      dir,
      page,
      perPage,
    }),
    listDistinctStatuses(),
    loadStatusSummary(),
    loadRevenueSummary(),
  ]);

  const sortHrefs = buildSortHrefs({ sort, dir }, sp);

  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title="الاشتراكات"
        subtitle="إيرادات Stripe + إدارة الاشتراكات النشطة"
      />

      <main className="flex-1 space-y-4 px-4 py-6 lg:px-8 lg:py-8">
        <RevenueSummaryCards revenue={revenue} statusSummary={statusSummary} />

        <SubscriptionsFilters statuses={statuses} perPage={perPage} />

        <div className="flex items-center justify-between">
          <GrantPrimeModal />
          <SubscriptionsExportButton />
        </div>

        <SubscriptionsTable rows={list.rows} sort={sort} dir={dir} sortHrefs={sortHrefs} />

        <SubscriptionsPagination page={page} perPage={perPage} total={list.total} />
      </main>
    </>
  );
}
