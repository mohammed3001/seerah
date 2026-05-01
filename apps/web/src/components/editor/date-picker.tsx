"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@seerah/ui";

interface Props {
  value: string | null;
  onChange: (next: string | null) => void;
  /** Disabled fully (e.g. when "current" toggle is on). */
  disabled?: boolean;
}

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function parseISO(value: string | null): { y: string; m: string; d: string } {
  if (!value) return { y: "", m: "", d: "" };
  const [y, m, d] = value.split("-");
  return { y: y ?? "", m: m ?? "", d: d ?? "" };
}

function buildISO(y: string, m: string, d: string): string | null {
  if (!y) return null;
  return `${y.padStart(4, "0")}-${(m || "01").padStart(2, "0")}-${(d || "01").padStart(2, "0")}`;
}

export function DateTriad({ value, onChange, disabled }: Props) {
  const { y, m, d } = parseISO(value);
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let yr = currentYear + 5; yr >= 1950; yr--) years.push(String(yr));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  function update(part: "y" | "m" | "d", v: string) {
    const next = { y, m, d, [part]: v };
    onChange(buildISO(next.y, next.m, next.d));
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select disabled={disabled} value={d} onValueChange={(v) => update("d", v)}>
        <SelectTrigger>
          <SelectValue placeholder="اليوم" />
        </SelectTrigger>
        <SelectContent>
          {days.map((day) => (
            <SelectItem key={day} value={day}>
              {day}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select disabled={disabled} value={m} onValueChange={(v) => update("m", v)}>
        <SelectTrigger>
          <SelectValue placeholder="الشهر" />
        </SelectTrigger>
        <SelectContent>
          {ARABIC_MONTHS.map((label, idx) => (
            <SelectItem key={label} value={String(idx + 1).padStart(2, "0")}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select disabled={disabled} value={y} onValueChange={(v) => update("y", v)}>
        <SelectTrigger>
          <SelectValue placeholder="السنة" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
