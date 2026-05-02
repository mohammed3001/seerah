import "server-only";

import { getServiceRoleClient } from "@/lib/supabase/service-role";

import { getFromAddress, getResend, isEmailConfigured } from "./client";
import { renderPaymentFailed, type PaymentFailedProps } from "./templates/payment-failed";
import {
  renderSubscriptionCancelled,
  type SubscriptionCancelledProps,
} from "./templates/subscription-cancelled";
import {
  renderSubscriptionConfirmed,
  type SubscriptionConfirmedProps,
} from "./templates/subscription-confirmed";
import {
  renderSubscriptionExpiring,
  type SubscriptionExpiringProps,
} from "./templates/subscription-expiring";
import {
  renderSupportTicketReceived,
  type SupportTicketReceivedProps,
} from "./templates/support-ticket-received";
import {
  renderSupportTicketResolved,
  type SupportTicketResolvedProps,
} from "./templates/support-ticket-resolved";
import { renderWelcome, type WelcomeProps } from "./templates/welcome";

export type EmailTemplate =
  | "welcome"
  | "subscription_confirmed"
  | "payment_failed"
  | "subscription_expiring"
  | "subscription_cancelled"
  | "support_ticket_received"
  | "support_ticket_resolved";

/**
 * Whether the recipient's `marketing_emails_enabled` flag should gate this
 * template. Transactional templates (receipts, failures, support) ignore the
 * flag — they're legally required regardless of marketing preferences.
 */
const MARKETING_TEMPLATES = new Set<EmailTemplate>(["welcome", "subscription_expiring"]);

interface SendArgs<T> {
  template: EmailTemplate;
  to: string;
  /** Profile id; used to look up marketing prefs and write the email_log row. */
  userId: string | null;
  /** Template props. Discriminated by the `template` field via overloads below. */
  props: T;
  /**
   * Free-form audit metadata persisted on the email_log row. Used by the cron
   * job to track "we already sent the 7-day reminder for subscription X
   * period Y" without a separate flag table.
   */
  metadata?: Record<string, string | number | boolean | null>;
}

interface RenderedTemplate {
  subject: string;
  html: string;
}

function render(template: EmailTemplate, props: unknown): RenderedTemplate {
  switch (template) {
    case "welcome":
      return renderWelcome(props as WelcomeProps);
    case "subscription_confirmed":
      return renderSubscriptionConfirmed(props as SubscriptionConfirmedProps);
    case "payment_failed":
      return renderPaymentFailed(props as PaymentFailedProps);
    case "subscription_expiring":
      return renderSubscriptionExpiring(props as SubscriptionExpiringProps);
    case "subscription_cancelled":
      return renderSubscriptionCancelled(props as SubscriptionCancelledProps);
    case "support_ticket_received":
      return renderSupportTicketReceived(props as SupportTicketReceivedProps);
    case "support_ticket_resolved":
      return renderSupportTicketResolved(props as SupportTicketResolvedProps);
  }
}

/**
 * Send a transactional email and write an `email_log` row regardless of
 * outcome. Errors from Resend / Supabase are swallowed — email delivery must
 * never break the calling request (signup, webhook, etc.).
 *
 * Behaviour matrix:
 *
 * - `RESEND_API_KEY` unset → log row with status='skipped', error='not_configured'.
 *   No provider call. This is the default in dev and when the user hasn't
 *   provisioned Resend yet.
 * - User opted out of marketing AND template is in MARKETING_TEMPLATES →
 *   status='skipped', error='unsubscribed'.
 * - Provider call succeeded → status='sent', provider_message_id populated.
 * - Provider call failed → status='failed', error=<message>.
 */
export async function sendEmail<T>(args: SendArgs<T>): Promise<void> {
  const admin = getServiceRoleClient();

  // Look up marketing prefs when relevant. Transactional templates skip this
  // round-trip entirely.
  let suppressed = false;
  if (MARKETING_TEMPLATES.has(args.template) && args.userId) {
    const { data } = await admin
      .from("profiles")
      .select("marketing_emails_enabled")
      .eq("id", args.userId)
      .maybeSingle();
    if (data && data.marketing_emails_enabled === false) suppressed = true;
  }

  const baseRow = {
    user_id: args.userId,
    to_email: args.to,
    template: args.template,
    metadata: args.metadata ?? {},
  };

  if (suppressed) {
    await admin.from("email_log").insert({
      ...baseRow,
      status: "skipped",
      error: "unsubscribed",
    });
    return;
  }

  if (!isEmailConfigured()) {
    await admin.from("email_log").insert({
      ...baseRow,
      status: "skipped",
      error: "not_configured",
    });
    return;
  }

  const rendered = render(args.template, args.props);
  const resend = getResend();
  if (!resend) {
    await admin.from("email_log").insert({
      ...baseRow,
      status: "skipped",
      error: "not_configured",
    });
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: args.to,
      subject: rendered.subject,
      html: rendered.html,
    });

    if (error) {
      await admin.from("email_log").insert({
        ...baseRow,
        status: "failed",
        error: typeof error === "string" ? error : (error.message ?? "resend_error"),
      });
      return;
    }

    await admin.from("email_log").insert({
      ...baseRow,
      status: "sent",
      provider_message_id: data?.id ?? null,
    });
  } catch (err) {
    await admin.from("email_log").insert({
      ...baseRow,
      status: "failed",
      error: err instanceof Error ? err.message : "unknown_error",
    });
  }
}
