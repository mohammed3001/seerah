import { createClient } from "@supabase/supabase-js";
import type { Database } from "@seerah/types";
import type { SeerahSupabaseClient } from "./types";

/**
 * Browser-side Supabase client using the public anon key.
 *
 * Note: this is a plain `supabase-js` client suitable for client components
 * and pure SPA contexts. SSR cookie integration via `@supabase/ssr` will be
 * added when auth flows land.
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

  return createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
