import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";

import { loadResumeForExport } from "@/lib/editor/load-resume";
import { RenderTemplate } from "@/templates";
import type { TemplateLanguage, TemplateMode } from "@/templates/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Render",
  // Tell crawlers to ignore the internal render route.
  robots: { index: false, follow: false },
};

interface SearchParams {
  lang?: string;
  export?: string;
  mode?: string;
  primary?: string;
  template?: string;
}

interface Params {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

/**
 * Internal render route consumed by the export service. Authentication is
 * a single shared bearer token (`RENDER_INTERNAL_TOKEN`); the resume itself
 * is loaded with the service-role client so RLS doesn't block the export.
 *
 * The page deliberately renders only the template — the layout root supplies
 * the `<html>` / `<body>` shell. The render layout neutralises the app
 * background so headless Chrome captures only the resume page.
 */
export default async function InternalRenderPage({ params, searchParams }: Params) {
  const { id } = await params;
  const search = await searchParams;

  await assertAuthorized();

  const data = await loadResumeForExport(id);
  const language: TemplateLanguage = search.lang === "en" ? "en" : "ar";
  const isExport = search.export === "true" || search.export === "1";
  const themeMeta =
    (data.resume.theme as { mode?: TemplateMode; primary_color?: string } | null) ?? null;
  const mode: TemplateMode = parseMode(search.mode) ?? themeMeta?.mode ?? "light";
  const primaryColor =
    typeof search.primary === "string" && /^#[0-9a-fA-F]{6}$/.test(search.primary)
      ? search.primary
      : themeMeta?.primary_color;
  const templateId = search.template ?? data.resume.template_id;

  return (
    <div data-export={isExport ? "true" : "false"} data-template={templateId}>
      <RenderTemplate
        templateId={templateId}
        data={data}
        language={language}
        theme={{ mode, primaryColor }}
        isExport={isExport}
      />
    </div>
  );
}

function parseMode(value: string | undefined): TemplateMode | null {
  if (value === "light" || value === "dark") return value;
  return null;
}

async function assertAuthorized(): Promise<void> {
  const token = process.env["RENDER_INTERNAL_TOKEN"];
  if (!token) {
    // No token configured — fail closed in production but allow rendering
    // in dev so engineers can hit the route in a browser.
    if (process.env["NODE_ENV"] === "production") notFound();
    return;
  }
  const incoming = (await headers()).get("authorization") ?? "";
  const provided = incoming.startsWith("Bearer ")
    ? incoming.slice("Bearer ".length)
    : "";
  if (!provided || !constantTimeEqual(provided, token)) {
    notFound();
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  // Always pad to the longer length so comparing the byte arrays is constant
  // time regardless of input lengths. timingSafeEqual requires equal-length
  // buffers, hence the explicit padding here.
  const max = Math.max(a.length, b.length);
  const ab = Buffer.alloc(max);
  const bb = Buffer.alloc(max);
  ab.write(a, "utf8");
  bb.write(b, "utf8");
  // Returns false if either input had a different actual length than the
  // other, in addition to detecting any byte mismatch.
  return a.length === b.length && timingSafeEqual(ab, bb);
}
