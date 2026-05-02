/**
 * template_elegant_feminine (مدفوع)
 * Soft pastel palette, rounded radii, generous letter spacing. Aimed at
 * fashion / HR / education industries.
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

export function TemplateElegantFeminine({ data, language, theme }: TemplateProps) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = getSectionOrder(data);
  const hidden = getHiddenFields(data);
  const accent = resolveAccent(theme, "#EC4899");
  const accentSoft = `${accent}14`;
  const surface = theme.mode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-[#FFF8FA] text-zinc-700";
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
      className={`mx-auto p-12 text-[13px] leading-[1.8] ${surface}`}
    >
      <header
        className="mb-10 rounded-3xl p-8 text-center"
        style={{ backgroundColor: accentSoft }}
      >
        <h1 className="text-[30px] font-light tracking-[0.04em]" style={{ color: accent }}>
          {fullName || "—"}
        </h1>
        {jobTitle ? (
          <p className={`mt-1 text-sm tracking-[0.22em] ${muted}`}>{jobTitle}</p>
        ) : null}
        <ContactInline
          data={data}
          language={language}
          className={`mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs ${muted}`}
          separator=" ✦ "
        />
      </header>

      <div className="space-y-7">
        {sectionOrder.map((key) => {
          if (hidden.has(key)) return null;
          const Block = BLOCK_FOR_KEY[key];
          if (!Block) return null;
          return (
            <section key={key}>
              {key !== "personal" ? (
                <h2
                  className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.32em]"
                  style={{ color: accent }}
                >
                  ✦ {sectionLabel(key, language)} ✦
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
