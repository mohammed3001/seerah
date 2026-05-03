"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Server Components recompute their data on every request, so a refresh
 * just needs to invalidate the route cache.  router.refresh() does that
 * without a full page reload — the dashboard re-renders inline.
 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
    >
      <RotateCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
      تحديث
    </button>
  );
}
