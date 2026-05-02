/**
 * PostHog analytics — thin wrapper that no-ops when the public key isn't set.
 *
 * Browser side: lazy-imports `posthog-js` so the SDK doesn't ship in builds
 * without a key. Server side: a small fetch helper to /capture so route
 * handlers can record events (e.g. webhook activations) without bundling
 * `posthog-node`.
 */

const PUBLIC_KEY = process.env["NEXT_PUBLIC_POSTHOG_KEY"] ?? "";
const HOST = process.env["NEXT_PUBLIC_POSTHOG_HOST"] ?? "https://app.posthog.com";

export type AnalyticsEvent =
  | "signup"
  | "login"
  | "resume_created"
  | "template_selected"
  | "ai_used"
  | "export_downloaded"
  | "upgrade_viewed"
  | "upgrade_completed"
  | "subscription_cancelled"
  | "support_ticket_created";

export type EventProps = Record<string, string | number | boolean | null | undefined>;

let browserPosthog: unknown = null;
let initialised = false;

export async function initBrowserAnalytics(distinctId?: string): Promise<void> {
  if (typeof window === "undefined" || !PUBLIC_KEY || initialised) return;
  initialised = true;
  const mod = (await import("posthog-js")) as typeof import("posthog-js");
  mod.default.init(PUBLIC_KEY, {
    api_host: HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: false,
  });
  if (distinctId) mod.default.identify(distinctId);
  browserPosthog = mod.default;
}

export function track(event: AnalyticsEvent, properties?: EventProps): void {
  if (typeof window === "undefined" || !PUBLIC_KEY) return;
  // posthog-js may be loading asynchronously when this is first called.
  void Promise.resolve().then(() => {
    const inst = browserPosthog as { capture?: (e: string, p?: EventProps) => void } | null;
    inst?.capture?.(event, properties);
  });
}

/**
 * Server-side capture via the /capture endpoint. Used from API routes /
 * server actions when we can't (or don't want to) bundle posthog-node.
 *
 * Errors are swallowed — analytics must never break a user-facing request.
 */
export async function trackServer(
  distinctId: string,
  event: AnalyticsEvent,
  properties?: EventProps,
): Promise<void> {
  if (!PUBLIC_KEY) return;
  try {
    await fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: PUBLIC_KEY,
        event,
        distinct_id: distinctId,
        properties: { ...(properties ?? {}), $lib: "seerah-server" },
        timestamp: new Date().toISOString(),
      }),
      // Don't block the calling request waiting on PostHog.
      cache: "no-store",
    });
  } catch {
    // Swallow.
  }
}
