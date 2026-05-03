import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/audit";
import { getCurrentAdmin } from "@/lib/auth/current";
import { extractClientIp } from "@/lib/ip";
import { listAudit } from "@/lib/audit/list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXPORT_ROWS = 10_000;

/**
 * Properly quote a CSV cell.  We always quote, which is safe and avoids
 * having to detect commas/newlines/quotes ourselves.  Internal `"` chars
 * are doubled per RFC 4180.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const ctx = await getCurrentAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (ctx.admin.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  // Walk pages of 1000 so we don't blow past Supabase's per-query row
  // ceiling.  We always start from page 1 to keep the order identical to
  // what the admin sees in the UI under the same filters.
  const PAGE_SIZE = 1000;
  const sharedFilters = {
    q: sp.get("q") ?? undefined,
    action: sp.get("action") ?? undefined,
    adminEmail: sp.get("adminEmail") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    perPage: PAGE_SIZE,
  };
  const firstPage = await listAudit({ ...sharedFilters, page: 1 });
  const allRows = [...firstPage.rows];
  const total = firstPage.total;
  let page = 2;
  while (allRows.length < Math.min(total, MAX_EXPORT_ROWS)) {
    const next = await listAudit({ ...sharedFilters, page });
    if (next.rows.length === 0) break;
    allRows.push(...next.rows);
    page++;
  }

  const trimmed = allRows.slice(0, MAX_EXPORT_ROWS);

  const header = [
    "id",
    "admin_id",
    "admin_email",
    "action",
    "target_type",
    "target_id",
    "ip",
    "user_agent",
    "metadata",
    "created_at",
  ];

  const lines: string[] = [];
  lines.push(header.map(csvCell).join(","));
  for (const row of trimmed) {
    lines.push(
      [
        row.id,
        row.admin_id,
        row.admin_email,
        row.action,
        row.target_type,
        row.target_id,
        row.ip,
        row.user_agent,
        row.metadata,
        row.created_at,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  // Excel won't render UTF-8 unless we prepend a BOM.  Without it, Arabic
  // emails and JSON strings come out as mojibake.
  const BOM = "\uFEFF";
  const csv = BOM + lines.join("\r\n");

  // Audit the export itself — exporting the audit log is a high-signal
  // event we want a record of.
  await logAdminAction({
    adminId: ctx.admin.id,
    adminEmail: ctx.admin.email,
    action: "admin.audit_log.exported",
    metadata: {
      filters: Object.fromEntries(sp.entries()),
      rows: trimmed.length,
      truncated: total > MAX_EXPORT_ROWS,
    },
    ip: extractClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const filename = `seerah-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
