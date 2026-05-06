"use client";

import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

import type { ActionState } from "@/lib/support/actions";
import { cn } from "@/lib/utils/cn";

export function ActionFeedback({ state }: { state: ActionState | undefined }) {
  if (!state || !state.message) return null;
  const Icon = state.ok ? CheckCircle2 : AlertCircle;
  const color = state.ok
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : "text-rose-700 bg-rose-50 border-rose-200";
  return (
    <div className="space-y-2">
      <div
        role="status"
        className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-xs", color)}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{state.message}</span>
      </div>
      {state.warning ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.warning}</span>
        </div>
      ) : null}
    </div>
  );
}
