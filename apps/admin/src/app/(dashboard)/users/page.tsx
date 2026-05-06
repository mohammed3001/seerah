import { redirect } from "next/navigation";

import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { UsersExportButton } from "@/components/users/export-button";
import { UsersFilters } from "@/components/users/filters";
import { UsersPagination } from "@/components/users/pagination";
import { UsersTable } from "@/components/users/table";
import { getCurrentAdmin } from "@/lib/auth/current";
import { listUsers } from "@/lib/users/list";
import {
  DEFAULT_PER_PAGE,
  PER_PAGE_OPTIONS,
  type Plan,
  type UserPerPage,
  type UserSortKey,
  type UserStatus,
} from "@/lib/users/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function asPerPage(value: string | string[] | undefined): UserPerPage {
  const n = Number(asString(value));
  if ((PER_PAGE_OPTIONS as readonly number[]).includes(n)) return n as UserPerPage;
  return DEFAULT_PER_PAGE;
}

function asPlan(value: string | string[] | undefined): Plan | undefined {
  const v = asString(value);
  if (v === "free" || v === "prime" || v === "enterprise") return v;
  return undefined;
}

function asStatus(value: string | string[] | undefined): UserStatus | undefined {
  const v = asString(value);
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

function asSortKey(value: string | string[] | undefined): UserSortKey {
  const v = asString(value);
  if (v && SORT_KEYS.includes(v as UserSortKey)) return v as UserSortKey;
  return "created_at";
}

function asDir(value: string | string[] | undefined): "asc" | "desc" {
  return asString(value) === "asc" ? "asc" : "desc";
}

/**
 * Build pre-computed `?sort=…&dir=…` URLs for each sortable column header.
 * Clicking the header that's already active flips the direction; clicking
 * a different header switches to it (defaulting to desc).
 */
function buildSortHrefs(
  current: { sort: UserSortKey; dir: "asc" | "desc" },
  searchParams: Record<string, string | string[] | undefined>,
): Record<UserSortKey, string> {
  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string" && v.length > 0) base.set(k, v);
  }
  base.delete("page"); // any sort change resets to page 1

  const out = {} as Record<UserSortKey, string>;
  for (const key of SORT_KEYS) {
    const next = new URLSearchParams(base.toString());
    next.set("sort", key);
    if (current.sort === key) {
      next.set("dir", current.dir === "asc" ? "desc" : "asc");
    } else {
      next.set("dir", "desc");
    }
    out[key] = `/users?${next.toString()}`;
  }
  return out;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "support_agent") {
    redirect("/");
  }

  const sp = await searchParams;
  const perPage = asPerPage(sp.perPage);
  const sort = asSortKey(sp.sort);
  const dir = asDir(sp.dir);

  const result = await listUsers({
    q: asString(sp.q),
    plan: asPlan(sp.plan),
    country: asString(sp.country),
    status: asStatus(sp.status),
    from: asString(sp.from),
    to: asString(sp.to),
    sort,
    dir,
    page: Number(asString(sp.page) ?? "1") || 1,
    perPage,
  });

  const sortHrefs = buildSortHrefs({ sort, dir }, sp);
  const sections = visibleSections(ctx.admin.role);

  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title="إدارة المستخدمين"
        subtitle="جدول كامل + بحث + فلاتر + إجراءات أدمن"
      />

      <main className="flex-1 space-y-4 px-4 py-6 lg:px-8 lg:py-8">
        <UsersFilters countries={result.countries} perPage={result.perPage} />

        <div className="flex items-center justify-end">
          <UsersExportButton />
        </div>

        <UsersTable rows={result.rows} sort={sort} dir={dir} sortHrefs={sortHrefs} />

        <UsersPagination page={result.page} perPage={result.perPage} total={result.total} />
      </main>
    </>
  );
}
