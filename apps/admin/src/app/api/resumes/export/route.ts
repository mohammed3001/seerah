import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/audit";
import { getCurrentAdmin } from "@/lib/auth/current";
import { extractClientIp } from "@/lib/ip";
import { listResumes } from "@/lib/resumes/list";
import {
  type ResumeFeaturedFilter,
  type ResumeLanguage,
  type ResumeSortKey,
  SORT_KEYS,
} from "@/lib/resumes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXPORT_ROWS = 10_000;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function asLanguage(v: string | null): ResumeLanguage | undefined {
  if (v === "ar" || v === "en") return v;
  return undefined;
}

function asFeatured(v: string | null): ResumeFeaturedFilter | undefined {
  if (v === "featured" || v === "not_featured") return v;
  return undefined;
}

function asInt(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function asSort(v: string | null): ResumeSortKey {
  if (v && (SORT_KEYS as readonly string[]).includes(v)) return v as ResumeSortKey;
  return "created_at";
}

export async function GET(request: NextRequest) {
  const ctx = await getCurrentAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Resumes are visible to super_admin and template_manager (curation
  // surface).  Support agents stay scoped to users + tickets.
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "template_manager") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const PAGE_SIZE = 1000;
  const sharedFilters = {
    q: sp.get("q") ?? undefined,
    templateId: sp.get("templateId") ?? undefined,
    language: asLanguage(sp.get("language")),
    featured: asFeatured(sp.get("featured")),
    completionMin: asInt(sp.get("completionMin")),
    completionMax: asInt(sp.get("completionMax")),
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    sort: asSort(sp.get("sort")),
    dir: (sp.get("dir") === "asc" ? "asc" : "desc") as "asc" | "desc",
    perPage: PAGE_SIZE,
  };

  const firstPage = await listResumes({ ...sharedFilters, page: 1 });
  const allRows = [...firstPage.rows];
  const total = firstPage.total;
  let page = 2;
  while (allRows.length < Math.min(total, MAX_EXPORT_ROWS)) {
    const next = await listResumes({ ...sharedFilters, page });
    if (next.rows.length === 0) break;
    allRows.push(...next.rows);
    page++;
  }

  const trimmed = allRows.slice(0, MAX_EXPORT_ROWS);

  const header = [
    "id",
    "title",
    "slug",
    "user_id",
    "user_email",
    "user_full_name",
    "template_id",
    "template_name",
    "language",
    "completion_score",
    "views_count",
    "is_featured",
    "created_at",
    "updated_at",
  ];

  const lines: string[] = [];
  lines.push(header.map(csvCell).join(","));
  for (const row of trimmed) {
    lines.push(
      [
        row.id,
        row.title,
        row.slug,
        row.user_id,
        row.user_email,
        row.user_full_name,
        row.template_id,
        row.template_name_ar ?? row.template_name,
        row.language,
        row.completion_score,
        row.views_count,
        row.is_featured,
        row.created_at,
        row.updated_at,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const BOM = "\uFEFF";
  const csv = BOM + lines.join("\r\n");

  await logAdminAction({
    adminId: ctx.admin.id,
    adminEmail: ctx.admin.email,
    action: "admin.resumes.exported",
    metadata: {
      filters: Object.fromEntries(sp.entries()),
      rows: trimmed.length,
      truncated: total > MAX_EXPORT_ROWS,
    },
    ip: extractClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const filename = `seerah-resumes-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
