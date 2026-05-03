import { format, formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import {
  PLAN_BADGE_CLASSES,
  PLAN_LABELS_AR,
  type UserListRow,
  type UserSortKey,
} from "@/lib/users/types";

interface UsersTableProps {
  rows: UserListRow[];
  sort: UserSortKey;
  dir: "asc" | "desc";
  /** Pre-built URLs for sortable column headers — page.tsx assembles them
   *  so we don't depend on next/navigation inside a server component. */
  sortHrefs: Record<UserSortKey, string>;
}

function SortHeader({
  label,
  active,
  dir,
  href,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  href: string;
}) {
  return (
    <th scope="col" className="px-4 py-3">
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1 hover:text-slate-900",
          active ? "text-slate-900" : "text-slate-500",
        )}
      >
        <span>{label}</span>
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </Link>
    </th>
  );
}

export function UsersTable({ rows, sort, dir, sortHrefs }: UsersTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-400">
        لا يوجد مستخدمون يطابقون الفلاتر الحالية.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-right text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">المستخدم</th>
              <SortHeader
                label="البريد"
                active={sort === "email"}
                dir={dir}
                href={sortHrefs.email}
              />
              <SortHeader
                label="الخطة"
                active={sort === "plan"}
                dir={dir}
                href={sortHrefs.plan}
              />
              <th scope="col" className="px-4 py-3">السير</th>
              <SortHeader
                label="تاريخ التسجيل"
                active={sort === "created_at"}
                dir={dir}
                href={sortHrefs.created_at}
              />
              <SortHeader
                label="آخر نشاط"
                active={sort === "last_seen_at"}
                dir={dir}
                href={sortHrefs.last_seen_at}
              />
              <th scope="col" className="px-4 py-3">الحالة</th>
              <th scope="col" className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                      {user.avatar_url ? (
                        // Avatar URLs come from Supabase auth metadata; the
                        // backend doesn't curate them, so we fall back to the
                        // initials block on any 404 / 5xx via onError below.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (user.full_name ?? user.email).slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {user.full_name ?? "—"}
                      </p>
                      {user.billing_country ? (
                        <p className="text-[11px] text-slate-400" dir="ltr">
                          {user.billing_country}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-xs text-slate-700" dir="ltr">
                  {user.email}
                </td>
                <td className="px-4 py-3 align-middle">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      PLAN_BADGE_CLASSES[user.plan],
                    )}
                  >
                    {PLAN_LABELS_AR[user.plan]}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle text-sm text-slate-700">
                  {user.resume_count.toLocaleString("ar-SA")}
                </td>
                <td className="px-4 py-3 align-middle text-[11px] text-slate-500" dir="ltr">
                  {format(new Date(user.created_at), "yyyy-MM-dd")}
                </td>
                <td className="px-4 py-3 align-middle text-xs text-slate-500">
                  {user.last_seen_at
                    ? formatDistanceToNow(new Date(user.last_seen_at), {
                        addSuffix: true,
                        locale: arSA,
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 align-middle">
                  {user.is_disabled ? (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                      معطّل
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      مفعّل
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-middle text-left">
                  <Link
                    href={`/users/${user.id}`}
                    className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    عرض
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
