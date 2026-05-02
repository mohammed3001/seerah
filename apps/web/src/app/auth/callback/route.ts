import { NextResponse, type NextRequest } from "next/server";

import { sendEmail } from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * OAuth + email-link callback. Exchanges the `code` from Supabase for a session
 * cookie, then redirects the user to `next` (defaults to `/dashboard`).
 *
 * On the very first session-exchange (i.e. the user just confirmed their
 * email or signed in via OAuth for the first time), fires the welcome email.
 * Idempotency comes from the `email_log` table — we only send when no prior
 * `welcome` row exists for this user.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = exchanged.user;
      if (user) {
        // Don't await — email send + log writes are best-effort and must not
        // delay the redirect.
        void maybeSendWelcome(user.id, user.email ?? null, origin);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}

async function maybeSendWelcome(
  userId: string,
  email: string | null,
  origin: string,
): Promise<void> {
  if (!email) return;
  const admin = getServiceRoleClient();
  // Has this user already received a welcome email? `email_log` is the source
  // of truth so re-confirmations / OAuth re-auths don't trigger duplicates.
  const { data: existing } = await admin
    .from("email_log")
    .select("id")
    .eq("user_id", userId)
    .eq("template", "welcome")
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, unsubscribe_token, locale")
    .eq("id", userId)
    .maybeSingle();

  const token = profile?.unsubscribe_token ?? null;
  const unsubscribeUrl = token
    ? `${origin}/api/email/unsubscribe?token=${encodeURIComponent(token)}`
    : `${origin}/dashboard/account`;

  await sendEmail({
    template: "welcome",
    to: email,
    userId,
    props: {
      fullName: profile?.full_name ?? null,
      appUrl: origin,
      unsubscribeUrl,
      locale: profile?.locale ?? "ar",
    },
  });
}
