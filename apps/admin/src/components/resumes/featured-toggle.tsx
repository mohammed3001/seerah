"use client";

import { useActionState } from "react";

import { setResumeFeatured, type ActionState } from "@/lib/resumes/actions";
import { cn } from "@/lib/utils/cn";

interface FeaturedToggleProps {
  resumeId: string;
  isFeatured: boolean;
}

/**
 * Inline toggle for the resumes table.  Uses a server action so the page
 * is revalidated after the click — the new flag value is fetched on the
 * next render rather than maintained in client state.
 */
export function FeaturedToggle({ resumeId, isFeatured }: FeaturedToggleProps) {
  const [, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    setResumeFeatured,
    undefined,
  );

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="resumeId" value={resumeId} />
      <input type="hidden" name="featured" value={isFeatured ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition disabled:opacity-60",
          isFeatured
            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
        )}
        title={isFeatured ? "إلغاء التمييز" : "تمييز السيرة"}
      >
        {pending ? "…" : isFeatured ? "مميزة" : "غير مميزة"}
      </button>
    </form>
  );
}
