"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@seerah/types";

/**
 * Browser-side Supabase client. Cookies are managed by `@supabase/ssr` so
 * server and client share the same auth session.
 */
export function createSupabaseBrowserClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient<Database>(url, key);
}
