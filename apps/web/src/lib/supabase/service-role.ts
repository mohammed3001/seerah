import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@seerah/types";

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Service-role Supabase client. Bypasses RLS — use only from server-side
 * routes that have already authorised the caller through some other channel
 * (e.g. an internal-token header guard).
 *
 * Singleton-cached because creating a client on every request triggers
 * unnecessary connection setup. The client itself is stateless.
 */
export function getServiceRoleClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "Missing service-role Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cachedClient = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
