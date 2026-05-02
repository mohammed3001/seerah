"use client";

import { Progress } from "@seerah/ui";

import type { RateLimitInfo } from "@/lib/ai/types";

interface Props {
  rateLimit: RateLimitInfo | null;
  className?: string;
}

/** Daily-quota bar fed by `X-RateLimit-*` headers from the AI service. */
export function RateLimitBar({ rateLimit, className }: Props) {
  if (!rateLimit) return null;
  const used = Math.max(0, rateLimit.limit - rateLimit.remaining);
  const pct = rateLimit.limit > 0 ? (used / rateLimit.limit) * 100 : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>الاستهلاك اليومي</span>
        <span dir="ltr">
          {used} / {rateLimit.limit}
        </span>
      </div>
      <Progress value={pct} className="mt-1.5 h-1.5" />
    </div>
  );
}
