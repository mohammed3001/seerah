import { createServerClient as createSsrServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@seerah/types";
import type { SeerahSupabaseClient } from "./types";

/**
 * Cookie adapter shape `@supabase/ssr` expects. The caller (a Next.js route
 * handler, server action, or middleware) is responsible for wiring its
 * cookie store — this keeps the package framework-agnostic.
 */
export interface ServerCookieAdapter {
  getAll: () => { name: string; value: string }[];
  setAll: (entries: { name: string; value: string; options: CookieOptions }[]) => void;
}

/**
 * Server-side Supabase client bound to caller-provided cookies. Uses
 * `@supabase/ssr` so the session round-trips through cookies the same way
 * the browser client expects.
 */
export function createServerClient(cookies: ServerCookieAdapter): SeerahSupabaseClient {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!url) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!key) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createSsrServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (entries) => {
        try {
          cookies.setAll(entries);
        } catch {
          /* setAll from a Server Component is a no-op — Next handles refresh */
        }
      },
    },
  });
}
