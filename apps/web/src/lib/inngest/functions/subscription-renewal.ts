/**
 * Background function — fires when a subscription is approaching its
 * renewal / expiry. Triggered by either the daily cron (`/api/cron/
 * expiring-subscriptions`) for legacy compatibility, or by an explicit
 * `inngest.send({ name: "subscription/renewal-reminder", data: ... })`.
 *
 * The cron route already handles fan-out and idempotency
 * (`email_log` table). This function exists so future renewal flows
 * can be moved off Vercel Cron + onto Inngest's retry / replay /
 * inspection UI without touching the cron caller.
 */

import { inngest } from "../client";

export const subscriptionRenewalFn = inngest.createFunction(
  {
    id: "subscription-renewal-reminder",
    name: "Send renewal reminder before subscription expires",
    retries: 3,
    triggers: [{ event: "subscription/renewal-reminder" }],
  },
  async ({ event, step }) => {
    const { user_id, subscription_id, current_period_end_iso } = event.data as {
      user_id: string;
      subscription_id: string;
      current_period_end_iso: string;
    };

    await step.run("send-renewal-email", async () => {
      const { sendEmail } = await import("@/lib/email/send");
      const { getServiceRoleClient } = await import("@/lib/supabase/service-role");
      const supabase = getServiceRoleClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, locale")
        .eq("id", user_id)
        .single();

      if (!profile?.email) {
        // User was deleted / has no email — nothing to do, success
        // (vs. a retry-able failure).
        return { skipped: "no_email" };
      }

      const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? process.env["WEB_APP_URL"] ?? "";
      await sendEmail({
        to: profile.email,
        template: "subscription_expiring",
        userId: user_id,
        props: {
          appUrl,
          expiresAt: current_period_end_iso,
          willAutoRenew: true,
          unsubscribeUrl: `${appUrl}/api/email/unsubscribe?u=${user_id}`,
          locale: profile.locale === "en" ? "en" : "ar",
        },
        metadata: { subscription_id },
      });
      return { sent: true };
    });

    return { ok: true, user_id, subscription_id };
  },
);
