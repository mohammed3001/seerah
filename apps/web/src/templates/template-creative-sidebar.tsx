/**
 * template_creative_sidebar (مدفوع)
 *
 * Premium creative design — bold gradient sidebar (purple → indigo by
 * default, palette-driven) with a clean white main column. Targets
 * design, marketing, media, and UX professionals where the gradient
 * sidebar acts as a subtle portfolio cue without overwhelming the body.
 */

import * as React from "react";

import type { TemplateProps } from "./types";
import {
  FONT_STACKS,
  FLUENCY_DOTS,
  SKILL_LEVEL_DOTS,
  darken,
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

function SidebarTitle({ label }: { label: string }) {
  return (
    <div style={{ marginBottom: 12, marginTop: 22 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          paddingBottom: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function MainTitle({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{ marginBottom: 14, marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 22, height: 2, background: accent, borderRadius: 1 }} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function Dots({ level }: { level: number }) {
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: i <= level ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
          }}
        />
      ))}
    </div>
  );
}

export function TemplateCreativeSidebar({ data, language, theme, isExport }: TemplateProps) {
  const isRTL = language === "ar";
  const isDark = theme.mode === "dark";
  const accent = resolveAccent(theme, "#6C3FC5");
  const accentDark = darken(accent, 25);

  const bodyBg = isDark ? "#1C1830" : "#FFFFFF";
  const textPrimary = isDark ? "#F0EDE8" : "#1A1625";
  const textMuted = isDark ? "#9B95A8" : "#6B6578";
  const borderColor = isDark ? "rgba(108,63,197,0.2)" : "rgba(108,63,197,0.12)";

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
  const hobbies = sorted(vis(data.hobbies));

  const sansFont = pickFontStack(FONT_STACKS.sansClassic, language);

  const avatarUrl = personal?.avatar_path ?? null;
  const showAvatar = !!avatarUrl && !hidden.has("avatar");

  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: sansFont,
        direction: isRTL ? "rtl" : "ltr",
        display: "flex",
        flexDirection: isRTL ? "row-reverse" : "row",
        background: bodyBg,
        color: textPrimary,
        overflow: "hidden",
      }}
      className="mx-auto"
    >
      {/* Sidebar */}
      <div
        style={{
          width: 230,
          flexShrink: 0,
          background: `linear-gradient(160deg, ${accent} 0%, ${accentDark} 100%)`,
          display: "flex",
          flexDirection: "column",
          padding: "36px 22px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: isRTL ? "auto" : -60,
            left: isRTL ? -60 : "auto",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            pointerEvents: "none",
          }}
        />

        <div style={{ textAlign: "center", marginBottom: 20, position: "relative" }}>
          {showAvatar ? (
            <div
              style={{
                width: 96,
                height: 96,
                margin: "0 auto",
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.4)",
                boxShadow: isExport ? "none" : "0 0 0 6px rgba(255,255,255,0.12)",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl ?? undefined}
                alt={name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                margin: "0 auto",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                border: "3px solid rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 700,
              }}
            >
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.3,
              marginBottom: 4,
            }}
          >
            {name}
          </div>
          {jobTitle ? (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
              {jobTitle}
            </div>
          ) : null}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.2)", margin: "14px 0" }} />

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
          {personal?.email && !hidden.has("email") ? (
            <div
              style={{
                marginBottom: 7,
                display: "flex",
                alignItems: "center",
                gap: 7,
                flexDirection: isRTL ? "row-reverse" : "row",
              }}
            >
              <span style={{ opacity: 0.7 }}>✉</span>
              <span style={{ wordBreak: "break-all" }}>{personal.email}</span>
            </div>
          ) : null}
          {personal?.phone && !hidden.has("phone") ? (
            <div
              style={{
                marginBottom: 7,
                display: "flex",
                alignItems: "center",
                gap: 7,
                flexDirection: isRTL ? "row-reverse" : "row",
              }}
            >
              <span style={{ opacity: 0.7 }}>☎</span>
              <span>
                {personal.phone_country_code ?? ""} {personal.phone}
              </span>
            </div>
          ) : null}
          {personal?.city || personal?.country ? (
            <div
              style={{
                marginBottom: 7,
                display: "flex",
                alignItems: "center",
                gap: 7,
                flexDirection: isRTL ? "row-reverse" : "row",
              }}
            >
              <span style={{ opacity: 0.7 }}>◎</span>
              <span>{[personal?.city, personal?.country].filter(Boolean).join(", ")}</span>
            </div>
          ) : null}
          {personal?.website ? (
            <div
              style={{
                marginBottom: 7,
                display: "flex",
                alignItems: "center",
                gap: 7,
                flexDirection: isRTL ? "row-reverse" : "row",
              }}
            >
              <span style={{ opacity: 0.7 }}>⌘</span>
              <span style={{ wordBreak: "break-all" }}>{personal.website}</span>
            </div>
          ) : null}
        </div>

        {skills.length > 0 ? (
          <div>
            <SidebarTitle label={premiumSectionLabel("skills", language, customLabels)} />
            {skills.map((skill) => (
              <div key={skill.id} style={{ marginBottom: 9 }}>
                <div style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 500 }}>{skill.name}</div>
                <Dots level={SKILL_LEVEL_DOTS[skill.level ?? "intermediate"] ?? 2} />
              </div>
            ))}
          </div>
        ) : null}

        {langs.length > 0 ? (
          <div>
            <SidebarTitle label={premiumSectionLabel("languages", language, customLabels)} />
            {langs.map((lang) => (
              <div key={lang.id} style={{ marginBottom: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 500 }}>
                    {lang.language_name}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
                    {fluencyLabel(lang.fluency, language)}
                  </span>
                </div>
                <Dots level={FLUENCY_DOTS[lang.fluency ?? "professional"] ?? 3} />
              </div>
            ))}
          </div>
        ) : null}

        {hobbies.length > 0 ? (
          <div>
            <SidebarTitle label={premiumSectionLabel("hobbies", language, customLabels)} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {hobbies.map((hobby) => (
                <span
                  key={hobby.id}
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    background: "rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.9)",
                    borderRadius: 20,
                  }}
                >
                  {loc(hobby, "name", language)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "32px 28px", minHeight: "297mm", overflow: "hidden" }}>
        {bio ? (
          <div
            style={{
              marginBottom: 18,
              padding: "14px 16px",
              background: isDark ? "rgba(108,63,197,0.1)" : "rgba(108,63,197,0.05)",
              borderRadius: 8,
              borderLeft: isRTL ? "none" : `3px solid ${accent}`,
              borderRight: isRTL ? `3px solid ${accent}` : "none",
            }}
          >
            <p style={{ fontSize: 12, lineHeight: 1.8, color: textMuted, margin: 0 }}>{bio}</p>
          </div>
        ) : null}

        {exp.length > 0 ? (
          <div style={{ marginBottom: 6 }}>
            <MainTitle
              label={premiumSectionLabel("experience", language, customLabels)}
              accent={accent}
            />
            {exp.map((row, i) => (
              <div
                key={row.id}
                style={{
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: i < exp.length - 1 ? `1px solid ${borderColor}` : "none",
                  position: "relative",
                  paddingLeft: isRTL ? 0 : 14,
                  paddingRight: isRTL ? 14 : 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: isRTL ? "auto" : 0,
                    right: isRTL ? 0 : "auto",
                    top: 5,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: accent,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                      {loc(row, "job_title", language)}
                    </div>
                    <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 2 }}>
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
                    style={{ fontSize: 11.5, lineHeight: 1.7, color: textMuted, margin: "6px 0 0" }}
                  >
                    {loc(row, "description", language)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {edu.length > 0 ? (
          <div style={{ marginBottom: 6 }}>
            <MainTitle
              label={premiumSectionLabel("education", language, customLabels)}
              accent={accent}
            />
            {edu.map((row, i) => (
              <div
                key={row.id}
                style={{
                  marginBottom: 14,
                  paddingBottom: i < edu.length - 1 ? 14 : 0,
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
                    <div style={{ fontSize: 11, color: accent, marginTop: 2 }}>
                      {[loc(row, "degree", language), loc(row, "field_of_study", language)]
                        .filter(Boolean)
                        .join(" — ")}
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
          <div style={{ marginBottom: 6 }}>
            <MainTitle
              label={premiumSectionLabel("courses", language, customLabels)}
              accent={accent}
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
            <MainTitle
              label={premiumSectionLabel("projects", language, customLabels)}
              accent={accent}
            />
            {projects.map((row) => (
              <div
                key={row.id}
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(108,63,197,0.03)",
                  borderRadius: 6,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>
                  {loc(row, "name", language)}
                  {row.url ? (
                    <span
                      style={{
                        color: accent,
                        marginRight: isRTL ? 0 : 4,
                        marginLeft: isRTL ? 4 : 0,
                      }}
                    >
                      ↗
                    </span>
                  ) : null}
                </div>
                {loc(row, "description", language) ? (
                  <p style={{ fontSize: 11, lineHeight: 1.65, color: textMuted, margin: 0 }}>
                    {loc(row, "description", language)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
