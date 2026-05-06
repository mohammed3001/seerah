/**
 * template_executive_dark (مدفوع)
 *
 * Premium executive design — deep navy header band with gold rule,
 * two-column body (light cream sidebar + main content). Targets
 * management, executive, finance, and legal roles where conservative
 * typography and high contrast read as authority.
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
  presentLabel,
  resolveAccent,
  sorted,
  vis,
  FLUENCY_DOTS,
} from "./_premium";

interface SectionHeadingProps {
  label: string;
  gold: string;
  isDark: boolean;
}

function SectionHeading({ label, gold, isDark }: SectionHeadingProps) {
  return (
    <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 3, height: 18, background: gold, borderRadius: 2, flexShrink: 0 }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: isDark ? "#C9A84C" : "#8B6914",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: isDark ? "rgba(201,168,76,0.2)" : "rgba(139,105,20,0.15)",
        }}
      />
    </div>
  );
}

function SkillBar({ level, gold, isDark }: { level: number; gold: string; isDark: boolean }) {
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 20,
            height: 4,
            borderRadius: 2,
            background: i <= level ? gold : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          }}
        />
      ))}
    </div>
  );
}

export function TemplateExecutiveDark({ data, language, theme }: TemplateProps) {
  const isRTL = language === "ar";
  const isDark = theme.mode === "dark";
  const gold = resolveAccent(theme, "#C9A84C");
  const headerBg = "#12172B";
  const bodyBg = isDark ? "#1A1F35" : "#FFFFFF";
  const sidebarBg = isDark ? "#141929" : "#F8F6F0";
  const textPrimary = isDark ? "#F0EDE4" : "#1A1410";
  const textMuted = isDark ? "#9A8E7A" : "#6B5E4A";
  const borderColor = isDark ? "rgba(201,168,76,0.15)" : "rgba(139,105,20,0.12)";

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

  const fontFamily = pickFontStack(FONT_STACKS.serif, language);
  const metaFont = pickFontStack(FONT_STACKS.display, language);

  const avatarUrl = personal?.avatar_path ?? null;
  const showAvatar = !!avatarUrl && !hidden.has("avatar");

  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily,
        direction: isRTL ? "rtl" : "ltr",
        background: bodyBg,
        color: textPrimary,
        overflow: "hidden",
      }}
      className="mx-auto"
    >
      {/* Header */}
      <div
        style={{
          background: headerBg,
          padding: "36px 40px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: gold }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 28,
            flexDirection: isRTL ? "row-reverse" : "row",
          }}
        >
          {showAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl ?? undefined}
              alt={name}
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                border: `2.5px solid ${gold}`,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : null}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.15 }}>
              {name}
            </div>
            {jobTitle ? (
              <div
                style={{
                  fontSize: 13,
                  color: gold,
                  marginTop: 5,
                  letterSpacing: isRTL ? 0 : "0.12em",
                  textTransform: isRTL ? "none" : "uppercase",
                  fontFamily: metaFont,
                  fontWeight: 500,
                }}
              >
                {jobTitle}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                gap: 20,
                marginTop: 12,
                flexWrap: "wrap",
                flexDirection: isRTL ? "row-reverse" : "row",
              }}
            >
              {personal?.email && !hidden.has("email") ? (
                <span
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: metaFont }}
                >
                  ✉ {personal.email}
                </span>
              ) : null}
              {personal?.phone && !hidden.has("phone") ? (
                <span
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: metaFont }}
                >
                  ☎ {personal.phone_country_code ?? ""} {personal.phone}
                </span>
              ) : null}
              {personal?.city || personal?.country ? (
                <span
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: metaFont }}
                >
                  ◎ {[personal.city, personal.country].filter(Boolean).join(", ")}
                </span>
              ) : null}
              {personal?.website ? (
                <span
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: metaFont }}
                >
                  ⌘ {personal.website}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          display: "flex",
          flexDirection: isRTL ? "row-reverse" : "row",
          minHeight: "calc(297mm - 164px)",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 228,
            flexShrink: 0,
            background: sidebarBg,
            borderRight: isRTL ? "none" : `1px solid ${borderColor}`,
            borderLeft: isRTL ? `1px solid ${borderColor}` : "none",
            padding: "28px 22px",
          }}
        >
          {skills.length > 0 ? (
            <div style={{ marginBottom: 26 }}>
              <SectionHeading
                label={premiumSectionLabel("skills", language, customLabels)}
                gold={gold}
                isDark={isDark}
              />
              {skills.map((skill) => (
                <div key={skill.id} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>
                    {skill.name}
                  </div>
                  <SkillBar
                    level={SKILL_LEVEL_DOTS[skill.level ?? "intermediate"] ?? 2}
                    gold={gold}
                    isDark={isDark}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {langs.length > 0 ? (
            <div style={{ marginBottom: 26 }}>
              <SectionHeading
                label={premiumSectionLabel("languages", language, customLabels)}
                gold={gold}
                isDark={isDark}
              />
              {langs.map((lang) => (
                <div key={lang.id} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>
                      {lang.language_name}
                    </span>
                    <span style={{ fontSize: 10, color: textMuted }}>
                      {fluencyLabel(lang.fluency, language)}
                    </span>
                  </div>
                  <SkillBar
                    level={FLUENCY_DOTS[lang.fluency ?? "professional"] ?? 3}
                    gold={gold}
                    isDark={isDark}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {hobbies.length > 0 ? (
            <div style={{ marginBottom: 26 }}>
              <SectionHeading
                label={premiumSectionLabel("hobbies", language, customLabels)}
                gold={gold}
                isDark={isDark}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {hobbies.map((hobby) => (
                  <span
                    key={hobby.id}
                    style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      border: `1px solid ${gold}`,
                      color: textMuted,
                      borderRadius: 3,
                      background: isDark ? "rgba(201,168,76,0.08)" : "rgba(139,105,20,0.06)",
                    }}
                  >
                    {loc(hobby, "name", language)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {refs.length > 0 ? (
            <div>
              <SectionHeading
                label={premiumSectionLabel("references", language, customLabels)}
                gold={gold}
                isDark={isDark}
              />
              {refs.map((ref) => (
                <div key={ref.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>
                    {loc(ref, "name", language)}
                  </div>
                  {ref.email ? (
                    <div style={{ fontSize: 10, color: textMuted }}>{ref.email}</div>
                  ) : null}
                  {ref.phone ? (
                    <div style={{ fontSize: 10, color: textMuted }}>{ref.phone}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: "28px 32px" }}>
          {bio ? (
            <div
              style={{
                marginBottom: 26,
                paddingBottom: 22,
                borderBottom: `1px solid ${borderColor}`,
              }}
            >
              <p style={{ fontSize: 13, lineHeight: 1.75, color: textMuted, margin: 0 }}>{bio}</p>
            </div>
          ) : null}

          {exp.length > 0 ? (
            <div style={{ marginBottom: 26 }}>
              <SectionHeading
                label={premiumSectionLabel("experience", language, customLabels)}
                gold={gold}
                isDark={isDark}
              />
              {exp.map((row, i) => (
                <div
                  key={row.id}
                  style={{
                    marginBottom: 18,
                    paddingBottom: i < exp.length - 1 ? 18 : 0,
                    borderBottom: i < exp.length - 1 ? `1px solid ${borderColor}` : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>
                        {loc(row, "job_title", language)}
                      </div>
                      <div style={{ fontSize: 12, color: gold, fontWeight: 600, marginTop: 2 }}>
                        {loc(row, "company", language)}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: textMuted, flexShrink: 0 }}>
                      {fmtDate(row.start_date, language)} —{" "}
                      {row.is_current ? presentLabel(language) : fmtDate(row.end_date, language)}
                    </div>
                  </div>
                  {loc(row, "description", language) ? (
                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.65,
                        color: textMuted,
                        margin: "6px 0 0",
                      }}
                    >
                      {loc(row, "description", language)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {edu.length > 0 ? (
            <div style={{ marginBottom: 26 }}>
              <SectionHeading
                label={premiumSectionLabel("education", language, customLabels)}
                gold={gold}
                isDark={isDark}
              />
              {edu.map((row, i) => (
                <div
                  key={row.id}
                  style={{
                    marginBottom: 16,
                    paddingBottom: i < edu.length - 1 ? 16 : 0,
                    borderBottom: i < edu.length - 1 ? `1px solid ${borderColor}` : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                        {loc(row, "institution", language)}
                      </div>
                      <div style={{ fontSize: 11, color: gold, marginTop: 2 }}>
                        {loc(row, "degree", language)}
                        {loc(row, "field_of_study", language)
                          ? ` — ${loc(row, "field_of_study", language)}`
                          : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: textMuted, flexShrink: 0 }}>
                      {fmtDate(row.end_date, language) || fmtDate(row.start_date, language)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {courses.length > 0 ? (
            <div style={{ marginBottom: 26 }}>
              <SectionHeading
                label={premiumSectionLabel("courses", language, customLabels)}
                gold={gold}
                isDark={isDark}
              />
              {courses.map((row) => (
                <div
                  key={row.id}
                  style={{ marginBottom: 10, display: "flex", justifyContent: "space-between" }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>
                      {loc(row, "name", language)}
                    </div>
                    {loc(row, "institution", language) ? (
                      <div style={{ fontSize: 11, color: textMuted }}>
                        {loc(row, "institution", language)}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 10, color: textMuted, flexShrink: 0 }}>
                    {fmtDate(row.end_date, language)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {projects.length > 0 ? (
            <div>
              <SectionHeading
                label={premiumSectionLabel("projects", language, customLabels)}
                gold={gold}
                isDark={isDark}
              />
              {projects.map((row) => (
                <div key={row.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                    {loc(row, "name", language)}
                    {row.url ? (
                      <span
                        style={{
                          fontSize: 10,
                          color: gold,
                          marginRight: isRTL ? 0 : 6,
                          marginLeft: isRTL ? 6 : 0,
                        }}
                      >
                        ↗
                      </span>
                    ) : null}
                  </div>
                  {loc(row, "description", language) ? (
                    <p
                      style={{ fontSize: 12, lineHeight: 1.6, color: textMuted, margin: "4px 0 0" }}
                    >
                      {loc(row, "description", language)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ height: 3, background: gold }} />
    </div>
  );
}
