"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useActionState } from "react";

import { reorderTemplates, type ActionState } from "@/lib/templates/actions";

interface ReorderButtonsProps {
  templateId: string;
  /** Full ordered list of template ids on this page (sorted by sort_order). */
  orderedIds: string[];
}

/**
 * Up/Down buttons that swap this template with its neighbour and submit the
 * new order to admin_reorder_templates.  We pass the entire ordered list
 * (small — ≤ 200) as JSON so the RPC sets sort_order in one atomic UPDATE.
 *
 * The first row hides the up button and the last row hides the down
 * button; this matches the established admin reorder pattern (template
 * picker on the marketing site uses the same affordance).
 */
export function ReorderButtons({ templateId, orderedIds }: ReorderButtonsProps) {
  const [, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    reorderTemplates,
    undefined,
  );
  const idx = orderedIds.indexOf(templateId);
  const canUp = idx > 0;
  const canDown = idx >= 0 && idx < orderedIds.length - 1;

  function buildSwap(direction: "up" | "down"): string {
    const next = [...orderedIds];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= next.length) return JSON.stringify(next);
    const a = next[idx];
    const b = next[targetIdx];
    if (a === undefined || b === undefined) return JSON.stringify(next);
    next[idx] = b;
    next[targetIdx] = a;
    return JSON.stringify(next);
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <form action={formAction}>
        <input type="hidden" name="ids" value={buildSwap("up")} />
        <button
          type="submit"
          disabled={!canUp || pending}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          title="تحريك للأعلى"
          aria-label="تحريك للأعلى"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
      </form>
      <form action={formAction}>
        <input type="hidden" name="ids" value={buildSwap("down")} />
        <button
          type="submit"
          disabled={!canDown || pending}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          title="تحريك للأسفل"
          aria-label="تحريك للأسفل"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}
