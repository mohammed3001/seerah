/**
 * Section block renderers used by templates. Each block accepts the loaded
 * resume + language and returns either null (no visible items) or a
 * React.Fragment with the section content. Templates supply their own
 * heading + spacing — these helpers only concern themselves with the inner
 * markup so layout changes only happen in one place.
 */

import * as React from "react";

import type { LoadedResume } from "@/lib/editor/load-resume";
import type { SectionKey } from "@/lib/editor/sections";
import type { TemplateLanguage } from "./types";
import {
  fluency,
  formatDateRange,
  localized,
  skillLevel,
  SKILL_LEVEL_PCT,
} from "./_data";

interface BlockProps {
  data: LoadedResume;
  language: TemplateLanguage;
  /** Optional palette callbacks so templates can theme inner accents. */
  accent?: string;
  muted?: string;
}

export function PersonalBlock({ data, language }: BlockProps) {
  const local = localized(data.personal, language);
  const bio = local["bio"] ?? data.personal?.bio ?? "";
  if (!bio) return null;
  return <p className="whitespace-pre-line leading-relaxed">{bio}</p>;
}

export function EducationBlock({ data, language }: BlockProps) {
  const items = data.education.filter((e) => e.is_visible);
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map((row) => {
        const local = localized(row, language);
        const degree = local["degree"] ?? row.degree ?? "";
        const institution = local["institution"] ?? row.institution ?? "";
        const field = local["field_of_study"] ?? row.field_of_study ?? "";
        const description = local["description"] ?? row.description ?? "";
        const range = formatDateRange(row.start_date, row.end_date, false, language);
        return (
          <div key={row.id}>
            <p className="font-semibold">
              {[degree, institution].filter(Boolean).join(" — ")}
            </p>
            {field ? <p className="text-xs opacity-70">{field}</p> : null}
            {range ? (
              <p className="text-xs opacity-60" dir="ltr">
                {range}
              </p>
            ) : null}
            {description ? <p className="mt-1 text-sm">{description}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export function ExperienceBlock({ data, language }: BlockProps) {
  const items = data.experience.filter((e) => e.is_visible);
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map((row) => {
        const local = localized(row, language);
        const title = local["job_title"] ?? row.job_title ?? "";
        const company = local["company"] ?? row.company ?? "";
        const description = local["description"] ?? row.description ?? "";
        const range = formatDateRange(row.start_date, row.end_date, row.is_current, language);
        return (
          <div key={row.id}>
            <p className="font-semibold">
              {[title, company].filter(Boolean).join(" — ")}
            </p>
            {range ? (
              <p className="text-xs opacity-60" dir="ltr">
                {range}
              </p>
            ) : null}
            {description ? (
              <p className="mt-1 whitespace-pre-line text-sm">{description}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function CoursesBlock({ data, language }: BlockProps) {
  const items = data.courses.filter((c) => c.is_visible);
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((row) => {
        const local = localized(row, language);
        const name = local["name"] ?? row.name ?? "";
        const inst = local["institution"] ?? row.institution ?? "";
        const range = formatDateRange(row.start_date, row.end_date, row.is_current, language);
        return (
          <div key={row.id}>
            <p className="font-semibold">
              {name}
              {inst ? ` — ${inst}` : ""}
            </p>
            {range ? (
              <p className="text-xs opacity-60" dir="ltr">
                {range}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function SkillsBlockGrid({ data, language }: BlockProps) {
  const items = data.skills.filter((s) => s.is_visible);
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
      {items.map((s) => (
        <li key={s.id} className="flex items-center justify-between">
          <span>{s.name}</span>
          <span className="text-xs opacity-60">{skillLevel(s.level, language)}</span>
        </li>
      ))}
    </ul>
  );
}

export function SkillsBlockBars({ data, language, accent }: BlockProps) {
  const items = data.skills.filter((s) => s.is_visible);
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2.5 text-sm">
      {items.map((s) => {
        const pct = Math.round((SKILL_LEVEL_PCT[s.level ?? "intermediate"] ?? 0.4) * 100);
        return (
          <li key={s.id}>
            <div className="flex items-center justify-between">
              <span>{s.name}</span>
              <span className="text-xs opacity-60">{skillLevel(s.level, language)}</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-current/15">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: accent ?? "currentColor" }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SkillsBlockChips({ data, accent }: BlockProps) {
  const items = data.skills.filter((s) => s.is_visible);
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5 text-xs">
      {items.map((s) => (
        <li
          key={s.id}
          className="rounded-full border px-2.5 py-1"
          style={{ borderColor: accent ? `${accent}55` : "currentColor" }}
        >
          {s.name}
        </li>
      ))}
    </ul>
  );
}

export function ProjectsBlock({ data, language, accent }: BlockProps) {
  const items = data.projects.filter((p) => p.is_visible);
  if (items.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {items.map((row) => {
        const local = localized(row, language);
        const name = local["name"] ?? row.name ?? "";
        const description = local["description"] ?? row.description ?? "";
        return (
          <div key={row.id}>
            <p className="font-semibold">{name}</p>
            {row.url ? (
              <p className="text-xs" style={{ color: accent ?? "currentColor" }} dir="ltr">
                {row.url}
              </p>
            ) : null}
            {description ? <p className="mt-1 text-sm">{description}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export function ReferencesBlock({ data, language }: BlockProps) {
  const items = data.references.filter((r) => r.is_visible);
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((row) => {
        const local = localized(row, language);
        const name = local["name"] ?? row.name ?? "";
        return (
          <div key={row.id}>
            <p className="font-semibold">{name}</p>
            <p className="text-xs opacity-60" dir="ltr">
              {[row.email, row.phone].filter(Boolean).join(" · ")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function LanguagesBlock({ data, language }: BlockProps) {
  const items = data.languages.filter((l) => l.is_visible);
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm">
      {items.map((row) => (
        <li key={row.id} className="flex items-center justify-between">
          <span>{row.language_name}</span>
          <span className="text-xs opacity-60">{fluency(row.fluency, language)}</span>
        </li>
      ))}
    </ul>
  );
}

export function LinksBlock({ data, accent }: BlockProps) {
  const items = data.links.filter((l) => l.is_visible);
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm">
      {items.map((row) => (
        <li key={row.id}>
          <span className="opacity-60">{row.link_type}: </span>
          <span dir="ltr" style={{ color: accent ?? "currentColor" }}>
            {row.url}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function HobbiesBlock({ data, language }: BlockProps) {
  const items = data.hobbies.filter((h) => h.is_visible);
  if (items.length === 0) return null;
  const names = items
    .map((row) => {
      const local = localized(row, language);
      return local["name"] ?? row.name ?? "";
    })
    .filter(Boolean);
  if (names.length === 0) return null;
  return <p className="text-sm">{names.join(" · ")}</p>;
}

export function AddressBlock({ data, language }: BlockProps) {
  if (!data.address) return null;
  const local = localized(data.address, language);
  const text = local["national_address"] ?? data.address.national_address ?? "";
  if (!text) return null;
  return <p className="text-sm">{text}</p>;
}

export const BLOCK_FOR_KEY: Record<
  SectionKey,
  React.ComponentType<BlockProps>
> = {
  personal: PersonalBlock,
  education: EducationBlock,
  experience: ExperienceBlock,
  courses: CoursesBlock,
  skills: SkillsBlockGrid,
  projects: ProjectsBlock,
  references: ReferencesBlock,
  languages: LanguagesBlock,
  links: LinksBlock,
  hobbies: HobbiesBlock,
  address: AddressBlock,
};

/** Same as BLOCK_FOR_KEY but uses bar-style skill rendering. */
export const BLOCK_FOR_KEY_WITH_BARS: typeof BLOCK_FOR_KEY = {
  ...BLOCK_FOR_KEY,
  skills: SkillsBlockBars,
};

/** Same as BLOCK_FOR_KEY but uses chip-style skill rendering. */
export const BLOCK_FOR_KEY_WITH_CHIPS: typeof BLOCK_FOR_KEY = {
  ...BLOCK_FOR_KEY,
  skills: SkillsBlockChips,
};
