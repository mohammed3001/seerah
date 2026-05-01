import { createClient } from "@supabase/supabase-js";
import type { Database } from "@seerah/types";

/**
 * Client type derived from the canonical `createClient` factory so the schema
 * generic resolves identically for browser, server, and service-role clients.
 */
export type SeerahSupabaseClient = ReturnType<typeof createClient<Database>>;
