/**
 * template_tech_developer (مدفوع)
 * Code-inspired layout. Mono accents, terminal-style headers.
 * Aimed at engineers; works well even rendered as plain text.
 */

import * as React from "react";

import { getHiddenFields, getSectionOrder, localized, resolveAccent, sectionLabel } from "./_data";
import { A4, ContactStack } from "./_atoms";
import { BLOCK_FOR_KEY_WITH_CHIPS } from "./_section-blocks";
import type { TemplateProps } from "./types";

export function TemplateTechDeveloper({ data, language, theme }: TemplateProps) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = getSectionOrder(data);
  const hidden = getHiddenFields(data);
  const accent = resolveAccent(theme, "#10B981");
  const surface = theme.mode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-800";
  const muted = theme.mode === "dark" ? "text-zinc-500" : "text-zinc-500";
  const local = localized(data.personal, language);
  const fullName = local["full_name"] ?? data.personal?.full_name ?? "";
  const jobTitle = local["job_title"] ?? data.personal?.job_title ?? "";
  const fontFamily = language === "ar" ? "var(--font-cairo)" : "var(--font-sf-pro)";

  return (
    <article
      dir={dir}
      lang={language}
      style={{ ...A4, fontFamily }}
      className={`mx-auto p-12 text-[13px] leading-[1.7] ${surface}`}
    >
      <header className="mb-8">
        <p className="mb-2 font-mono text-xs" style={{ color: accent }} dir="ltr">
          $ whoami --resume
        </p>
        <h1 className="text-[28px] font-bold tracking-tight">{fullName || "—"}</h1>
        {jobTitle ? (
          <p className="mt-1 font-mono text-sm" style={{ color: accent }}>
            {`> ${jobTitle}`}
          </p>
        ) : null}
        <ContactStack
          data={data}
          language={language}
          className={`mt-4 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs ${muted}`}
        />
      </header>

      <div className="space-y-6">
        {sectionOrder.map((key) => {
          if (hidden.has(key)) return null;
          const Block = BLOCK_FOR_KEY_WITH_CHIPS[key];
          if (!Block) return null;
          return (
            <section key={key}>
              {key !== "personal" ? (
                <h2 className="mb-2 font-mono text-xs">
                  <span style={{ color: accent }} dir="ltr">
                    {"/*"}
                  </span>{" "}
                  <span className="font-semibold uppercase tracking-[0.18em]">
                    {sectionLabel(key, language)}
                  </span>{" "}
                  <span style={{ color: accent }} dir="ltr">
                    {"*/"}
                  </span>
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
