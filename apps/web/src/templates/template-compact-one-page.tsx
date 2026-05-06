/**
 * template_compact_one_page (مدفوع)
 *
 * Premium high-density design — coloured header bar, two-column body
 * (main + secondary). Maximum information density on a single A4
 * page; auto-scales when content overflows in the in-editor preview.
 * Targets recruiters and high-throughput hiring funnels where one
 * page is the brief.
 */

"use client";

import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";

import type { TemplateProps } from "./types";
import {
  FONT_STACKS,
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

function CompactHeading({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, marginTop: 12 }}>
      <div style={{ width: 2, height: 12, background: accent, borderRadius: 1, flexShrink: 0 }} />
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: accent,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `${accent}30` }} />
    </div>
  );
}

export function TemplateCompactOnePage({ data, language, theme, isExport }: TemplateProps) {
  const isRTL = language === "ar";
  const isDark = theme.mode === "dark";
  const accent = resolveAccent(theme, "#1D4ED8");

  const bodyBg = isDark ? "#0F172A" : "#FFFFFF";
  const sidebarBg = isDark ? "#1E293B" : "#F1F5F9";
  const textPrimary = isDark ? "#E2E8F0" : "#0F172A";
  const textMuted = isDark ? "#94A3B8" : "#475569";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  const sans = pickFontStack(FONT_STACKS.jakarta, language);

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

  // Auto-scale on overflow in the editor preview only. The export route
  // disables this so the headless renderer captures the natural layout
  // (overflow then becomes the user's signal to trim content).
  //
  // The measurement must read scrollHeight at the *natural* (unscaled)
  // width, not at the compensated `100/scale%` width.  The previous
  // implementation read scrollHeight after the scale + width compensation
  // were applied, which made the measurement a function of the very state
  // it was trying to set:
  //   scale=1 (width 100%)         → scrollHeight=1300 → setScale(0.864)
  //   scale=0.864 (width 115.7%)   → scrollHeight=1080 → setScale(1)
  //   scale=1 (width 100%)         → scrollHeight=1300 → setScale(0.864)
  //   ... infinite oscillation, visible flicker, browser warns about
  //   "ResizeObserver loop completed with undelivered notifications".
  // Force-reset transform/width before reading scrollHeight, then commit
  // the new scale once.  Re-measurement is triggered by content/language
  // changes via the effect deps, not by our own layout side-effects.
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (isExport || !contentRef.current) return;
    const target = contentRef.current;
    const A4_HEIGHT_PX = 1123; // 297mm @ 96dpi

    const prevTransform = target.style.transform;
    const prevWidth = target.style.width;
    target.style.transform = "none";
    target.style.width = "100%";
    const naturalHeight = target.scrollHeight;
    target.style.transform = prevTransform;
    target.style.width = prevWidth;

    const next = naturalHeight > A4_HEIGHT_PX ? Math.max(0.78, A4_HEIGHT_PX / naturalHeight) : 1;
    setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
  }, [isExport, data, language]);

  return (
    <div
      style={{
        width: "210mm",
        height: "297mm",
        overflow: "hidden",
        background: bodyBg,
        fontFamily: sans,
        direction: isRTL ? "rtl" : "ltr",
      }}
      className="mx-auto"
    >
      <div
        ref={contentRef}
        style={{
          transformOrigin: "top left",
          transform: scale < 1 ? `scale(${scale})` : "none",
          width: scale < 1 ? `${100 / scale}%` : "100%",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: accent,
            padding: "18px 26px 16px",
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexDirection: isRTL ? "row-reverse" : "row",
          }}
        >
          {showAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl ?? undefined}
              alt={name}
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.5)",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                border: "2px solid rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                color: "#FFFFFF",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {name.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.15 }}>
              {name}
            </div>
            {jobTitle ? (
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.82)",
                  marginTop: 3,
                  fontWeight: 500,
                }}
              >
                {jobTitle}
              </div>
            ) : null}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.88)", flexShrink: 0 }}>
            {personal?.email && !hidden.has("email") ? (
              <div style={{ marginBottom: 3 }}>✉ {personal.email}</div>
            ) : null}
            {personal?.phone && !hidden.has("phone") ? (
              <div style={{ marginBottom: 3 }}>
                ☎ {personal.phone_country_code ?? ""} {personal.phone}
              </div>
            ) : null}
            {personal?.city || personal?.country ? (
              <div style={{ marginBottom: 3 }}>
                ◎ {[personal?.city, personal?.country].filter(Boolean).join(", ")}
              </div>
            ) : null}
            {personal?.website ? <div>⌘ {personal.website}</div> : null}
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flexDirection: isRTL ? "row-reverse" : "row", flex: 1 }}>
          {/* Main */}
          <div
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRight: isRTL ? "none" : `1px solid ${borderColor}`,
              borderLeft: isRTL ? `1px solid ${borderColor}` : "none",
            }}
          >
            {bio ? (
              <p style={{ fontSize: 11, lineHeight: 1.65, color: textMuted, margin: "0 0 10px" }}>
                {bio.length > 350 ? bio.slice(0, 347) + "…" : bio}
              </p>
            ) : null}

            {exp.length > 0 ? (
              <div>
                <CompactHeading
                  label={premiumSectionLabel("experience", language, customLabels)}
                  accent={accent}
                />
                {exp.map((row, i) => (
                  <div
                    key={row.id}
                    style={{
                      marginBottom: 10,
                      paddingBottom: i < exp.length - 1 ? 10 : 0,
                      borderBottom: i < exp.length - 1 ? `1px solid ${borderColor}` : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>
                          {loc(row, "job_title", language)}
                        </span>
                        <span style={{ color: textMuted, margin: "0 5px", fontSize: 11 }}>·</span>
                        <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>
                          {loc(row, "company", language)}
                        </span>
                      </div>
                      <div
                        style={{ fontSize: 9.5, color: textMuted, flexShrink: 0, marginLeft: 8 }}
                      >
                        {fmtDate(row.start_date, language)} –{" "}
                        {row.is_current ? presentLabel(language) : fmtDate(row.end_date, language)}
                      </div>
                    </div>
                    {loc(row, "description", language) ? (
                      <p
                        style={{
                          fontSize: 11,
                          lineHeight: 1.55,
                          color: textMuted,
                          margin: "4px 0 0",
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
              <div>
                <CompactHeading
                  label={premiumSectionLabel("projects", language, customLabels)}
                  accent={accent}
                />
                {projects.map((row) => (
                  <div key={row.id} style={{ marginBottom: 7 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: textPrimary }}>
                      {loc(row, "name", language)}
                    </span>
                    {row.url ? <span style={{ color: accent, fontSize: 10 }}> ↗</span> : null}
                    {loc(row, "description", language) ? (
                      <span style={{ fontSize: 10.5, color: textMuted }}>
                        {" "}
                        — {loc(row, "description", language)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {courses.length > 0 ? (
              <div>
                <CompactHeading
                  label={premiumSectionLabel("courses", language, customLabels)}
                  accent={accent}
                />
                {courses.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      marginBottom: 5,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 11, color: textPrimary, fontWeight: 600 }}>
                      {loc(row, "name", language)}
                      {loc(row, "institution", language) ? (
                        <span style={{ color: textMuted, fontWeight: 400 }}>
                          {" "}
                          — {loc(row, "institution", language)}
                        </span>
                      ) : null}
                    </span>
                    <span style={{ fontSize: 10, color: textMuted, flexShrink: 0 }}>
                      {fmtDate(row.end_date, language)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Secondary */}
          <div style={{ width: 272, flexShrink: 0, background: sidebarBg, padding: "14px 16px" }}>
            {edu.length > 0 ? (
              <div>
                <CompactHeading
                  label={premiumSectionLabel("education", language, customLabels)}
                  accent={accent}
                />
                {edu.map((row) => (
                  <div key={row.id} style={{ marginBottom: 9 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: textPrimary }}>
                      {loc(row, "institution", language)}
                    </div>
                    <div style={{ fontSize: 10.5, color: accent, fontWeight: 600 }}>
                      {[loc(row, "degree", language), loc(row, "field_of_study", language)]
                        .filter(Boolean)
                        .join(" — ")}
                    </div>
                    <div style={{ fontSize: 9.5, color: textMuted }}>
                      {fmtDate(row.end_date, language) || fmtDate(row.start_date, language)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {skills.length > 0 ? (
              <div>
                <CompactHeading
                  label={premiumSectionLabel("skills", language, customLabels)}
                  accent={accent}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {skills.map((skill) => (
                    <span
                      key={skill.id}
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                        color: textPrimary,
                        borderRadius: 4,
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {langs.length > 0 ? (
              <div>
                <CompactHeading
                  label={premiumSectionLabel("languages", language, customLabels)}
                  accent={accent}
                />
                {langs.map((lang) => (
                  <div
                    key={lang.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: textPrimary, fontWeight: 500 }}>
                      {lang.language_name}
                    </span>
                    <span style={{ color: textMuted, fontSize: 10 }}>
                      {fluencyLabel(lang.fluency, language)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {refs.length > 0 ? (
              <div>
                <CompactHeading
                  label={premiumSectionLabel("references", language, customLabels)}
                  accent={accent}
                />
                {refs.map((row) => (
                  <div key={row.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: textPrimary }}>
                      {loc(row, "name", language)}
                    </div>
                    {row.email ? (
                      <div style={{ fontSize: 10, color: textMuted }}>{row.email}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {hobbies.length > 0 ? (
              <div>
                <CompactHeading
                  label={premiumSectionLabel("hobbies", language, customLabels)}
                  accent={accent}
                />
                <p style={{ fontSize: 11, color: textMuted, margin: 0, lineHeight: 1.7 }}>
                  {hobbies.map((hobby) => loc(hobby, "name", language)).join(" · ")}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
