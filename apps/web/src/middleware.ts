import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@seerah/types";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_PREFIXES = ["/auth/login", "/auth/register"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  // If env is missing in dev/preview, skip auth gating rather than 500-ing.
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (entries: { name: string; value: string; options: CookieOptions }[]) => {
        for (const { name, value } of entries) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of entries) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthPage = AUTH_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/auth/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (isAuthPage && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
