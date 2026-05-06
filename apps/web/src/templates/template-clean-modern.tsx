/**
 * template_clean_modern (مجاني)
 * Single-column minimalist layout with thin section dividers. The default
 * template for new resumes — fast to render and works flawlessly in RTL.
 */

import * as React from "react";

import { getHiddenFields, getSectionOrder, localized, resolveAccent, sectionLabel } from "./_data";
import { A4, ContactInline } from "./_atoms";
import { BLOCK_FOR_KEY } from "./_section-blocks";
import type { TemplateProps } from "./types";

export function TemplateCleanModern({ data, language, theme }: TemplateProps) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = getSectionOrder(data);
  const hidden = getHiddenFields(data);
  const accent = resolveAccent(theme, "#0F172A");
  const local = localized(data.personal, language);
  const fullName = local["full_name"] ?? data.personal?.full_name ?? "";
  const jobTitle = local["job_title"] ?? data.personal?.job_title ?? "";
  const surface = theme.mode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-800";
  const subtle = theme.mode === "dark" ? "border-zinc-800" : "border-zinc-200";
  const muted = theme.mode === "dark" ? "text-zinc-400" : "text-zinc-500";
  const fontFamily = language === "ar" ? "var(--font-cairo)" : "var(--font-sf-pro)";

  return (
    <article
      dir={dir}
      lang={language}
      style={{ ...A4, fontFamily }}
      className={`mx-auto p-12 text-[13px] leading-[1.7] ${surface}`}
    >
      <header className={`mb-8 border-b ${subtle} pb-6`}>
        <h1 className="text-[28px] font-bold tracking-tight" style={{ color: accent }}>
          {fullName || "—"}
        </h1>
        {jobTitle ? <p className={`mt-1 text-base ${muted}`}>{jobTitle}</p> : null}
        <ContactInline
          data={data}
          language={language}
          className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs ${muted}`}
        />
      </header>

      <div className="space-y-6">
        {sectionOrder.map((key) => {
          if (hidden.has(key)) return null;
          const Block = BLOCK_FOR_KEY[key];
          if (!Block) return null;
          // The personal block is rendered inside the header; no need to
          // repeat the bio below unless explicitly listed in the section
          // order — even then, we suppress the heading for the bio.
          return (
            <section key={key}>
              {key !== "personal" ? (
                <h2
                  className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: accent }}
                >
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
