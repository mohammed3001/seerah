"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function SupportExportButton() {
  const params = useSearchParams();
  const url = `/api/support/export?${params.toString()}`;
  return (
    <a
      href={url}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm hover:bg-slate-50"
    >
      <Download className="h-3.5 w-3.5" />
      تصدير CSV
    </a>
  );
}
