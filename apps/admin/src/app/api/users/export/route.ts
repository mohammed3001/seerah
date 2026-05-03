import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/audit";
import { getCurrentAdmin } from "@/lib/auth/current";
import { extractClientIp } from "@/lib/ip";
import { listUsers } from "@/lib/users/list";
import {
  type Plan,
  type UserSortKey,
  type UserStatus,
} from "@/lib/users/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXPORT_ROWS = 10_000;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function asPlan(v: string | null): Plan | undefined {
  if (v === "free" || v === "prime" || v === "enterprise") return v;
  return undefined;
}

function asStatus(v: string | null): UserStatus | undefined {
  if (v === "active" || v === "disabled") return v;
  return undefined;
}

const SORT_KEYS: readonly UserSortKey[] = [
  "created_at",
  "last_seen_at",
  "email",
  "full_name",
  "plan",
];

function asSort(v: string | null): UserSortKey {
  if (v && SORT_KEYS.includes(v as UserSortKey)) return v as UserSortKey;
  return "created_at";
}

export async function GET(request: NextRequest) {
  const ctx = await getCurrentAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "support_agent") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const PAGE_SIZE = 1000;
  const sharedFilters = {
    q: sp.get("q") ?? undefined,
    plan: asPlan(sp.get("plan")),
    country: sp.get("country") ?? undefined,
    status: asStatus(sp.get("status")),
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    sort: asSort(sp.get("sort")),
    dir: (sp.get("dir") === "asc" ? "asc" : "desc") as "asc" | "desc",
    perPage: PAGE_SIZE,
  };

  const firstPage = await listUsers({ ...sharedFilters, page: 1 });
  const allRows = [...firstPage.rows];
  const total = firstPage.total;
  let page = 2;
  while (allRows.length < Math.min(total, MAX_EXPORT_ROWS)) {
    const next = await listUsers({ ...sharedFilters, page });
    if (next.rows.length === 0) break;
    allRows.push(...next.rows);
    page++;
  }

  const trimmed = allRows.slice(0, MAX_EXPORT_ROWS);

  const header = [
    "id",
    "email",
    "full_name",
    "plan",
    "plan_expires_at",
    "is_disabled",
    "billing_country",
    "resume_count",
    "created_at",
    "last_seen_at",
  ];

  const lines: string[] = [];
  lines.push(header.map(csvCell).join(","));
  for (const row of trimmed) {
    lines.push(
      [
        row.id,
        row.email,
        row.full_name,
        row.plan,
        row.plan_expires_at,
        row.is_disabled,
        row.billing_country,
        row.resume_count,
        row.created_at,
        row.last_seen_at,
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
    action: "admin.users.exported",
    metadata: {
      filters: Object.fromEntries(sp.entries()),
      rows: trimmed.length,
      truncated: total > MAX_EXPORT_ROWS,
    },
    ip: extractClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const filename = `seerah-users-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
