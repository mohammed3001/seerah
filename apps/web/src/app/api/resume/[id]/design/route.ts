/**
 * POST /api/resume/[id]/design
 *
 * Mobile-facing equivalent of the three design server actions in
 * `apps/web/src/app/(dashboard)/dashboard/resume/[id]/design/actions.ts`
 * (`applyTemplate`, `applyAccentColor`, `applyThemeMode`).
 *
 * Mobile cannot call Next.js server actions, so it calls this REST route
 * with any combination of `template_id`, `accent` (CSS hex or null to clear),
 * and `mode` ("light" | "dark"). The same security checks apply:
 *   - The signed-in user must own the target resume.
 *   - Premium templates are gated to plan != "free".
 *   - Hex colour validation matches the server action.
 *
 * Returns the updated `{ template_id, theme }` so the client can re-apply the
 * remote state without a second fetch.
 */

import { NextResponse } from "next/server";

import { getDashboardSession } from "@/lib/dashboard/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TEMPLATE_BY_ID, type TemplateId } from "@/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

interface Body {
  template_id?: string | null;
  accent?: string | null;
  mode?: "light" | "dark" | null;
}

interface Theme {
  mode: "light" | "dark";
  primary_color?: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  let session;
  try {
    session = await getDashboardSession();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id: resumeId } = await context.params;
  if (!resumeId) {
    return NextResponse.json({ error: "missing_resume_id" }, { status: 400 });
  }

  let body: Body;
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    body = {
      template_id: typeof raw["template_id"] === "string" ? raw["template_id"] : undefined,
      accent:
        raw["accent"] === null
          ? null
          : typeof raw["accent"] === "string"
            ? raw["accent"]
            : undefined,
      mode:
        raw["mode"] === "light" || raw["mode"] === "dark" ? raw["mode"] : undefined,
    };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (
    body.template_id === undefined &&
    body.accent === undefined &&
    body.mode === undefined
  ) {
    return NextResponse.json(
      { error: "no_changes", message_ar: "لم يتم تمرير أي تغيير." },
      { status: 400 },
    );
  }

  // Premium template gate — mirror the server action's policy. Without this
  // check a free user could PATCH the column directly via their session and
  // get a premium template into the export pipeline.
  if (body.template_id) {
    const meta = TEMPLATE_BY_ID[body.template_id as TemplateId];
    if (!meta) {
      return NextResponse.json(
        { error: "unknown_template", message_ar: "تصميم غير معروف" },
        { status: 400 },
      );
    }
    if (meta.is_premium && session.profile.plan === "free") {
      return NextResponse.json(
        {
          error: "premium_required",
          message_ar: "هذا التصميم متاح للمشتركين فقط.",
          message_en: "This template requires a Prime subscription.",
          template_id: meta.id,
        },
        { status: 402 },
      );
    }
  }

  if (
    body.accent !== undefined &&
    body.accent !== null &&
    !HEX_COLOUR.test(body.accent)
  ) {
    return NextResponse.json(
      { error: "invalid_color", message_ar: "اللون غير صالح" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  // Ownership check + read current theme so we can merge instead of replace.
  const { data: row, error: readError } = await supabase
    .from("resumes")
    .select("template_id, theme")
    .eq("id", resumeId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json(
      { error: "not_found", message_ar: "السيرة غير موجودة." },
      { status: 404 },
    );
  }

  const currentTheme: Theme =
    (row.theme as Theme | null) ?? { mode: "light" };
  const nextTheme: Theme = { mode: currentTheme.mode };
  if (currentTheme.primary_color) nextTheme.primary_color = currentTheme.primary_color;

  if (body.mode) nextTheme.mode = body.mode;
  if (body.accent === null) {
    delete nextTheme.primary_color;
  } else if (typeof body.accent === "string") {
    nextTheme.primary_color = body.accent;
  }

  // Apply each field individually rather than building one dynamic payload —
  // Supabase's generated types reject `Record<string, unknown>` updates
  // (RejectExcessProperties), and splitting matches the existing per-action
  // server actions in `design/actions.ts`.
  if (body.template_id) {
    const { error: writeError } = await supabase
      .from("resumes")
      .update({ template_id: body.template_id })
      .eq("id", resumeId)
      .eq("user_id", session.userId);
    if (writeError) {
      return NextResponse.json({ error: writeError.message }, { status: 500 });
    }
  }
  if (body.accent !== undefined || body.mode) {
    const themeJson: Record<string, string> = { mode: nextTheme.mode };
    if (nextTheme.primary_color) themeJson["primary_color"] = nextTheme.primary_color;
    const { error: writeError } = await supabase
      .from("resumes")
      .update({ theme: themeJson })
      .eq("id", resumeId)
      .eq("user_id", session.userId);
    if (writeError) {
      return NextResponse.json({ error: writeError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    template_id: body.template_id ?? row.template_id,
    theme: nextTheme,
  });
}
