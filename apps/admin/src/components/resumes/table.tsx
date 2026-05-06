import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import Link from "next/link";

import {
  LANGUAGE_LABELS_AR,
  type ResumeListRow,
  type ResumeSortKey,
  type TemplateOption,
} from "@/lib/resumes/types";
import { cn } from "@/lib/utils/cn";

import { ChangeTemplateMenu } from "./change-template-menu";
import { DeleteResumeButton } from "./delete-resume-button";
import { FeaturedToggle } from "./featured-toggle";

interface ResumesTableProps {
  rows: ResumeListRow[];
  sort: ResumeSortKey;
  dir: "asc" | "desc";
  /** Pre-built URLs for sortable column headers — page.tsx assembles them
   *  so we don't depend on next/navigation inside a server component. */
  sortHrefs: Record<ResumeSortKey, string>;
  templates: TemplateOption[];
  /** Public app base URL for resume preview links. */
  publicAppUrl: string;
  /** Whether the viewing admin can delete (super_admin only). */
  canDelete: boolean;
  /** Whether the viewing admin can change template + featured
   *  (super_admin or template_manager). */
  canCurate: boolean;
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

export function ResumesTable({
  rows,
  sort,
  dir,
  sortHrefs,
  templates,
  publicAppUrl,
  canDelete,
  canCurate,
}: ResumesTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-400">
        لا توجد سير ذاتية تطابق الفلاتر الحالية.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-right text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">
                المالك
              </th>
              <SortHeader
                label="العنوان"
                active={sort === "title"}
                dir={dir}
                href={sortHrefs.title}
              />
              <th scope="col" className="px-4 py-3">
                القالب
              </th>
              <th scope="col" className="px-4 py-3">
                اللغة
              </th>
              <SortHeader
                label="الاكتمال"
                active={sort === "completion_score"}
                dir={dir}
                href={sortHrefs.completion_score}
              />
              <SortHeader
                label="المشاهدات"
                active={sort === "views_count"}
                dir={dir}
                href={sortHrefs.views_count}
              />
              <SortHeader
                label="التاريخ"
                active={sort === "created_at"}
                dir={dir}
                href={sortHrefs.created_at}
              />
              <th scope="col" className="px-4 py-3">
                مميزة
              </th>
              <th scope="col" className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                      {r.user_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.user_avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (r.user_full_name ?? r.user_email ?? "?").slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/users/${r.user_id}`}
                        className="block truncate text-sm font-medium text-slate-900 hover:underline"
                      >
                        {r.user_full_name ?? "—"}
                      </Link>
                      {r.user_email ? (
                        <p className="truncate text-[11px] text-slate-500" dir="ltr">
                          {r.user_email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 align-middle">
                  <p className="max-w-[220px] truncate text-sm text-slate-900">{r.title}</p>
                  <p className="truncate text-[11px] text-slate-400" dir="ltr">
                    /{r.slug}
                  </p>
                </td>

                <td className="px-4 py-3 align-middle text-xs text-slate-700">
                  {r.template_name_ar ?? r.template_name ?? r.template_id}
                </td>

                <td className="px-4 py-3 align-middle text-xs text-slate-700">
                  {LANGUAGE_LABELS_AR[r.language]}
                </td>

                <td className="px-4 py-3 align-middle text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          r.completion_score >= 75
                            ? "bg-emerald-500"
                            : r.completion_score >= 40
                              ? "bg-amber-500"
                              : "bg-rose-500",
                        )}
                        style={{ width: `${r.completion_score}%` }}
                      />
                    </div>
                    <span dir="ltr" className="text-slate-700">
                      {r.completion_score}%
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 align-middle text-sm text-slate-700" dir="ltr">
                  {r.views_count.toLocaleString("ar-SA")}
                </td>

                <td className="px-4 py-3 align-middle text-[11px] text-slate-500" dir="ltr">
                  {format(new Date(r.created_at), "yyyy-MM-dd")}
                </td>

                <td className="px-4 py-3 align-middle">
                  {canCurate ? (
                    <FeaturedToggle resumeId={r.id} isFeatured={r.is_featured} />
                  ) : r.is_featured ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      مميزة
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>

                <td className="px-4 py-3 align-middle text-left">
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={`${publicAppUrl}/${r.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      title="معاينة"
                    >
                      <ExternalLink className="h-3 w-3" />
                      معاينة
                    </a>
                    {canCurate ? (
                      <ChangeTemplateMenu
                        resumeId={r.id}
                        currentTemplateId={r.template_id}
                        templates={templates}
                      />
                    ) : null}
                    {canDelete ? (
                      <DeleteResumeButton resumeId={r.id} resumeTitle={r.title} />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
