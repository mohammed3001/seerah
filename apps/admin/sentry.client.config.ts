/**
 * Sentry browser SDK initialisation.
 *
 * Loaded automatically by Next.js on every page that runs client-side
 * code (Next.js auto-imports any sentry.client.config.* file at the
 * project root). No-ops gracefully when NEXT_PUBLIC_SENTRY_DSN is
 * empty.
 *
 * Note: only NEXT_PUBLIC_-prefixed env vars are inlined into the
 * browser bundle by Next.js, so the server-only SENTRY_DSN cannot
 * reach this file. Operators must configure NEXT_PUBLIC_SENTRY_DSN to
 * enable client-side error capture.
 *
 * Errors that bubble up are captured and tagged with the page URL.
 * Replays / session tracking are intentionally NOT enabled — they ship
 * a much heavier bundle and the value isn't established yet.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env["NODE_ENV"],
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    // Errors thrown by browser extensions / 3rd-party scripts pollute
    // the issue feed without giving us anything actionable.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
    ],
  });
}
