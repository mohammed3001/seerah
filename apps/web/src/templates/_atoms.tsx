/**
 * Stateless layout atoms shared across templates. Purely compositional —
 * each template is responsible for its own outer chrome.
 */

import * as React from "react";

import type { LoadedResume } from "@/lib/editor/load-resume";
import type { TemplateLanguage } from "./types";
import { localized } from "./_data";

export const A4: React.CSSProperties = {
  // The A4 width is hard-locked to 210mm so the export render exactly
  // matches the live preview at 100% zoom. Min height grows with content.
  width: "210mm",
  minHeight: "297mm",
};

export function ContactInline({
  data,
  language,
  className,
  separator = " · ",
}: {
  data: LoadedResume;
  language: TemplateLanguage;
  className?: string;
  separator?: string;
}) {
  const items = collectContact(data, language);
  if (items.length === 0) return null;
  return (
    <div className={className}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <span aria-hidden>{separator}</span> : null}
          <span dir={item.dir}>{item.text}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

export function ContactStack({
  data,
  language,
  className,
}: {
  data: LoadedResume;
  language: TemplateLanguage;
  className?: string;
}) {
  const items = collectContact(data, language);
  if (items.length === 0) return null;
  return (
    <ul className={className}>
      {items.map((item, i) => (
        <li key={i} dir={item.dir}>
          {item.text}
        </li>
      ))}
    </ul>
  );
}

interface ContactItem {
  text: string;
  dir: "ltr" | "rtl";
}

function collectContact(data: LoadedResume, language: TemplateLanguage): ContactItem[] {
  const items: ContactItem[] = [];
  const personal = data.personal;
  if (!personal) return items;
  if (personal.email) items.push({ text: personal.email, dir: "ltr" });
  if (personal.phone) {
    const phoneText = `${personal.phone_country_code ?? ""}${personal.phone}`.trim();
    if (phoneText) items.push({ text: phoneText, dir: "ltr" });
  }
  if (personal.website) items.push({ text: personal.website, dir: "ltr" });
  if (personal.city) items.push({ text: personal.city, dir: language === "ar" ? "rtl" : "ltr" });
  if (data.address) {
    const local = localized(data.address, language);
    const nat = local["national_address"] ?? data.address.national_address ?? null;
    if (nat) items.push({ text: nat, dir: language === "ar" ? "rtl" : "ltr" });
  }
  return items;
}

export function SectionHeading({
  children,
  className,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <h2
      className={className}
      style={accent ? { color: accent } : undefined}
    >
      {children}
    </h2>
  );
}
