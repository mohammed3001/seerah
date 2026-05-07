"use client";

import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";
import { Suspense } from "react";

import { trackPageView } from "@/lib/analytics/posthog";

/**
 * Fires a PostHog `$pageview` event on every client-side route change.
 *
 * The App Router does NOT fire native `load` events between segments,
 * so PostHog's auto-pageview capture cannot see them. We synthesise the
 * event from `usePathname()` + `useSearchParams()` instead. Mount this
 * once in the root layout — pathname changes from any nested layout
 * still bubble up here so we don't miss anything.
 *
 * Wrapped in `Suspense` because `useSearchParams` requires a Suspense
 * boundary in Next.js 13+ when prerendering pages with searchParams.
 */
function PageViewTrackerInner(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!pathname) return;
    const search = searchParams?.toString();
    const url = search ? `${pathname}?${search}` : pathname;
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

export function PageViewTracker(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  );
}
