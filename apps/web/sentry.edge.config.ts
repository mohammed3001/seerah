/**
 * Sentry edge runtime initialisation. Loaded by `instrumentation.ts`
 * when running on Vercel's edge runtime (middleware, edge route
 * handlers).
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env["SENTRY_DSN"];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env["NODE_ENV"],
    tracesSampleRate: 0.1,
  });
}
