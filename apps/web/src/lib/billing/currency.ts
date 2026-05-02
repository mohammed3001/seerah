/**
 * Currency selection helpers — safe for both server and client bundles.
 *
 * Kept separate from `lib/billing/country.ts` (which is `server-only`) and
 * from `lib/stripe/server.ts` so client components like `<UpgradeModal>` can
 * derive the right SAR/USD label without pulling Stripe SDK code into the
 * browser.
 */

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

export type BillingCurrency = "sar" | "usd";

export function pickCurrencyForCountry(
  country: string | null | undefined,
): BillingCurrency {
  if (country && SAR_COUNTRIES.has(country.toUpperCase())) return "sar";
  return "usd";
}
