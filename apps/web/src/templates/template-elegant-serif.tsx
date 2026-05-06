/**
 * template_elegant_serif (مدفوع — جديد)
 *
 * Premium classical design — centered serif header, ornamental dividers,
 * cream background. Targets legal, medical, academic, and any role where
 * the candidate wants conservative, unmistakable formality.
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
} from "./_premium";

function OrnamentalHeading({
  label,
  accent,
  isRTL,
  serif,
}: {
  label: string;
  accent: string;
  isRTL: boolean;
  serif: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "22px 0 14px",
        flexDirection: isRTL ? "row-reverse" : "row",
      }}
    >
      <div style={{ flex: 1, height: 1, background: `${accent}40` }} />
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: accent,
          fontFamily: serif,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `${accent}40` }} />
    </div>
  );
}

export function TemplateElegantSerif({ data, language, theme }: TemplateProps) {
  const isRTL = language === "ar";
  const isDark = theme.mode === "dark";
  const accent = resolveAccent(theme, "#9F1239");

  const bodyBg = isDark ? "#1A1015" : "#FAFAF7";
  const textPrimary = isDark ? "#EDE8E4" : "#1C1916";
  const textMuted = isDark ? "#A89A90" : "#6B5A52";
  const borderColor = isDark ? `${accent}30` : `${accent}25`;

  const serif = pickFontStack(FONT_STACKS.serif, language);
  const sans = pickFontStack(FONT_STACKS.jost, language);

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

  const avatarUrl = personal?.avatar_path ?? null;
  const showAvatar = !!avatarUrl && !hidden.has("avatar");

  const headerMeta = [
    personal?.email && !hidden.has("email") ? personal.email : null,
    personal?.phone && !hidden.has("phone")
      ? `${personal.phone_country_code ?? ""} ${personal.phone}`.trim()
      : null,
    personal?.city || personal?.country
      ? [personal?.city, personal?.country].filter(Boolean).join(", ")
      : null,
    personal?.website ?? null,
  ].filter(Boolean) as string[];

  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        background: bodyBg,
        color: textPrimary,
        fontFamily: serif,
        direction: isRTL ? "rtl" : "ltr",
        padding: "48px 64px",
        boxSizing: "border-box",
      }}
      className="mx-auto"
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        {showAvatar ? (
          <div style={{ marginBottom: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl ?? undefined}
              alt={name}
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                border: `1.5px solid ${accent}`,
                objectFit: "cover",
              }}
            />
          </div>
        ) : null}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: textPrimary,
            letterSpacing: isRTL ? "0.02em" : "0.08em",
            lineHeight: 1.2,
            fontFamily: serif,
          }}
        >
          {name}
        </div>
        {jobTitle ? (
          <div
            style={{
              fontSize: 13,
              fontStyle: isRTL ? "normal" : "italic",
              color: accent,
              marginTop: 6,
              letterSpacing: "0.04em",
              fontFamily: serif,
            }}
          >
            {jobTitle}
          </div>
        ) : null}
        <div
          style={{
            margin: "14px auto",
            color: accent,
            fontSize: 13,
            letterSpacing: "0.3em",
            fontFamily: "Georgia, serif",
          }}
        >
          ── ◆ ──
        </div>
        <div
          style={{
            fontSize: 11,
            color: textMuted,
            fontFamily: sans,
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "0px 4px",
            flexDirection: isRTL ? "row-reverse" : "row",
          }}
        >
          {headerMeta.map((item, i) => (
            <React.Fragment key={`${item}-${i}`}>
              <span>{item}</span>
              {i < headerMeta.length - 1 ? (
                <span style={{ color: accent, margin: "0 6px" }}>·</span>
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: borderColor, margin: "16px 0" }} />

      {bio ? (
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.85,
            color: textMuted,
            textAlign: "justify",
            margin: "0 0 8px",
            fontFamily: serif,
          }}
        >
          {bio}
        </p>
      ) : null}

      {exp.length > 0 ? (
        <div>
          <OrnamentalHeading
            label={premiumSectionLabel("experience", language, customLabels)}
            accent={accent}
            isRTL={isRTL}
            serif={serif}
          />
          {exp.map((row, i) => (
            <div key={row.id} style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>
                    {loc(row, "job_title", language)}
                  </span>
                  <span style={{ color: textMuted, margin: "0 8px", fontSize: 12 }}>—</span>
                  <span
                    style={{
                      fontSize: 12,
                      color: accent,
                      fontStyle: isRTL ? "normal" : "italic",
                    }}
                  >
                    {loc(row, "company", language)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: textMuted, fontFamily: sans, flexShrink: 0 }}>
                  {fmtDate(row.start_date, language)} –{" "}
                  {row.is_current ? presentLabel(language) : fmtDate(row.end_date, language)}
                </div>
              </div>
              {loc(row, "description", language) ? (
                <p
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.8,
                    color: textMuted,
                    margin: "6px 0 0",
                    textAlign: "justify",
                  }}
                >
                  {loc(row, "description", language)}
                </p>
              ) : null}
              {i < exp.length - 1 ? (
                <div style={{ height: 1, background: borderColor, marginTop: 16 }} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {edu.length > 0 ? (
        <div>
          <OrnamentalHeading
            label={premiumSectionLabel("education", language, customLabels)}
            accent={accent}
            isRTL={isRTL}
            serif={serif}
          />
          {edu.map((row) => (
            <div key={row.id} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                    {loc(row, "institution", language)}
                  </span>
                  {loc(row, "degree", language) || loc(row, "field_of_study", language) ? (
                    <span
                      style={{
                        fontSize: 12,
                        color: accent,
                        fontStyle: isRTL ? "normal" : "italic",
                      }}
                    >
                      {" "}
                      —{" "}
                      {[loc(row, "degree", language), loc(row, "field_of_study", language)]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 11, color: textMuted, fontFamily: sans, flexShrink: 0 }}>
                  {fmtDate(row.end_date, language) || fmtDate(row.start_date, language)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {skills.length > 0 || langs.length > 0 ? (
        <div>
          <OrnamentalHeading
            label={`${premiumSectionLabel("skills", language, customLabels)}${
              langs.length > 0
                ? " · " + premiumSectionLabel("languages", language, customLabels)
                : ""
            }`}
            accent={accent}
            isRTL={isRTL}
            serif={serif}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: skills.length > 0 && langs.length > 0 ? "1fr 1fr" : "1fr",
              gap: 20,
            }}
          >
            {skills.length > 0 ? (
              <div>
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                      fontFamily: sans,
                    }}
                  >
                    <span style={{ fontSize: 12, color: textPrimary }}>{skill.name}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background:
                              i <= (SKILL_LEVEL_DOTS[skill.level ?? "intermediate"] ?? 2)
                                ? accent
                                : isDark
                                  ? "rgba(255,255,255,0.15)"
                                  : "rgba(0,0,0,0.12)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {langs.length > 0 ? (
              <div>
                {langs.map((lang) => (
                  <div
                    key={lang.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                      fontFamily: sans,
                    }}
                  >
                    <span style={{ fontSize: 12, color: textPrimary }}>{lang.language_name}</span>
                    <span style={{ fontSize: 11, color: textMuted, fontStyle: "italic" }}>
                      {fluencyLabel(lang.fluency, language)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {courses.length > 0 ? (
        <div>
          <OrnamentalHeading
            label={premiumSectionLabel("courses", language, customLabels)}
            accent={accent}
            isRTL={isRTL}
            serif={serif}
          />
          {courses.map((row) => (
            <div
              key={row.id}
              style={{
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: sans,
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: textPrimary, fontWeight: 600 }}>
                  {loc(row, "name", language)}
                </span>
                {loc(row, "institution", language) ? (
                  <span style={{ fontSize: 11, color: textMuted, fontStyle: "italic" }}>
                    {" "}
                    — {loc(row, "institution", language)}
                  </span>
                ) : null}
              </div>
              <span style={{ fontSize: 11, color: textMuted, flexShrink: 0 }}>
                {fmtDate(row.end_date, language)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {projects.length > 0 ? (
        <div>
          <OrnamentalHeading
            label={premiumSectionLabel("projects", language, customLabels)}
            accent={accent}
            isRTL={isRTL}
            serif={serif}
          />
          {projects.map((row) => (
            <div key={row.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>
                {loc(row, "name", language)}
              </div>
              {loc(row, "description", language) ? (
                <p
                  style={{
                    fontSize: 12,
                    lineHeight: 1.75,
                    color: textMuted,
                    margin: 0,
                    textAlign: "justify",
                    fontFamily: sans,
                  }}
                >
                  {loc(row, "description", language)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {refs.length > 0 ? (
        <div>
          <OrnamentalHeading
            label={premiumSectionLabel("references", language, customLabels)}
            accent={accent}
            isRTL={isRTL}
            serif={serif}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "10px 32px",
            }}
          >
            {refs.map((row) => (
              <div key={row.id} style={{ fontFamily: sans }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>
                  {loc(row, "name", language)}
                </div>
                {loc(row, "description", language) ? (
                  <div style={{ fontSize: 11, color: accent, fontStyle: "italic" }}>
                    {loc(row, "description", language)}
                  </div>
                ) : null}
                {row.email ? (
                  <div style={{ fontSize: 11, color: textMuted }}>{row.email}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hobbies.length > 0 ? (
        <div>
          <OrnamentalHeading
            label={premiumSectionLabel("hobbies", language, customLabels)}
            accent={accent}
            isRTL={isRTL}
            serif={serif}
          />
          <p style={{ fontSize: 12, color: textMuted, fontFamily: sans, margin: 0 }}>
            {hobbies.map((hobby, i) => (
              <React.Fragment key={hobby.id}>
                {loc(hobby, "name", language)}
                {i < hobbies.length - 1 ? <span style={{ color: accent }}> · </span> : null}
              </React.Fragment>
            ))}
          </p>
        </div>
      ) : null}

      <div style={{ textAlign: "center", marginTop: 32, color: `${accent}50`, fontSize: 12 }}>
        ── ◆ ──
      </div>
    </div>
  );
}
