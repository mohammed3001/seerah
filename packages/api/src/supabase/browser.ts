import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import type { Database } from "@seerah/types";
import type { SeerahSupabaseClient } from "./types";

/**
 * Browser-side Supabase client. Uses `@supabase/ssr` so cookies stay in sync
 * with the server client (Next.js App Router shares its session via cookies,
 * not localStorage).
 *
 * Apps already define their own thin wrappers in `apps/<app>/src/lib/supabase/`
 * — this is the shared variant for any future package or stand-alone tool
 * that needs an anon-key client.
 */
export function createBrowserClient(): SeerahSupabaseClient {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!url) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!key) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createSsrBrowserClient<Database>(url, key);
}
