/**
 * Inngest serve route — exposes the registered functions to the Inngest
 * runner. The runner POSTs here to invoke functions and GETs to
 * introspect the registration manifest.
 *
 * Auth: Inngest signs every request with INNGEST_SIGNING_KEY; the
 * `serve()` helper verifies the signature automatically. Without the
 * key the route refuses every invocation, so a stray public POST can
 * never trigger a function.
 */

import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { subscriptionRenewalFn, welcomeUserFn } from "@/lib/inngest/functions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [welcomeUserFn, subscriptionRenewalFn],
});
