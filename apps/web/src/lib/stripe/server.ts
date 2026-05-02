/**
 * Server-side Stripe client + price catalogue.
 *
 * The publishable key ships in the browser via `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`;
 * everything in this file requires the secret key and stays on the server.
 *
 * Pricing strategy (Phase 5):
 *   - Single product: "باقة برايم" (Prime annual)
 *   - SAR 149/year  → STRIPE_PRIME_PRICE_ID_SAR
 *   - USD $39/year  → STRIPE_PRIME_PRICE_ID_USD (international fallback)
 *
 * If only one price id is configured we fall back to it for both currencies,
 * so the routes still work in dev with a single Stripe price.
 */

import "server-only";

import Stripe from "stripe";

const SECRET_KEY = process.env["STRIPE_SECRET_KEY"] ?? "";

let _client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_client) {
    if (!SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured. Set it in apps/web/.env.local or repo secrets.",
      );
    }
    _client = new Stripe(SECRET_KEY, {
      // Pin the API version so dashboard updates don't change object shapes.
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      appInfo: {
        name: "Seerah",
        version: "0.1.0",
        url: "https://seerah.example.com",
      },
    });
  }
  return _client;
}

export interface PriceInfo {
  id: string;
  currency: "sar" | "usd";
  amount_cents: number; // null-safe; 14900 for SAR149/y, 3900 for $39/y
  interval: "year";
}

const FALLBACK_SAR = process.env["STRIPE_PRIME_PRICE_ID"] ?? "";
const FALLBACK_USD = process.env["STRIPE_PRIME_PRICE_ID"] ?? "";
const PRICE_SAR = process.env["STRIPE_PRIME_PRICE_ID_SAR"] || FALLBACK_SAR;
const PRICE_USD = process.env["STRIPE_PRIME_PRICE_ID_USD"] || FALLBACK_USD;

/** Resolve the Stripe price id for a billing currency. */
export function resolvePriceId(currency: "sar" | "usd"): string {
  const id = currency === "sar" ? PRICE_SAR : PRICE_USD;
  if (!id) {
    throw new Error(
      `Stripe price id for ${currency.toUpperCase()} is not configured. ` +
        `Set STRIPE_PRIME_PRICE_ID_${currency.toUpperCase()} or STRIPE_PRIME_PRICE_ID.`,
    );
  }
  return id;
}

/** Pick the right currency for a billing country. SAR for KSA/MENA, USD elsewhere. */
const SAR_COUNTRIES = new Set([
  "SA", // Saudi Arabia
  "AE", // UAE
  "KW", // Kuwait
  "QA", // Qatar
  "BH", // Bahrain
  "OM", // Oman
  "JO", // Jordan
  "EG", // Egypt
]);

export function pickCurrencyForCountry(country: string | null | undefined): "sar" | "usd" {
  if (country && SAR_COUNTRIES.has(country.toUpperCase())) return "sar";
  return "usd";
}

export const PRIME_TRIAL_DAYS = 7;

export const PRIME_PLAN = {
  name_ar: "باقة برايم",
  name_en: "Prime Plan",
  price_sar: 149,
  price_usd: 39,
  currency_default: "sar" as const,
  trial_days: PRIME_TRIAL_DAYS,
} as const;

export function getStripeConfig(): {
  configured: boolean;
  publishableKey: string;
  webhookSecret: string;
} {
  return {
    configured: Boolean(SECRET_KEY),
    publishableKey: process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] ?? "",
    webhookSecret: process.env["STRIPE_WEBHOOK_SECRET"] ?? "",
  };
}
