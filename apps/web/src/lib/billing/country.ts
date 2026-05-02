/**
 * Country detection for billing. Reads Vercel geo headers when present,
 * falls back to Cloudflare's `cf-ipcountry`, then to the profile's stored
 * `billing_country`. Only used to pick the right Stripe price + Paddle
 * fallback eligibility — never used for content gating.
 */

import "server-only";

interface HeadersLike {
  get(name: string): string | null;
}

export function detectCountryFromHeaders(headers: HeadersLike): string | null {
  const candidates = [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("x-country-code"),
  ];
  for (const c of candidates) {
    if (c && c.length === 2) return c.toUpperCase();
  }
  return null;
}

const PADDLE_PREFERRED = new Set([
  "SA", // Saudi Arabia
  "IQ", // Iraq
  "YE", // Yemen
  "LY", // Libya
  "SY", // Syria
  "SD", // Sudan
]);

/** True when Stripe doesn't reliably support the country and Paddle is preferred. */
export function shouldOfferPaddle(country: string | null | undefined): boolean {
  if (!country) return false;
  return PADDLE_PREFERRED.has(country.toUpperCase());
}
