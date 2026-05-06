import { redirect } from "next/navigation";

import { ResumesExportButton } from "@/components/resumes/export-button";
import { ResumesFilters } from "@/components/resumes/filters";
import { ResumesPagination } from "@/components/resumes/pagination";
import { ResumesTable } from "@/components/resumes/table";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentAdmin } from "@/lib/auth/current";
import { listResumes } from "@/lib/resumes/list";
import {
  DEFAULT_PER_PAGE,
  PER_PAGE_OPTIONS,
  type ResumeFeaturedFilter,
  type ResumeLanguage,
  type ResumePerPage,
  type ResumeSortKey,
  SORT_KEYS,
} from "@/lib/resumes/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function asInt(value: string | string[] | undefined): number | undefined {
  const v = asString(value);
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function asPerPage(value: string | string[] | undefined): ResumePerPage {
  const n = Number(asString(value));
  if ((PER_PAGE_OPTIONS as readonly number[]).includes(n)) return n as ResumePerPage;
  return DEFAULT_PER_PAGE;
}

function asLanguage(value: string | string[] | undefined): ResumeLanguage | undefined {
  const v = asString(value);
  if (v === "ar" || v === "en") return v;
  return undefined;
}

function asFeatured(value: string | string[] | undefined): ResumeFeaturedFilter | undefined {
  const v = asString(value);
  if (v === "featured" || v === "not_featured") return v;
  return undefined;
}

function asSortKey(value: string | string[] | undefined): ResumeSortKey {
  const v = asString(value);
  if (v && (SORT_KEYS as readonly string[]).includes(v)) return v as ResumeSortKey;
  return "created_at";
}

function asDir(value: string | string[] | undefined): "asc" | "desc" {
  return asString(value) === "asc" ? "asc" : "desc";
}

/** Build pre-computed `?sort=…&dir=…` URLs for each sortable header. */
function buildSortHrefs(
  current: { sort: ResumeSortKey; dir: "asc" | "desc" },
  searchParams: Record<string, string | string[] | undefined>,
): Record<ResumeSortKey, string> {
  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string" && v.length > 0) base.set(k, v);
  }
  base.delete("page");

  const out = {} as Record<ResumeSortKey, string>;
  for (const key of SORT_KEYS) {
    const next = new URLSearchParams(base.toString());
    next.set("sort", key);
    if (current.sort === key) {
      next.set("dir", current.dir === "asc" ? "desc" : "asc");
    } else {
      next.set("dir", "desc");
    }
    out[key] = `/resumes?${next.toString()}`;
  }
  return out;
}

export default async function ResumesPage({ searchParams }: PageProps) {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  // Resumes are accessible to super_admin and template_manager.  Support
  // agents are scoped to users + tickets.
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "template_manager") {
    redirect("/");
  }

  const sp = await searchParams;
  const perPage = asPerPage(sp.perPage);
  const sort = asSortKey(sp.sort);
  const dir = asDir(sp.dir);

  const result = await listResumes({
    q: asString(sp.q),
    templateId: asString(sp.templateId),
    language: asLanguage(sp.language),
    featured: asFeatured(sp.featured),
    completionMin: asInt(sp.completionMin),
    completionMax: asInt(sp.completionMax),
    from: asString(sp.from),
    to: asString(sp.to),
    sort,
    dir,
    page: Number(asString(sp.page) ?? "1") || 1,
    perPage,
  });

  const sortHrefs = buildSortHrefs({ sort, dir }, sp);
  const sections = visibleSections(ctx.admin.role);

  // Resume preview links must point to the public app, not admin domain.
  const publicAppUrl = (process.env["NEXT_PUBLIC_APP_URL"] ?? "https://seerah.com").replace(
    /\/$/,
    "",
  );

  const canDelete = ctx.admin.role === "super_admin";
  // super_admin and template_manager can curate (change template + featured).
  const canCurate = ctx.admin.role === "super_admin" || ctx.admin.role === "template_manager";

  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title="السير الذاتية"
        subtitle="جدول كامل + بحث + فلاتر + إجراءات أدمن"
      />

      <main className="flex-1 space-y-4 px-4 py-6 lg:px-8 lg:py-8">
        <ResumesFilters templates={result.templates} perPage={result.perPage} />

        <div className="flex items-center justify-end">
          <ResumesExportButton />
        </div>

        <ResumesTable
          rows={result.rows}
          sort={sort}
          dir={dir}
          sortHrefs={sortHrefs}
          templates={result.templates}
          publicAppUrl={publicAppUrl}
          canDelete={canDelete}
          canCurate={canCurate}
        />

        <ResumesPagination page={result.page} perPage={result.perPage} total={result.total} />
      </main>
    </>
  );
}
