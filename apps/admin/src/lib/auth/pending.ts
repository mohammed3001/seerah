import { hmacHex, timingSafeEqual } from "./crypto";

/**
 * Pending-TOTP cookie — a stateless signed token issued after successful
 * password verification.  Holds {admin_id, issued_at} so the /2fa/verify
 * page knows which admin to validate against without trusting client input.
 *
 * Format: base64url(payload).hexHmac
 *
 * The cookie is short-lived (5 minutes); after that the admin must re-enter
 * their password.
 */

interface PendingPayload {
  admin_id: string;
  iat: number; // unix seconds
}

function getSecret(): string {
  const secret = process.env["ADMIN_SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be at least 32 characters. Generate with `openssl rand -hex 32` and set in apps/admin/.env.local.",
    );
  }
  return secret;
}

function base64UrlEncode(value: string): string {
  // btoa works in Edge runtime
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  return atob(padded + (pad === 0 ? "" : "=".repeat(4 - pad)));
}

export async function createPendingToken(adminId: string): Promise<string> {
  const payload: PendingPayload = {
    admin_id: adminId,
    iat: Math.floor(Date.now() / 1000),
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = await hmacHex(getSecret(), body);
  return `${body}.${sig}`;
}

export interface VerifiedPending {
  admin_id: string;
  issued_at: number;
}

export async function verifyPendingToken(
  token: string,
  maxAgeSeconds: number,
): Promise<VerifiedPending | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = await hmacHex(getSecret(), body);
  if (!timingSafeEqual(sig, expected)) return null;

  let parsed: PendingPayload;
  try {
    parsed = JSON.parse(base64UrlDecode(body)) as PendingPayload;
  } catch {
    return null;
  }
  if (typeof parsed.admin_id !== "string" || typeof parsed.iat !== "number") {
    return null;
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - parsed.iat;
  if (ageSeconds < 0 || ageSeconds > maxAgeSeconds) return null;

  return { admin_id: parsed.admin_id, issued_at: parsed.iat };
}
