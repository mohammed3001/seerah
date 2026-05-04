import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/audit";
import { getCurrentAdmin } from "@/lib/auth/current";
import { extractClientIp } from "@/lib/ip";
import { listTickets } from "@/lib/support/list";
import { SORTABLE_COLUMNS, type SortableColumn } from "@/lib/support/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXPORT_ROWS = 10_000;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function asSort(v: string | null): SortableColumn {
  if (v && (SORTABLE_COLUMNS as readonly string[]).includes(v)) {
    return v as SortableColumn;
  }
  return "updated_at";
}

export async function GET(request: NextRequest) {
  const ctx = await getCurrentAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "support_agent") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const PAGE_SIZE = 1000;
  const filters = {
    search: sp.get("q") ?? "",
    status: sp.get("status") ?? "",
    priority: sp.get("priority") ?? "",
    assignee: sp.get("assignee") ?? "",
    unassigned: sp.get("unassigned") ?? "",
    from: sp.get("from") ?? "",
    to: sp.get("to") ?? "",
    sort: asSort(sp.get("sort")),
    dir: (sp.get("dir") === "asc" ? "asc" : "desc") as "asc" | "desc",
    perPage: PAGE_SIZE,
    page: 1,
  };

  const firstPage = await listTickets(filters);
  const allRows = [...firstPage.rows];
  const total = firstPage.total;
  let page = 2;
  while (allRows.length < Math.min(total, MAX_EXPORT_ROWS)) {
    const next = await listTickets({ ...filters, page });
    if (next.rows.length === 0) break;
    allRows.push(...next.rows);
    page++;
  }

  const trimmed = allRows.slice(0, MAX_EXPORT_ROWS);

  const header = [
    "id",
    "subject",
    "user_email",
    "user_full_name",
    "user_plan",
    "status",
    "priority",
    "assignee_email",
    "last_admin_reply_at",
    "created_at",
    "updated_at",
  ];

  const lines: string[] = [];
  lines.push(header.map(csvCell).join(","));
  for (const row of trimmed) {
    lines.push(
      [
        row.id,
        row.subject,
        row.user_email,
        row.user_full_name,
        row.user_plan,
        row.status,
        row.priority,
        row.assignee_email,
        row.last_admin_reply_at,
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
    action: "admin.support.exported",
    metadata: {
      filters: Object.fromEntries(sp.entries()),
      rows: trimmed.length,
      truncated: total > MAX_EXPORT_ROWS,
    },
    ip: extractClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const filename = `seerah-support-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
