import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/audit";
import { getCurrentAdmin } from "@/lib/auth/current";
import { extractClientIp } from "@/lib/ip";
import { listSubscriptions } from "@/lib/subscriptions/list";
import { SORTABLE_COLUMNS, type SortableColumn } from "@/lib/subscriptions/types";

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
  return "created_at";
}

export async function GET(request: NextRequest) {
  const ctx = await getCurrentAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (ctx.admin.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const PAGE_SIZE = 1000;
  const filters = {
    search: sp.get("q") ?? "",
    status: sp.get("status") ?? "",
    provider: sp.get("provider") ?? "",
    from: sp.get("from") ?? "",
    to: sp.get("to") ?? "",
    sort: asSort(sp.get("sort")),
    dir: (sp.get("dir") === "asc" ? "asc" : "desc") as "asc" | "desc",
    perPage: PAGE_SIZE,
    page: 1,
  };

  const firstPage = await listSubscriptions(filters);
  const allRows = [...firstPage.rows];
  const total = firstPage.total;
  let page = 2;
  while (allRows.length < Math.min(total, MAX_EXPORT_ROWS)) {
    const next = await listSubscriptions({ ...filters, page });
    if (next.rows.length === 0) break;
    allRows.push(...next.rows);
    page++;
  }

  const trimmed = allRows.slice(0, MAX_EXPORT_ROWS);

  const header = [
    "id",
    "user_email",
    "user_full_name",
    "user_plan",
    "status",
    "provider",
    "stripe_subscription_id",
    "stripe_customer_id",
    "stripe_price_id",
    "currency",
    "current_period_start",
    "current_period_end",
    "trial_end",
    "canceled_at",
    "cancel_at_period_end",
    "created_at",
    "updated_at",
  ];

  const lines: string[] = [];
  lines.push(header.map(csvCell).join(","));
  for (const row of trimmed) {
    lines.push(
      [
        row.id,
        row.user_email,
        row.user_full_name,
        row.user_plan,
        row.status,
        row.provider,
        row.stripe_subscription_id,
        row.stripe_customer_id,
        row.stripe_price_id,
        row.currency,
        row.current_period_start,
        row.current_period_end,
        row.trial_end,
        row.canceled_at,
        row.cancel_at_period_end,
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
    action: "admin.subscriptions.exported",
    metadata: {
      filters: Object.fromEntries(sp.entries()),
      rows: trimmed.length,
      truncated: total > MAX_EXPORT_ROWS,
    },
    ip: extractClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const filename = `seerah-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
