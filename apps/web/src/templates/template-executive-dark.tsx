/**
 * template_executive_dark (مدفوع)
 * Dark navy header band with gold accent. Body remains light for ATS
 * friendliness. Conservative typography aimed at director / VP roles.
 */

import * as React from "react";

import { getHiddenFields, getSectionOrder, localized, resolveAccent, sectionLabel } from "./_data";
import { A4, ContactInline } from "./_atoms";
import { BLOCK_FOR_KEY } from "./_section-blocks";
import type { TemplateProps } from "./types";

export function TemplateExecutiveDark({ data, language, theme }: TemplateProps) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = getSectionOrder(data);
  const hidden = getHiddenFields(data);
  const gold = resolveAccent(theme, "#C9A84C");
  const navy = "#1A1A2E";
  const local = localized(data.personal, language);
  const fullName = local["full_name"] ?? data.personal?.full_name ?? "";
  const jobTitle = local["job_title"] ?? data.personal?.job_title ?? "";
  const fontFamily = language === "ar" ? "var(--font-cairo)" : "var(--font-sf-pro)";
  const bodySurface =
    theme.mode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-800";

  return (
    <article
      dir={dir}
      lang={language}
      style={{ ...A4, fontFamily }}
      className={`mx-auto text-[13px] leading-[1.7] ${bodySurface}`}
    >
      <header
        className="relative px-12 py-10 text-white"
        style={{
          backgroundColor: navy,
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(201,168,76,0.18) 0, transparent 35%), radial-gradient(circle at 100% 100%, rgba(255,255,255,0.06) 0, transparent 40%)",
        }}
      >
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <h1 className="text-[30px] font-bold tracking-wide">{fullName || "—"}</h1>
            {jobTitle ? (
              <p className="mt-1 text-base" style={{ color: gold }}>
                {jobTitle}
              </p>
            ) : null}
          </div>
          <div
            className="hidden h-12 self-center md:block"
            style={{ width: "2px", backgroundColor: gold }}
          />
        </div>
        <ContactInline
          data={data}
          language={language}
          className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-90"
        />
      </header>

      <div className="space-y-7 px-12 py-10">
        {sectionOrder.map((key) => {
          if (hidden.has(key)) return null;
          const Block = BLOCK_FOR_KEY[key];
          if (!Block) return null;
          return (
            <section key={key}>
              {key !== "personal" ? (
                <h2 className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em]">
                  <span style={{ color: gold }}>◆</span>
                  <span style={{ color: navy }}>{sectionLabel(key, language)}</span>
                  <span className="h-px flex-1" style={{ backgroundColor: gold }} />
                </h2>
              ) : null}
              <Block data={data} language={language} accent={gold} />
            </section>
          );
        })}
      </div>
    </article>
  );
}
