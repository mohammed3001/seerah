/**
 * template_minimal_lines (مجاني)
 * Generous whitespace, accent left-border on each section, optional
 * circular photo. Timeline-style date strip on the inline-end margin.
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
import { BLOCK_FOR_KEY } from "./_section-blocks";
import type { TemplateProps } from "./types";

export function TemplateMinimalLines({ data, language, theme }: TemplateProps) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = getSectionOrder(data);
  const hidden = getHiddenFields(data);
  const accent = resolveAccent(theme, "#0EA5E9");
  const local = localized(data.personal, language);
  const fullName = local["full_name"] ?? data.personal?.full_name ?? "";
  const jobTitle = local["job_title"] ?? data.personal?.job_title ?? "";
  const surface = theme.mode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-800";
  const muted = theme.mode === "dark" ? "text-zinc-500" : "text-zinc-500";
  const fontFamily = language === "ar" ? "var(--font-cairo)" : "var(--font-sf-pro)";

  return (
    <article
      dir={dir}
      lang={language}
      style={{ ...A4, fontFamily }}
      className={`mx-auto p-14 text-[13px] leading-[1.75] ${surface}`}
    >
      <header className="mb-10">
        <h1 className="text-[34px] font-light tracking-tight">{fullName || "—"}</h1>
        {jobTitle ? (
          <p className={`mt-1 text-base ${muted}`} style={{ color: accent }}>
            {jobTitle}
          </p>
        ) : null}
        <ContactInline
          data={data}
          language={language}
          className={`mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs ${muted}`}
          separator=" • "
        />
      </header>

      <div className="space-y-7">
        {sectionOrder.map((key) => {
          if (hidden.has(key)) return null;
          const Block = BLOCK_FOR_KEY[key];
          if (!Block) return null;
          return (
            <section
              key={key}
              className="ps-5"
              style={{ borderInlineStart: `2px solid ${accent}` }}
            >
              {key !== "personal" ? (
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]">
                  {sectionLabel(key, language)}
                </h2>
              ) : null}
              <Block data={data} language={language} accent={accent} />
            </section>
          );
        })}
      </div>
    </article>
  );
}
