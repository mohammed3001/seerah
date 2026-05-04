"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { ActionState } from "@/lib/resumes/actions";
import { cn } from "@/lib/utils/cn";

export function ActionFeedback({ state }: { state: ActionState | undefined }) {
  if (!state || !state.message) return null;
  const Icon = state.ok ? CheckCircle2 : AlertCircle;
  const color = state.ok
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : "text-rose-700 bg-rose-50 border-rose-200";
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
        color,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{state.message}</span>
    </div>
  );
}
