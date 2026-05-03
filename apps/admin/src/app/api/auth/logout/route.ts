import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/audit";
import { getCurrentAdmin } from "@/lib/auth/current";
import { destroyCurrentSession } from "@/lib/auth/session";
import { extractClientIp } from "@/lib/ip";

export const runtime = "nodejs";

async function performLogout() {
  const ctx = await getCurrentAdmin();
  const headerList = await headers();
  if (ctx) {
    await logAdminAction({
      adminId: ctx.admin.id,
      adminEmail: ctx.admin.email,
      action: "admin.logout",
      ip: extractClientIp(headerList),
      userAgent: headerList.get("user-agent"),
    });
  }
  await destroyCurrentSession();
}

export async function POST(request: NextRequest) {
  await performLogout();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

// GET is intentionally not implemented.  Logout is a state-changing action
// and must be triggered by an explicit form POST so a cross-site `<img src>`
// or fetch GET cannot silently sign an admin out.
