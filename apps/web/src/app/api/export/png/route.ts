/**
 * Browser → FastAPI export proxy for PNG. Mirrors /api/export/pdf but
 * forces format="png" before forwarding.
 */

import { NextResponse } from "next/server";

import { getDashboardSession } from "@/lib/dashboard/get-session";
import { exportFromService } from "@/lib/pdf/server";
import { enforceIpRateLimit } from "@/lib/security/ip-rate-limit";
import { assertSameOrigin } from "@/lib/security/origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ClientBody {
  resume_id: string;
  language: "ar" | "en";
  template_id?: string | null;
  primary_color?: string | null;
  mode?: "light" | "dark" | null;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const throttled = await enforceIpRateLimit(request, "export");
  if (throttled) return throttled;

  const session = await getDashboardSession();

  let body: ClientBody;
  try {
    body = (await request.json()) as ClientBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.resume_id) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (body.language !== "ar" && body.language !== "en") {
    return NextResponse.json({ error: "invalid_language" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("resumes")
    .select("id")
    .eq("id", body.resume_id)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await exportFromService("png", {
      user_id: session.userId,
      plan: session.profile.plan,
      resume_id: body.resume_id,
      language: body.language,
      format: "png",
      template_id: body.template_id ?? null,
      primary_color: body.primary_color ?? null,
      mode: body.mode ?? null,
    });
  } catch (cause) {
    return NextResponse.json(
      {
        error: "upstream_unreachable",
        message_ar: "تعذّر الاتصال بخدمة التصدير.",
        message_en: cause instanceof Error ? cause.message : String(cause),
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || `upstream ${upstream.status}`, {
      status: upstream.status,
      headers: passThroughHeaders(upstream.headers),
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: passThroughHeaders(upstream.headers),
  });
}

function passThroughHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of [
    "content-type",
    "content-disposition",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
    "cache-control",
  ]) {
    const value = headers.get(key);
    if (value) out[key] = value;
  }
  return out;
}
