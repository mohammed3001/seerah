"use client";

import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Paperclip } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  type AssigneeOption,
  type SortableColumn,
  type SupportTicketRow,
} from "@/lib/support/types";
import { cn } from "@/lib/utils/cn";

import { PriorityBadge, StatusBadge } from "./badges";
import { BulkActionsBar } from "./bulk-actions-bar";

interface InboxProps {
  rows: SupportTicketRow[];
  sort: SortableColumn;
  dir: "asc" | "desc";
  sortHrefs: Record<SortableColumn, string>;
  assignees: AssigneeOption[];
}

function safeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "yyyy-MM-dd HH:mm");
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

export function SupportInbox({
  rows,
  sort,
  dir,
  sortHrefs,
  assignees,
}: InboxProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selected.has(r.id)),
    [rows, selected],
  );

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-400">
        لا توجد تذاكر تطابق الفلاتر الحالية.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BulkActionsBar
        selectedIds={Array.from(selected)}
        assignees={assignees}
        onClear={() => setSelected(new Set())}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-right text-sm">
            <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="تحديد الكل"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                </th>
                <th scope="col" className="px-4 py-3">الموضوع</th>
                <th scope="col" className="px-4 py-3">المستخدم</th>
                <SortHeader
                  label="الحالة"
                  active={sort === "status"}
                  dir={dir}
                  href={sortHrefs.status}
                />
                <SortHeader
                  label="الأولوية"
                  active={sort === "priority"}
                  dir={dir}
                  href={sortHrefs.priority}
                />
                <th scope="col" className="px-4 py-3">المُسنَدة</th>
                <SortHeader
                  label="آخر ردّ"
                  active={sort === "last_admin_reply_at"}
                  dir={dir}
                  href={sortHrefs.last_admin_reply_at}
                />
                <SortHeader
                  label="آخر تحديث"
                  active={sort === "updated_at"}
                  dir={dir}
                  href={sortHrefs.updated_at}
                />
                <SortHeader
                  label="الإنشاء"
                  active={sort === "created_at"}
                  dir={dir}
                  href={sortHrefs.created_at}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "hover:bg-slate-50",
                      isSelected ? "bg-slate-50" : "",
                    )}
                  >
                    <td className="w-10 px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`تحديد التذكرة ${row.subject}`}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </td>
                    <td className="max-w-xs px-4 py-3 align-middle">
                      <Link
                        href={`/support/${row.id}`}
                        className="block text-sm font-medium text-slate-900 hover:underline"
                      >
                        {row.subject}
                      </Link>
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                        {row.message_preview}
                      </div>
                      {row.attachment_url ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Paperclip className="h-3 w-3" />
                          مرفق
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        {row.user_id ? (
                          <Link
                            href={`/users/${row.user_id}`}
                            className="text-sm font-medium text-slate-900 hover:underline"
                          >
                            {row.user_full_name ?? "—"}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-500">
                            (مستخدم محذوف)
                          </span>
                        )}
                        <span
                          className="text-[11px] text-slate-500"
                          dir="ltr"
                        >
                          {row.user_email || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <PriorityBadge priority={row.priority} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-xs text-slate-600" dir="ltr">
                        {row.assignee_email ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-slate-500" dir="ltr">
                      {safeDate(row.last_admin_reply_at)}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-slate-500" dir="ltr">
                      {safeDate(row.updated_at)}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-slate-500" dir="ltr">
                      {safeDate(row.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
