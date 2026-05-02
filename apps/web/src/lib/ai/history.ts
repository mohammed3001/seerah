"use client";

/**
 * localStorage-backed circular buffer for the last 5 AI generations per tab.
 * Keys are scoped per resume + tab so different resumes don't pollute each
 * other.
 */

const MAX_ENTRIES = 5;

export interface HistoryEntry {
  id: string;
  text: string;
  language: "ar" | "en";
  created_at: number;
  meta?: Record<string, string | number | undefined>;
}

function key(resumeId: string, scope: string): string {
  return `seerah.ai-history.${resumeId}.${scope}`;
}

export function loadHistory(resumeId: string, scope: string): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(resumeId, scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is HistoryEntry =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as HistoryEntry).id === "string" &&
      typeof (e as HistoryEntry).text === "string",
    );
  } catch {
    return [];
  }
}

export function pushHistory(
  resumeId: string,
  scope: string,
  entry: Omit<HistoryEntry, "id" | "created_at">,
): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  const next: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: Date.now(),
  };
  const previous = loadHistory(resumeId, scope);
  const updated = [next, ...previous].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(key(resumeId, scope), JSON.stringify(updated));
  } catch {
    // localStorage might be full or disabled; ignore.
  }
  return updated;
}

export function clearHistory(resumeId: string, scope: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(resumeId, scope));
  } catch {
    // ignore
  }
}
