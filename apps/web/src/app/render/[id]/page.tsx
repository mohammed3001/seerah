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
  // Encode both strings to their full UTF-8 byte representation. JavaScript
  // `.length` reports UTF-16 code units, which under-counts multi-byte
  // characters — relying on it to size buffers can silently truncate input
  // and let two distinct tokens collide. Buffer.from gives us the actual
  // byte payload, and timingSafeEqual rejects mismatched lengths cleanly.
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Still call timingSafeEqual with same-length scratch buffers so the
    // running time doesn't leak the relative byte length of the secret.
    const dummy = Buffer.alloc(ab.length);
    timingSafeEqual(ab, dummy);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
