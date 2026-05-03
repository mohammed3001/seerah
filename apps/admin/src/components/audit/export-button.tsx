"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

/**
 * Forwards the current filter URLSearchParams to /api/audit/export so the
 * CSV download covers exactly the rows the admin sees, not the raw table.
 */
export function ExportButton() {
  const params = useSearchParams();
  const href = `/api/audit/export?${params.toString()}`;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <Download className="h-3.5 w-3.5" />
      تصدير CSV
    </a>
  );
}
