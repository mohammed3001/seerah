/**
 * template_infographic_modern (مدفوع)
 * Visual layout with skill bars, badge-style sections, prominent header.
 * Aimed at marketing / design / sales roles where visuals matter.
 */

import * as React from "react";

import {
  getHiddenFields,
  getSectionOrder,
  localized,
  resolveAccent,
  sectionLabel,
} from "./_data";
import { A4, ContactInline } from "./_atoms";
import { BLOCK_FOR_KEY_WITH_BARS } from "./_section-blocks";
import type { TemplateProps } from "./types";

const SECTION_ICON: Record<string, string> = {
  experience: "▰",
  education: "▲",
  skills: "✺",
  languages: "✱",
  links: "↗",
  projects: "◆",
  references: "✓",
  hobbies: "✿",
  address: "◉",
  courses: "◑",
};

export function TemplateInfographicModern({ data, language, theme }: TemplateProps) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = getSectionOrder(data);
  const hidden = getHiddenFields(data);
  const accent = resolveAccent(theme, "#F59E0B");
  const accentSoft = `${accent}20`;
  const surface = theme.mode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-800";
  const muted = theme.mode === "dark" ? "text-zinc-400" : "text-zinc-500";
  const local = localized(data.personal, language);
  const fullName = local["full_name"] ?? data.personal?.full_name ?? "";
  const jobTitle = local["job_title"] ?? data.personal?.job_title ?? "";
  const fontFamily = language === "ar" ? "var(--font-cairo)" : "var(--font-sf-pro)";

  return (
    <article
      dir={dir}
      lang={language}
      style={{ ...A4, fontFamily }}
      className={`mx-auto p-12 text-[13px] leading-[1.65] ${surface}`}
    >
      <header
        className="-mx-12 -mt-12 mb-8 px-12 py-10"
        style={{
          backgroundImage: `linear-gradient(135deg, ${accent} 0%, ${accent}aa 60%, ${accent}66 100%)`,
        }}
      >
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-white">
          {fullName || "—"}
        </h1>
        {jobTitle ? (
          <p className="mt-1 text-base text-white/90">{jobTitle}</p>
        ) : null}
        <ContactInline
          data={data}
          language={language}
          className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/85"
          separator=" • "
        />
      </header>

      <div className="space-y-7">
        {sectionOrder.map((key) => {
          if (hidden.has(key)) return null;
          const Block = BLOCK_FOR_KEY_WITH_BARS[key];
          if (!Block) return null;
          return (
            <section key={key}>
              {key !== "personal" ? (
                <h2
                  className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ backgroundColor: accentSoft, color: accent }}
                >
                  <span aria-hidden>{SECTION_ICON[key] ?? "•"}</span>
                  {sectionLabel(key, language)}
                </h2>
              ) : null}
              <Block data={data} language={language} accent={accent} muted={muted} />
            </section>
          );
        })}
      </div>
    </article>
  );
}
