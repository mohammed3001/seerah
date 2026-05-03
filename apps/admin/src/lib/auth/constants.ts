/**
 * Shared auth constants. Kept in a runtime-agnostic file so middleware
 * (Edge runtime) and server components / actions (Node runtime) can both
 * import them without pulling Node-only dependencies.
 */

export const SESSION_COOKIE = "seerah_admin_session";
export const PENDING_COOKIE = "seerah_admin_pending";

/** Full admin session — 2 hours of inactivity. */
export const SESSION_TTL_SECONDS = 2 * 60 * 60;

/** Pending TOTP verification window after successful password — 5 minutes. */
export const PENDING_TTL_SECONDS = 5 * 60;

/** Failed-login lockout threshold + duration. */
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 30;

export const TOTP_ISSUER = "Seerah Admin";

/** Routes that anyone may hit without an admin session. */
export const PUBLIC_PREFIXES = [
  "/login",
  "/2fa/setup",
  "/2fa/verify",
  "/api/auth/login",
  "/api/auth/2fa-setup",
  "/api/auth/2fa-verify",
  "/api/auth/logout",
];

/** Routes that require a *pending* (post-password, pre-TOTP) cookie. */
export const PENDING_PREFIXES = [
  "/2fa/setup",
  "/2fa/verify",
  "/api/auth/2fa-setup",
  "/api/auth/2fa-verify",
];
