/**
 * Background function — fires when a new user signs up.
 *
 * Triggered by an `inngest.send({ name: "user/welcome", data: ... })`
 * call from the auth callback / register action. Dispatches the
 * Arabic / English welcome email through the existing Resend pipeline.
 *
 * Inngest gives us automatic retries, exponential backoff, and a UI
 * for inspecting failed runs. If the Resend API is briefly unhealthy
 * the email will simply retry rather than be lost on the floor.
 */

import { inngest } from "../client";

export const welcomeUserFn = inngest.createFunction(
  {
    id: "user-welcome-email",
    name: "Send welcome email to new user",
    retries: 3,
    triggers: [{ event: "user/welcome" }],
  },
  async ({ event, step }) => {
    const { user_id, email, full_name, locale } = event.data as {
      user_id: string;
      email: string;
      full_name: string | null;
      locale: "ar" | "en";
    };

    // Lazy import so the email module's transitive deps don't end up in
    // the function-registration manifest.
    await step.run("send-welcome-email", async () => {
      const { sendEmail } = await import("@/lib/email/send");
      const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? process.env["WEB_APP_URL"] ?? "";
      await sendEmail({
        to: email,
        template: "welcome",
        userId: user_id,
        props: {
          fullName: full_name,
          appUrl,
          unsubscribeUrl: `${appUrl}/api/email/unsubscribe?u=${user_id}`,
          locale,
        },
      });
    });

    return { ok: true, user_id };
  },
);
