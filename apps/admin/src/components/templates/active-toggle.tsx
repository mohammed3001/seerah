"use client";

import { useActionState } from "react";

import { setTemplateActive, type ActionState } from "@/lib/templates/actions";
import { cn } from "@/lib/utils/cn";

interface ActiveToggleProps {
  templateId: string;
  isActive: boolean;
}

export function ActiveToggle({ templateId, isActive }: ActiveToggleProps) {
  const [, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    setTemplateActive,
    undefined,
  );

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition disabled:opacity-60",
          isActive
            ? "bg-sky-100 text-sky-800 hover:bg-sky-200"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
        )}
        title={isActive ? "تعطيل القالب" : "تفعيل القالب"}
      >
        {pending ? "…" : isActive ? "مفعّل" : "معطّل"}
      </button>
    </form>
  );
}
