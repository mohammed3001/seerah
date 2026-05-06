/**
 * template_academic_research (مدفوع)
 * Publication-style layout for PhD / academic CVs. Smaller type, dense
 * spacing, single column, footnote-style references.
 */

import * as React from "react";

import { getHiddenFields, getSectionOrder, localized, resolveAccent, sectionLabel } from "./_data";
import { A4, ContactInline } from "./_atoms";
import { BLOCK_FOR_KEY } from "./_section-blocks";
import type { TemplateProps } from "./types";

export function TemplateAcademicResearch({ data, language, theme }: TemplateProps) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = getSectionOrder(data);
  const hidden = getHiddenFields(data);
  const accent = resolveAccent(theme, "#1F2937");
  const surface = theme.mode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-800";
  const muted = theme.mode === "dark" ? "text-zinc-400" : "text-zinc-600";
  const local = localized(data.personal, language);
  const fullName = local["full_name"] ?? data.personal?.full_name ?? "";
  const jobTitle = local["job_title"] ?? data.personal?.job_title ?? "";
  // Academic style: serif for English so it reads like a publication.
  const fontFamily = language === "ar" ? "var(--font-cairo)" : "Georgia, 'Times New Roman', serif";

  return (
    <article
      dir={dir}
      lang={language}
      style={{ ...A4, fontFamily }}
      className={`mx-auto p-12 text-[12px] leading-[1.55] ${surface}`}
    >
      <header className="mb-6 text-center">
        <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: accent }}>
          {fullName || "—"}
        </h1>
        {jobTitle ? <p className={`mt-0.5 text-sm ${muted}`}>{jobTitle}</p> : null}
        <ContactInline
          data={data}
          language={language}
          className={`mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] ${muted}`}
          separator=" | "
        />
      </header>

      <hr className="mb-5 border-current/20" />

      <div className="space-y-4">
        {sectionOrder.map((key) => {
          if (hidden.has(key)) return null;
          const Block = BLOCK_FOR_KEY[key];
          if (!Block) return null;
          return (
            <section key={key}>
              {key !== "personal" ? (
                <h2
                  className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em]"
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
