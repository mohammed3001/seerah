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
let initPromise: Promise<void> | null = null;
let identifiedDistinctId: string | null = null;

type PosthogClient = {
  identify: (distinctId: string) => void;
  capture: (event: string, properties?: EventProps) => void;
};

export async function initBrowserAnalytics(distinctId?: string): Promise<void> {
  if (typeof window === "undefined" || !PUBLIC_KEY) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const mod = (await import("posthog-js")) as typeof import("posthog-js");
        mod.default.init(PUBLIC_KEY, {
          api_host: HOST,
          capture_pageview: false,
          capture_pageleave: true,
          persistence: "localStorage+cookie",
          autocapture: false,
        });
        browserPosthog = mod.default;
      } catch {
        // posthog-js failing to load (ad blocker / CSP / offline) must
        // never crash the calling page. Swallow inside the IIFE so the
        // cached initPromise resolves with browserPosthog still null —
        // every subsequent track()/identify() then becomes a no-op.
      }
    })();
  }
  await initPromise;
  // Run identify after init resolves so a later call from <AnalyticsProvider>
  // with the user's id still fires even if the very first init was anonymous
  // (e.g. triggered by track("login") on the auth page). We guard against
  // re-identifying the same id so navigation doesn't spam PostHog.
  if (distinctId && distinctId !== identifiedDistinctId) {
    identifiedDistinctId = distinctId;
    (browserPosthog as PosthogClient | null)?.identify(distinctId);
  }
}

export function track(event: AnalyticsEvent, properties?: EventProps): void {
  if (typeof window === "undefined" || !PUBLIC_KEY) return;
  // Lazy-init on first call so events fired on routes outside the dashboard
  // layout (login / register / marketing) aren't dropped on the floor when
  // <AnalyticsProvider> hasn't mounted yet. initBrowserAnalytics() guards
  // against double-init internally.
  void initBrowserAnalytics()
    .then(() => {
      (browserPosthog as PosthogClient | null)?.capture(event, properties);
    })
    .catch(() => {
      // Analytics must never break the app — swallow.
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
