/**
 * Edge-runtime-safe crypto helpers. Uses the WebCrypto API
 * (`globalThis.crypto.subtle`) so the same module works in middleware,
 * server actions, and route handlers.
 */

const HEX_CHARS = "0123456789abcdef";

function bufferToHex(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < view.length; i++) {
    const byte = view[i];
    if (byte === undefined) continue;
    out += HEX_CHARS[(byte >>> 4) & 0xf]! + HEX_CHARS[byte & 0xf]!;
  }
  return out;
}

/**
 * Generate a cryptographically random opaque token, returned as lowercase
 * hex.  Length defaults to 32 bytes (256 bits) which produces a 64-char
 * string.
 */
export function generateToken(byteLength = 32): string {
  const buf = new Uint8Array(byteLength);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i]!;
    out += HEX_CHARS[(byte >>> 4) & 0xf]! + HEX_CHARS[byte & 0xf]!;
  }
  return out;
}

/** Hex-encoded SHA-256 of a string. Edge-safe. */
export async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bufferToHex(digest);
}

/**
 * HMAC-SHA-256 of `message` using `secret`, hex-encoded. Used for the
 * pending-TOTP cookie integrity check.
 */
export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return bufferToHex(signature);
}

/** Constant-time string comparison. Returns false if lengths differ. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
