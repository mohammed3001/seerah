import "server-only";

import { Resend } from "resend";

let cached: Resend | null = null;

/**
 * Returns a memoised Resend client when RESEND_API_KEY is present, or `null`
 * when it isn't. Callers must handle the null case — typically by recording
 * a `skipped` row in `email_log` and returning early.
 *
 * The null-when-unset behaviour exists so local dev, CI, and the (frequent)
 * "user hasn't provisioned Resend yet" production state don't crash on every
 * signup or webhook event.
 */
export function getResend(): Resend | null {
  if (cached) return cached;
  const key = process.env["RESEND_API_KEY"];
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env["RESEND_API_KEY"] && process.env["RESEND_FROM_EMAIL"]);
}

export function getFromAddress(): string {
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not set; check isEmailConfigured() before calling.");
  }
  return from;
}
