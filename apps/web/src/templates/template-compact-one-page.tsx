/**
 * template_compact_one_page (مدفوع)
 * Aggressive density — micro typography, two-column main body, tight
 * spacing. Designed to fit a long career on a single A4 page.
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
import { BLOCK_FOR_KEY_WITH_CHIPS } from "./_section-blocks";
import type { TemplateProps } from "./types";

const COL_A = new Set(["personal", "experience", "projects", "courses"]);
const COL_B = new Set(["education", "skills", "languages", "links", "references", "hobbies", "address"]);

export function TemplateCompactOnePage({ data, language, theme }: TemplateProps) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = getSectionOrder(data);
  const hidden = getHiddenFields(data);
  const accent = resolveAccent(theme, "#0F172A");
  const surface = theme.mode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-800";
  const muted = theme.mode === "dark" ? "text-zinc-400" : "text-zinc-500";
  const local = localized(data.personal, language);
  const fullName = local["full_name"] ?? data.personal?.full_name ?? "";
  const jobTitle = local["job_title"] ?? data.personal?.job_title ?? "";
  const fontFamily = language === "ar" ? "var(--font-cairo)" : "var(--font-sf-pro)";

  const colA = sectionOrder.filter((k) => COL_A.has(k) && !hidden.has(k));
  const colB = sectionOrder.filter((k) => COL_B.has(k) && !hidden.has(k));

  return (
    <article
      dir={dir}
      lang={language}
      style={{ ...A4, fontFamily }}
      className={`mx-auto px-10 py-8 text-[11px] leading-[1.5] ${surface}`}
    >
      <header className="mb-4 flex items-end justify-between gap-6 border-b pb-3" style={{ borderColor: accent }}>
        <div>
          <h1 className="text-[22px] font-bold leading-tight" style={{ color: accent }}>
            {fullName || "—"}
          </h1>
          {jobTitle ? <p className={`text-[12px] ${muted}`}>{jobTitle}</p> : null}
        </div>
        <ContactInline
          data={data}
          language={language}
          className={`text-[10px] text-end ${muted}`}
          separator=" • "
        />
      </header>

      <div className="grid grid-cols-[60%_40%] gap-x-6">
        <div className="space-y-4">
          {colA.map((key) => {
            const Block = BLOCK_FOR_KEY_WITH_CHIPS[key];
            if (!Block) return null;
            return (
              <section key={key}>
                {key !== "personal" ? (
                  <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                    {sectionLabel(key, language)}
                  </h2>
                ) : null}
                <Block data={data} language={language} accent={accent} />
              </section>
            );
          })}
        </div>

        <div className="space-y-4">
          {colB.map((key) => {
            const Block = BLOCK_FOR_KEY_WITH_CHIPS[key];
            if (!Block) return null;
            return (
              <section key={key}>
                <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                  {sectionLabel(key, language)}
                </h2>
                <Block data={data} language={language} accent={accent} />
              </section>
            );
          })}
        </div>
      </div>
    </article>
  );
}
