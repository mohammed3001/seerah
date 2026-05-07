"use client";

import * as React from "react";

import { initBrowserAnalytics } from "@/lib/analytics/posthog";

interface Props {
  distinctId?: string | null;
}

/**
 * Lazy-initialises PostHog on mount and identifies the user when their
 * distinct id is known. Pageview tracking lives in `<PageViewTracker>`
 * which is mounted in the root layout so unauthenticated routes (login,
 * landing) also report pageviews.
 */
export function AnalyticsProvider({ distinctId }: Props): null {
  React.useEffect(() => {
    void initBrowserAnalytics(distinctId ?? undefined);
  }, [distinctId]);
  return null;
}
