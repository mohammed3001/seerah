import "server-only";

import Stripe from "stripe";

/**
 * Lazy Stripe client for the admin app.
 *
 * The publishable key is irrelevant here — admin is a back-office app
 * with no checkout sessions of its own.  We only ever call API routes
 * that need the secret key (subscriptions.update, refunds, etc.).
 *
 * `getStripeOptional()` returns null if `STRIPE_SECRET_KEY` is unset,
 * which lets the UI gracefully degrade ("Stripe settings missing")
 * instead of crashing.  `getStripe()` throws — useful inside server
 * actions where we want a clear error after the route has decided to
 * proceed.
 */

const SECRET_KEY = process.env["STRIPE_SECRET_KEY"] ?? "";

let cached: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return SECRET_KEY.length > 0;
}

export function getStripeOptional(): Stripe | null {
  if (!isStripeConfigured()) return null;
  return getStripe();
}

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Set it in apps/admin/.env.local or repo secrets.",
    );
  }
  if (!cached) {
    cached = new Stripe(SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      appInfo: {
        name: "Seerah Admin",
        version: "0.1.0",
      },
    });
  }
  return cached;
}

/**
 * Build the Stripe Dashboard URL for a refund-eligible subscription.
 * Matches Stripe's own URL scheme so admins land on the correct screen.
 */
export function refundDashboardUrl(stripeSubscriptionId: string): string {
  return `https://dashboard.stripe.com/subscriptions/${stripeSubscriptionId}`;
}

export function customerDashboardUrl(stripeCustomerId: string): string {
  return `https://dashboard.stripe.com/customers/${stripeCustomerId}`;
}
