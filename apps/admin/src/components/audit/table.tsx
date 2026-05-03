import { format } from "date-fns";

import type { AuditRow } from "@/lib/audit/list";

interface AuditTableProps {
  rows: AuditRow[];
}

export function AuditTable({ rows }: AuditTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-400">
        لا توجد سجلات تطابق الفلاتر الحالية.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-right text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">المشرف</th>
              <th scope="col" className="px-4 py-3">الإجراء</th>
              <th scope="col" className="px-4 py-3">الهدف</th>
              <th scope="col" className="px-4 py-3">IP</th>
              <th scope="col" className="px-4 py-3">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 align-top">
                  <p className="text-xs font-medium text-slate-900" dir="ltr">
                    {row.admin_email ?? "—"}
                  </p>
                  {row.admin_id ? (
                    <p className="mt-0.5 text-[10px] text-slate-400" dir="ltr">
                      {row.admin_id.slice(0, 8)}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <code
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-700"
                    dir="ltr"
                  >
                    {row.action}
                  </code>
                </td>
                <td className="px-4 py-3 align-top">
                  {row.target_type ? (
                    <p className="text-xs text-slate-700">
                      {row.target_type}
                      {row.target_id ? (
                        <span className="ms-1 font-mono text-[10px] text-slate-400" dir="ltr">
                          {row.target_id.slice(0, 8)}
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                  {row.metadata && Object.keys(row.metadata as object).length > 0 ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[10px] text-slate-500 hover:text-slate-700">
                        بيانات إضافية
                      </summary>
                      <pre
                        className="mt-1 max-w-xs overflow-x-auto rounded bg-slate-50 p-2 text-[10px] text-slate-600"
                        dir="ltr"
                      >
                        {JSON.stringify(row.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <code className="text-[11px] font-mono text-slate-500" dir="ltr">
                    {row.ip ?? "—"}
                  </code>
                </td>
                <td className="px-4 py-3 align-top text-[11px] text-slate-500" dir="ltr">
                  {format(new Date(row.created_at), "yyyy-MM-dd HH:mm:ss")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
