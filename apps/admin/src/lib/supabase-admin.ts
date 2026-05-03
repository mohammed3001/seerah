import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@seerah/types";

let cached: SupabaseClient<Database> | null = null;

/**
 * Service-role Supabase client. Bypasses RLS — only use it from server-side
 * code that has *already* authenticated the caller as an admin (login flow,
 * routes guarded by middleware, server actions called from authenticated
 * pages).
 */
export function getServiceRoleClient(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/admin/.env.local.",
    );
  }

  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
