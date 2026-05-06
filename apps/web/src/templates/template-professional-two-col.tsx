/**
 * template_professional_two_col (مجاني)
 * 35% sidebar (filled with accent) + 65% main column. Photo, contact, and
 * skills/languages sit on the sidebar; bio + experience + education on the
 * main side. Corporate-flavoured.
 */

import * as React from "react";

import { getHiddenFields, getSectionOrder, localized, resolveAccent, sectionLabel } from "./_data";
import { A4, ContactStack } from "./_atoms";
import { BLOCK_FOR_KEY_WITH_BARS } from "./_section-blocks";
import type { TemplateProps } from "./types";

const SIDEBAR_KEYS = new Set(["skills", "languages", "links", "hobbies", "address"]);
const MAIN_KEYS = new Set([
  "personal",
  "experience",
  "education",
  "courses",
  "projects",
  "references",
]);

export function TemplateProfessionalTwoCol({ data, language, theme }: TemplateProps) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = getSectionOrder(data);
  const hidden = getHiddenFields(data);
  const accent = resolveAccent(theme, "#1E3A8A");
  const local = localized(data.personal, language);
  const fullName = local["full_name"] ?? data.personal?.full_name ?? "";
  const jobTitle = local["job_title"] ?? data.personal?.job_title ?? "";
  const fontFamily = language === "ar" ? "var(--font-cairo)" : "var(--font-sf-pro)";

  const sidebar = sectionOrder.filter((k) => SIDEBAR_KEYS.has(k) && !hidden.has(k));
  const main = sectionOrder.filter((k) => MAIN_KEYS.has(k) && !hidden.has(k));
  const surfaceMain =
    theme.mode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-800";

  return (
    <article
      dir={dir}
      lang={language}
      style={{ ...A4, fontFamily }}
      className={`mx-auto grid grid-cols-[35%_65%] text-[12.5px] leading-[1.65] ${surfaceMain}`}
    >
      <aside className="flex flex-col gap-6 p-8 text-white" style={{ backgroundColor: accent }}>
        <div>
          <h1 className="text-2xl font-bold leading-tight">{fullName || "—"}</h1>
          {jobTitle ? <p className="mt-1 text-sm opacity-90">{jobTitle}</p> : null}
        </div>

        <div>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
            {language === "ar" ? "التواصل" : "Contact"}
          </h2>
          <ContactStack data={data} language={language} className="space-y-1 text-xs opacity-90" />
        </div>

        {sidebar.map((key) => {
          const Block = BLOCK_FOR_KEY_WITH_BARS[key];
          if (!Block) return null;
          return (
            <div key={key}>
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
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
                <h2
                  className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: accent }}
                >
                  {sectionLabel(key, language)}
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
