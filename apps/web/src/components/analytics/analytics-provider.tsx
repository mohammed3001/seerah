"use client";

import * as React from "react";

import { initBrowserAnalytics } from "@/lib/analytics/posthog";

interface Props {
  distinctId?: string | null;
}

/**
 * Lazy-initialises PostHog on mount with the user's distinct id (when known).
 * Renders nothing — purely a side-effect provider mounted in the dashboard
 * layout.
 */
export function AnalyticsProvider({ distinctId }: Props): null {
  React.useEffect(() => {
    void initBrowserAnalytics(distinctId ?? undefined);
  }, [distinctId]);
  return null;
}
