"use client";

import { Crown } from "lucide-react";
import * as React from "react";

import { Button, Progress } from "@seerah/ui";

import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { track } from "@/lib/analytics/posthog";
import type { RateLimitInfo } from "@/lib/ai/types";

interface Props {
  rateLimit: RateLimitInfo | null;
  plan?: "free" | "prime" | "enterprise";
  className?: string;
}

/** Daily-quota bar fed by `X-RateLimit-*` headers from the AI service. */
export function RateLimitBar({ rateLimit, plan, className }: Props) {
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  if (!rateLimit) return null;
  const used = Math.max(0, rateLimit.limit - rateLimit.remaining);
  const pct = rateLimit.limit > 0 ? (used / rateLimit.limit) * 100 : 0;
  const isFree = plan === "free" || plan === undefined;
  const exhausted = rateLimit.remaining === 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>الاستهلاك اليومي</span>
        <span dir="ltr">
          {used} / {rateLimit.limit}
        </span>
      </div>
      <Progress value={pct} className="mt-1.5 h-1.5" />
      {exhausted && isFree ? (
        <div className="mt-2 rounded-card border border-amber-200 bg-amber-50/40 p-2 text-xs dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="font-medium">انتهت طلبات اليوم</p>
          <p className="mt-0.5 text-muted-foreground">
            ترقية برايم تمنحك 100 طلب يوميًا.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 gap-1"
            onClick={() => {
              track("upgrade_viewed", { source: "ai_limit" });
              setUpgradeOpen(true);
            }}
          >
            <Crown className="size-3.5" />
            فعّل برايم
          </Button>
          <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="aiLimit" />
        </div>
      ) : null}
    </div>
  );
}
