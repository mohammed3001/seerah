"use client";

import { useActionState } from "react";

import { setTemplatePricing, type ActionState } from "@/lib/templates/actions";
import { cn } from "@/lib/utils/cn";

interface PricingToggleProps {
  templateId: string;
  isPremium: boolean;
}

export function PricingToggle({ templateId, isPremium }: PricingToggleProps) {
  const [, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    setTemplatePricing,
    undefined,
  );

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="isPremium" value={isPremium ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition disabled:opacity-60",
          isPremium
            ? "bg-violet-100 text-violet-800 hover:bg-violet-200"
            : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
        )}
        title={isPremium ? "اجعله مجانيًا" : "اجعله مدفوعًا"}
      >
        {pending ? "…" : isPremium ? "مدفوع" : "مجاني"}
      </button>
    </form>
  );
}
