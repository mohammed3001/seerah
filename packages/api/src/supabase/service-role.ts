import { createClient } from "@supabase/supabase-js";
import type { Database } from "@seerah/types";
import type { SeerahSupabaseClient } from "./types";

/**
 * Server-only Supabase client using the service-role key.
 * Bypasses RLS — never expose to the browser.
 */
export function createServiceRoleClient(): SeerahSupabaseClient {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!key) {
    throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
