/**
 * template_tech_developer (مدفوع)
 *
 * Premium engineer-focused design — GitHub-dark code aesthetic with
 * monospace accents, terminal-style section headings, and JSON-like
 * contact metadata. Targets software engineers, developers, devops,
 * and data professionals.
 */

import * as React from "react";

import type { TemplateProps } from "./types";
import {
  FONT_STACKS,
  SKILL_LEVEL_DOTS,
  defaultName,
  fluencyLabel,
  fmtDate,
  getHidden,
  getSectionLabels,
  loc,
  pickFontStack,
  premiumSectionLabel,
  resolveAccent,
  sorted,
  vis,
} from "./_premium";

interface ColorScheme {
  bg: string;
  bg2: string;
  bg3: string;
  text: string;
  muted: string;
  border: string;
  green: string;
  yellow: string;
  purple: string;
  orange: string;
}

const DARK_COLORS: ColorScheme = {
  bg: "#0D1117",
  bg2: "#161B22",
  bg3: "#1F2937",
  text: "#E6EDF3",
  muted: "#8B949E",
  border: "#30363D",
  green: "#3FB950",
  yellow: "#D29922",
  purple: "#BC8CFF",
  orange: "#FFA657",
};

const LIGHT_COLORS: ColorScheme = {
  bg: "#FFFFFF",
  bg2: "#F6F8FA",
  bg3: "#EAEEF2",
  text: "#1F2328",
  muted: "#656D76",
  border: "#D0D7DE",
  green: "#1A7F37",
  yellow: "#9A6700",
  purple: "#8250DF",
  orange: "#BC4C00",
};

function Terminal({ text, color, mono }: { text: string; color: string; mono: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
      <span style={{ color: "#3FB950", fontFamily: mono, fontSize: 11 }}>❯</span>
      <span
        style={{
          fontFamily: mono,
          fontSize: 10,
          letterSpacing: "0.08em",
          fontWeight: 600,
          textTransform: "uppercase",
          color,
        }}
      >
        {text}
      </span>
      <div style={{ flex: 1, borderTop: `1px dashed ${color}30`, marginTop: 1 }} />
    </div>
  );
}

export function TemplateTechDeveloper({ data, language, theme }: TemplateProps) {
  const isRTL = language === "ar";
  const isDark = theme.mode === "dark";
  const accent = resolveAccent(theme, "#58A6FF");
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

  const personal = data.personal;
  const name = loc(personal, "full_name", language) || defaultName(language);
  const jobTitle = loc(personal, "job_title", language);
  const bio = loc(personal, "bio", language);

  const hidden = getHidden(data);
  const customLabels = getSectionLabels(data);

  const exp = sorted(vis(data.experience));
  const edu = sorted(vis(data.education));
  const skills = sorted(vis(data.skills));
  const langs = sorted(vis(data.languages));
  const courses = sorted(vis(data.courses));
  const projects = sorted(vis(data.projects));
  const refs = sorted(vis(data.references));
  const hobbies = sorted(vis(data.hobbies));

  const mono = FONT_STACKS.mono;
  const sans = pickFontStack(FONT_STACKS.sansClassic, language);

  const avatarUrl = personal?.avatar_path ?? null;
  const showAvatar = !!avatarUrl && !hidden.has("avatar");

  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        background: C.bg,
        color: C.text,
        fontFamily: sans,
        direction: isRTL ? "rtl" : "ltr",
        overflow: "hidden",
      }}
      className="mx-auto"
    >
      {/* Header */}
      <div
        style={{
          background: C.bg2,
          borderBottom: `1px solid ${C.border}`,
          padding: "28px 36px 22px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 24,
            flexDirection: isRTL ? "row-reverse" : "row",
          }}
        >
          {showAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl ?? undefined}
              alt={name}
              style={{
                width: 72,
                height: 72,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 8,
                background: C.bg3,
                border: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                color: accent,
                fontFamily: mono,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {name.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: mono, marginBottom: 4 }}>
              {!isRTL ? (
                <span style={{ color: C.yellow, fontSize: 22, fontWeight: 700 }}>{"{"}</span>
              ) : null}
              <span style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: "0 6px" }}>
                {name}
              </span>
              {!isRTL ? (
                <span style={{ color: C.yellow, fontSize: 22, fontWeight: 700 }}>{"}"}</span>
              ) : null}
            </div>
            {jobTitle ? (
              <div style={{ fontFamily: mono, fontSize: 12, color: C.green, marginBottom: 12 }}>
                {`// ${jobTitle}`}
              </div>
            ) : null}
            <div
              style={{
                fontFamily: mono,
                fontSize: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: "4px 20px",
                flexDirection: isRTL ? "row-reverse" : "row",
              }}
            >
              {personal?.email && !hidden.has("email") ? (
                <span>
                  <span style={{ color: C.purple }}>email</span>
                  <span style={{ color: C.muted }}>: </span>
                  <span style={{ color: C.orange }}>&quot;{personal.email}&quot;</span>
                </span>
              ) : null}
              {personal?.phone && !hidden.has("phone") ? (
                <span>
                  <span style={{ color: C.purple }}>phone</span>
                  <span style={{ color: C.muted }}>: </span>
                  <span style={{ color: C.orange }}>
                    &quot;{personal.phone_country_code ?? ""} {personal.phone}&quot;
                  </span>
                </span>
              ) : null}
              {personal?.city || personal?.country ? (
                <span>
                  <span style={{ color: C.purple }}>location</span>
                  <span style={{ color: C.muted }}>: </span>
                  <span style={{ color: C.orange }}>
                    &quot;{[personal?.city, personal?.country].filter(Boolean).join(", ")}&quot;
                  </span>
                </span>
              ) : null}
              {personal?.website ? (
                <span>
                  <span style={{ color: C.purple }}>url</span>
                  <span style={{ color: C.muted }}>: </span>
                  <span style={{ color: accent }}>&quot;{personal.website}&quot;</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: isRTL ? "row-reverse" : "row", flex: 1 }}>
        {/* Sidebar */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            background: C.bg2,
            borderRight: isRTL ? "none" : `1px solid ${C.border}`,
            borderLeft: isRTL ? `1px solid ${C.border}` : "none",
            padding: "24px 18px",
          }}
        >
          {skills.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <Terminal
                text={premiumSectionLabel("skills", language, customLabels)}
                color={accent}
                mono={mono}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {skills.map((skill) => {
                  const lv = SKILL_LEVEL_DOTS[skill.level ?? "intermediate"] ?? 2;
                  const high = lv >= 4;
                  return (
                    <span
                      key={skill.id}
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        background: high
                          ? isDark
                            ? "rgba(88,166,255,0.15)"
                            : "rgba(88,166,255,0.12)"
                          : C.bg3,
                        color: high ? accent : C.muted,
                        border: `1px solid ${high ? `${accent}40` : C.border}`,
                        borderRadius: 12,
                        fontFamily: mono,
                      }}
                    >
                      {skill.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {langs.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <Terminal
                text={premiumSectionLabel("languages", language, customLabels)}
                color={C.green}
                mono={mono}
              />
              {langs.map((lang) => {
                const pct =
                  (
                    {
                      beginner: 20,
                      limited: 40,
                      professional: 60,
                      full: 80,
                      native: 100,
                    } as Record<string, number>
                  )[lang.fluency ?? "professional"] ?? 60;
                return (
                  <div key={lang.id} style={{ marginBottom: 10 }}>
                    <div
                      style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}
                    >
                      <span style={{ fontSize: 11, color: C.text, fontWeight: 500 }}>
                        {lang.language_name}
                      </span>
                      <span style={{ fontSize: 9, color: C.muted, fontFamily: mono }}>
                        {fluencyLabel(lang.fluency, language)}
                      </span>
                    </div>
                    <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: C.green,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {edu.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <Terminal
                text={premiumSectionLabel("education", language, customLabels)}
                color={C.yellow}
                mono={mono}
              />
              {edu.map((row) => (
                <div key={row.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>
                    {loc(row, "institution", language)}
                  </div>
                  <div style={{ fontSize: 10, color: C.yellow, fontFamily: mono, marginTop: 2 }}>
                    {loc(row, "degree", language)}
                  </div>
                  {loc(row, "field_of_study", language) ? (
                    <div style={{ fontSize: 10, color: C.muted }}>
                      {loc(row, "field_of_study", language)}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 9, color: C.muted, fontFamily: mono, marginTop: 2 }}>
                    {fmtDate(row.end_date, language)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {hobbies.length > 0 ? (
            <div>
              <Terminal
                text={premiumSectionLabel("hobbies", language, customLabels)}
                color={C.purple}
                mono={mono}
              />
              {hobbies.map((hobby) => (
                <div key={hobby.id} style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>
                  <span style={{ color: C.muted, fontFamily: mono }}>- </span>
                  {loc(hobby, "name", language)}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: "24px 28px" }}>
          {bio ? (
            <div
              style={{
                marginBottom: 20,
                padding: "12px 14px",
                background: isDark ? "rgba(255,255,255,0.03)" : C.bg2,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                borderLeft: isRTL ? "none" : `3px solid ${accent}`,
                borderRight: isRTL ? `3px solid ${accent}` : "none",
              }}
            >
              <p style={{ fontSize: 12, lineHeight: 1.75, color: C.muted, margin: 0 }}>{bio}</p>
            </div>
          ) : null}

          {exp.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <Terminal
                text={premiumSectionLabel("experience", language, customLabels)}
                color={accent}
                mono={mono}
              />
              {exp.map((row, i) => (
                <div
                  key={row.id}
                  style={{
                    marginBottom: 18,
                    paddingBottom: 18,
                    borderBottom: i < exp.length - 1 ? `1px solid ${C.border}` : "none",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                        {loc(row, "job_title", language)}
                      </div>
                      <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 2 }}>
                        {`> ${loc(row, "company", language)}`}
                      </div>
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, flexShrink: 0 }}>
                      {fmtDate(row.start_date, language)} →{" "}
                      {row.is_current
                        ? language === "ar"
                          ? "الآن"
                          : "now"
                        : fmtDate(row.end_date, language)}
                    </div>
                  </div>
                  {loc(row, "description", language) ? (
                    <p
                      style={{
                        fontSize: 11.5,
                        lineHeight: 1.7,
                        color: C.muted,
                        margin: "8px 0 0",
                      }}
                    >
                      {loc(row, "description", language)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {projects.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <Terminal
                text={premiumSectionLabel("projects", language, customLabels)}
                color={C.purple}
                mono={mono}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {projects.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: "10px 12px",
                      background: C.bg2,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 4 }}>
                      {loc(row, "name", language)}
                      {row.url ? <span style={{ color: C.muted }}> ↗</span> : null}
                    </div>
                    {loc(row, "description", language) ? (
                      <p style={{ fontSize: 10.5, lineHeight: 1.6, color: C.muted, margin: 0 }}>
                        {loc(row, "description", language)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {courses.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <Terminal
                text={premiumSectionLabel("courses", language, customLabels)}
                color={C.orange}
                mono={mono}
              />
              {courses.map((row) => (
                <div
                  key={row.id}
                  style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}
                >
                  <div>
                    <span style={{ fontFamily: mono, color: C.orange, fontSize: 10 }}>✓ </span>
                    <span style={{ fontSize: 12, color: C.text }}>
                      {loc(row, "name", language)}
                    </span>
                    {loc(row, "institution", language) ? (
                      <span style={{ fontSize: 10, color: C.muted }}>
                        {" "}
                        — {loc(row, "institution", language)}
                      </span>
                    ) : null}
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 9, color: C.muted, flexShrink: 0 }}>
                    {fmtDate(row.end_date, language)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {refs.length > 0 ? (
            <div>
              <Terminal
                text={premiumSectionLabel("references", language, customLabels)}
                color={C.green}
                mono={mono}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {refs.map((row) => (
                  <div key={row.id} style={{ fontSize: 11 }}>
                    <div style={{ fontWeight: 700, color: C.text }}>
                      {loc(row, "name", language)}
                    </div>
                    {row.email ? (
                      <div style={{ color: C.muted, fontFamily: mono, fontSize: 10 }}>
                        {row.email}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
