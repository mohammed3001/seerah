"use client";

import * as React from "react";

import type { LoadedResume } from "@/lib/editor/load-resume";
import { sectionByKey, type SectionKey } from "@/lib/editor/sections";

interface Props {
  data: LoadedResume;
  language: "ar" | "en";
}

/**
 * Lightweight client-side renderer of the resume that mirrors the
 * `template_clean_01` template. Real templates live in services/pdf and the
 * preview here is meant to give a faithful approximation in real time.
 */
export function PreviewRenderer({ data, language }: Props) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const sectionOrder = (data.resume.section_order as SectionKey[]) ?? [
    "personal",
    "education",
    "experience",
    "skills",
    "languages",
    "courses",
    "projects",
    "references",
    "hobbies",
    "links",
    "address",
  ];
  const hidden = new Set((data.resume.hidden_fields as string[]) ?? []);
  const personalLocale = (
    (data.personal?.[language] as Record<string, string> | undefined) ?? {}
  );

  return (
    <article
      dir={dir}
      lang={language}
      className="mx-auto min-h-[1000px] w-[210mm] rounded-card bg-white p-12 text-[13px] leading-[1.7] text-zinc-800 shadow-card-dark"
      style={{ fontFamily: language === "ar" ? "var(--font-cairo)" : "var(--font-sf-pro)" }}
    >
      <header className="mb-8 border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-bold text-zinc-900">
          {personalLocale.full_name ?? data.personal?.full_name ?? "—"}
        </h1>
        {personalLocale.job_title ?? data.personal?.job_title ? (
          <p className="mt-1 text-base text-zinc-500">
            {personalLocale.job_title ?? data.personal?.job_title}
          </p>
        ) : null}
        <ContactRow personal={data.personal} address={data.address} language={language} />
      </header>

      {sectionOrder.map((key) => {
        if (hidden.has(key)) return null;
        const meta = sectionByKey[key];
        if (!meta) return null;
        return (
          <Section key={key} title={meta.label}>
            <SectionBody sectionKey={key} data={data} language={language} />
          </Section>
        );
      })}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ContactRow({
  personal,
  address,
  language,
}: {
  personal: LoadedResume["personal"];
  address: LoadedResume["address"];
  language: "ar" | "en";
}) {
  if (!personal) return null;
  const items: string[] = [];
  if (personal.email) items.push(personal.email);
  if (personal.phone) items.push(`${personal.phone_country_code ?? ""}${personal.phone}`.trim());
  if (personal.website) items.push(personal.website);
  if (personal.city) items.push(personal.city);
  const localizedAddr = address ? ((address[language] as Record<string, string>) ?? {}) : {};
  const nat = address?.national_address ?? localizedAddr["national_address"];
  if (nat) items.push(nat);
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
      {items.map((item, i) => (
        <span key={i}>{item}</span>
      ))}
    </div>
  );
}

function SectionBody({
  sectionKey,
  data,
  language,
}: {
  sectionKey: SectionKey;
  data: LoadedResume;
  language: "ar" | "en";
}) {
  const lang = language;
  switch (sectionKey) {
    case "personal": {
      const localized = (data.personal?.[lang] as Record<string, string>) ?? {};
      const bio = localized.bio ?? data.personal?.bio;
      return bio ? <p className="text-zinc-700">{bio}</p> : null;
    }
    case "education":
      return (
        <>
          {data.education.filter((e) => e.is_visible).map((e) => {
            const l = (e[lang] as Record<string, string>) ?? {};
            return (
              <div key={e.id}>
                <p className="font-semibold text-zinc-900">
                  {l.degree ?? e.degree} — {l.institution ?? e.institution}
                </p>
                {l.field_of_study ?? e.field_of_study ? (
                  <p className="text-xs text-zinc-500">{l.field_of_study ?? e.field_of_study}</p>
                ) : null}
                <DateRange start={e.start_date} end={e.end_date} />
                {l.description ?? e.description ? (
                  <p className="mt-1 text-zinc-700">{l.description ?? e.description}</p>
                ) : null}
              </div>
            );
          })}
        </>
      );
    case "experience":
      return (
        <>
          {data.experience.filter((e) => e.is_visible).map((e) => {
            const l = (e[lang] as Record<string, string>) ?? {};
            return (
              <div key={e.id}>
                <p className="font-semibold text-zinc-900">
                  {l.job_title ?? e.job_title} — {l.company ?? e.company}
                </p>
                <DateRange start={e.start_date} end={e.end_date} current={e.is_current} />
                {l.description ?? e.description ? (
                  <p className="mt-1 whitespace-pre-line text-zinc-700">
                    {l.description ?? e.description}
                  </p>
                ) : null}
              </div>
            );
          })}
        </>
      );
    case "courses":
      return (
        <>
          {data.courses.filter((c) => c.is_visible).map((c) => {
            const l = (c[lang] as Record<string, string>) ?? {};
            return (
              <div key={c.id}>
                <p className="font-semibold text-zinc-900">
                  {l.name ?? c.name}
                  {(l.institution ?? c.institution) ? ` — ${l.institution ?? c.institution}` : ""}
                </p>
                <DateRange start={c.start_date} end={c.end_date} current={c.is_current} />
              </div>
            );
          })}
        </>
      );
    case "skills":
      return (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {data.skills.filter((s) => s.is_visible).map((s) => (
            <li key={s.id} className="flex items-center justify-between">
              <span>{s.name}</span>
              <span className="text-xs text-zinc-500">{skillLevelLabel(s.level)}</span>
            </li>
          ))}
        </ul>
      );
    case "projects":
      return (
        <>
          {data.projects.filter((p) => p.is_visible).map((p) => {
            const l = (p[lang] as Record<string, string>) ?? {};
            return (
              <div key={p.id}>
                <p className="font-semibold text-zinc-900">{l.name ?? p.name}</p>
                {p.url ? <p className="text-xs text-accent">{p.url}</p> : null}
                {l.description ?? p.description ? (
                  <p className="mt-1 text-zinc-700">{l.description ?? p.description}</p>
                ) : null}
              </div>
            );
          })}
        </>
      );
    case "references":
      return (
        <>
          {data.references.filter((r) => r.is_visible).map((r) => {
            const l = (r[lang] as Record<string, string>) ?? {};
            return (
              <div key={r.id}>
                <p className="font-semibold">{l.name ?? r.name}</p>
                <p className="text-xs text-zinc-500">
                  {[r.email, r.phone].filter(Boolean).join(" · ")}
                </p>
              </div>
            );
          })}
        </>
      );
    case "languages":
      return (
        <ul className="grid grid-cols-2 gap-1 text-sm">
          {data.languages.filter((l) => l.is_visible).map((l) => (
            <li key={l.id} className="flex justify-between">
              <span>{l.language_name}</span>
              <span className="text-xs text-zinc-500">{fluencyLabel(l.fluency)}</span>
            </li>
          ))}
        </ul>
      );
    case "links":
      return (
        <ul className="space-y-1 text-sm">
          {data.links.filter((l) => l.is_visible).map((l) => (
            <li key={l.id}>
              <span className="text-zinc-500">{l.link_type}: </span>
              <span className="text-accent" dir="ltr">
                {l.url}
              </span>
            </li>
          ))}
        </ul>
      );
    case "hobbies":
      return (
        <p className="text-sm text-zinc-700">
          {data.hobbies
            .filter((h) => h.is_visible)
            .map((h) => {
              const l = (h[lang] as Record<string, string>) ?? {};
              return l.name ?? h.name;
            })
            .filter(Boolean)
            .join(" · ")}
        </p>
      );
    case "address": {
      if (!data.address) return null;
      return <p className="text-sm text-zinc-700">{data.address.national_address}</p>;
    }
    default:
      return null;
  }
}

function DateRange({
  start,
  end,
  current,
}: {
  start: string | null;
  end: string | null;
  current?: boolean;
}) {
  if (!start && !end && !current) return null;
  const fmt = (s: string | null) => (s ? s.slice(0, 7) : "—");
  return (
    <p className="text-xs text-zinc-500">
      <span dir="ltr">
        {fmt(start)} – {current ? "حتى الآن" : fmt(end)}
      </span>
    </p>
  );
}

function skillLevelLabel(level: string | null | undefined): string {
  switch (level) {
    case "beginner":
      return "مبتدئ";
    case "intermediate":
      return "متوسط";
    case "good":
      return "جيد";
    case "advanced":
      return "متقدم";
    case "expert":
      return "خبير";
    default:
      return "";
  }
}
function fluencyLabel(fluency: string | null | undefined): string {
  switch (fluency) {
    case "beginner":
      return "مبتدئ";
    case "limited":
      return "محدود";
    case "professional":
      return "احترافي";
    case "full":
      return "كامل";
    case "native":
      return "اللغة الأم";
    default:
      return "";
  }
}
