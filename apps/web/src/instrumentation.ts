/**
 * Next.js instrumentation hook — runs once per process at startup.
 *
 * Wires up Sentry for the Node.js and Edge runtimes when SENTRY_DSN is
 * configured. Browser-side init lives in `sentry.client.config.ts`.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env["SENTRY_DSN"]) {
    // SDK no-ops gracefully when DSN is empty, but skipping init avoids
    // the import cost in environments that don't ship Sentry.
    return;
  }

  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env["NEXT_RUNTIME"] === "edge") {
    await import("../sentry.edge.config");
  }
}

// Re-export Sentry's helper directly so the signatures stay in lockstep
// with Next.js's `onRequestError` contract. `captureRequestError` is a
// no-op if Sentry was never initialised.
export const onRequestError = Sentry.captureRequestError;
