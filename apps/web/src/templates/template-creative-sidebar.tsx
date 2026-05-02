/**
 * template_creative_sidebar (مدفوع)
 * Vertical sidebar with a vivid accent gradient + emoji-style section
 * markers. Aimed at startup / creative-industry CVs.
 */

import * as React from "react";

import {
  getHiddenFields,
  getSectionOrder,
  localized,
  resolveAccent,
  sectionLabel,
} from "./_data";
import { A4, ContactStack } from "./_atoms";
import { BLOCK_FOR_KEY_WITH_BARS } from "./_section-blocks";
import type { TemplateProps } from "./types";

const SIDEBAR_KEYS = new Set(["skills", "languages", "links", "hobbies", "address"]);
const MAIN_KEYS = new Set(["personal", "experience", "education", "courses", "projects", "references"]);

const SECTION_GLYPH: Record<string, string> = {
  experience: "▰",
  education: "✦",
  skills: "✺",
  languages: "✱",
  links: "↗",
  projects: "◇",
  references: "✓",
  hobbies: "✿",
  address: "◉",
  courses: "◑",
};

export function TemplateCreativeSidebar({ data, language, theme }: TemplateProps) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = getSectionOrder(data);
  const hidden = getHiddenFields(data);
  const accent = resolveAccent(theme, "#8B5CF6");
  const accentSoft = `${accent}25`;
  const local = localized(data.personal, language);
  const fullName = local["full_name"] ?? data.personal?.full_name ?? "";
  const jobTitle = local["job_title"] ?? data.personal?.job_title ?? "";
  const fontFamily = language === "ar" ? "var(--font-cairo)" : "var(--font-sf-pro)";
  const surface = theme.mode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-800";

  const sidebar = sectionOrder.filter((k) => SIDEBAR_KEYS.has(k) && !hidden.has(k));
  const main = sectionOrder.filter((k) => MAIN_KEYS.has(k) && !hidden.has(k));

  return (
    <article
      dir={dir}
      lang={language}
      style={{ ...A4, fontFamily }}
      className={`mx-auto grid grid-cols-[33%_67%] text-[12.5px] leading-[1.65] ${surface}`}
    >
      <aside
        className="flex flex-col gap-6 p-8 text-white"
        style={{
          backgroundImage: `linear-gradient(160deg, ${accent} 0%, ${accent}cc 60%, ${accent}88 100%)`,
        }}
      >
        <div>
          <h1 className="text-2xl font-bold leading-tight">{fullName || "—"}</h1>
          {jobTitle ? <p className="mt-1 text-sm opacity-90">{jobTitle}</p> : null}
        </div>

        <div>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-80">
            {language === "ar" ? "التواصل" : "Contact"}
          </h2>
          <ContactStack
            data={data}
            language={language}
            className="space-y-1 text-xs opacity-95"
          />
        </div>

        {sidebar.map((key) => {
          const Block = BLOCK_FOR_KEY_WITH_BARS[key];
          if (!Block) return null;
          return (
            <div key={key}>
              <h2 className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-90">
                <span aria-hidden>{SECTION_GLYPH[key] ?? "•"}</span>
                {sectionLabel(key, language)}
              </h2>
              <Block data={data} language={language} accent="white" />
            </div>
          );
        })}
      </aside>

      <main className="space-y-6 p-10">
        {main.map((key) => {
          const Block = BLOCK_FOR_KEY_WITH_BARS[key];
          if (!Block) return null;
          return (
            <section key={key}>
              {key !== "personal" ? (
                <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em]">
                  <span
                    className="grid size-5 place-items-center rounded-md"
                    style={{ backgroundColor: accentSoft, color: accent }}
                    aria-hidden
                  >
                    {SECTION_GLYPH[key] ?? "•"}
                  </span>
                  <span style={{ color: accent }}>{sectionLabel(key, language)}</span>
                </h2>
              ) : null}
              <Block data={data} language={language} accent={accent} />
            </section>
          );
        })}
      </main>
    </article>
  );
}
