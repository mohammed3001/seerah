import "server-only";

import { redirect } from "next/navigation";

import type { Database } from "@seerah/types";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface DashboardSession {
  userId: string;
  email: string;
  profile: Profile;
}

/**
 * Resolve the current dashboard session: enforces auth, fetches the profile
 * row, and redirects to /auth/login if anything fails.
 */
export async function getDashboardSession(): Promise<DashboardSession> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Profile should be auto-created by `handle_new_user()` trigger; if it's
    // missing the auth state is broken and we send the user back to log in.
    redirect("/auth/login");
  }

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile,
  };
}
