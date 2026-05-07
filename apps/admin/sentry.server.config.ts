/**
 * Sentry Node.js runtime initialisation. Loaded by `instrumentation.ts`
 * when running on the Node.js runtime (server actions, route handlers
 * that don't opt into edge).
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
