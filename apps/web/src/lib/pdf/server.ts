/**
 * Server-side PDF service client. Used from API route handlers to forward
 * authenticated export requests to the FastAPI service. Never imported by
 * client components — it reads `PDF_SERVICE_INTERNAL_TOKEN` from the
 * server env.
 */

import "server-only";

const PDF_SERVICE_URL =
  process.env["PDF_SERVICE_URL"] ?? "http://localhost:8002";
const INTERNAL_TOKEN = process.env["PDF_SERVICE_INTERNAL_TOKEN"] ?? "";

export interface ExportPayload {
  user_id: string;
  plan: "free" | "prime" | "enterprise";
  resume_id: string;
  language: "ar" | "en";
  format: "pdf_single" | "pdf_multi" | "png";
  template_id?: string | null;
  primary_color?: string | null;
  mode?: "light" | "dark" | null;
}

export interface QuotaResult {
  plan: "free" | "prime" | "enterprise";
  unlimited: boolean;
  rate_limit: { limit: number; remaining: number; reset_at: number };
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (INTERNAL_TOKEN) headers["Authorization"] = `Bearer ${INTERNAL_TOKEN}`;
  return headers;
}

/**
 * POST to the export service and stream the binary back. The Next.js API
 * handler then forwards this stream to the browser unchanged so the file
 * never lives in process memory entirely.
 */
export async function exportFromService(
  endpoint: "pdf" | "png",
  payload: ExportPayload,
): Promise<Response> {
  const url = `${PDF_SERVICE_URL}/export/${endpoint}`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function fetchQuota(
  userId: string,
  plan: "free" | "prime" | "enterprise",
): Promise<QuotaResult | null> {
  const url = `${PDF_SERVICE_URL}/export/quota?user_id=${encodeURIComponent(
    userId,
  )}&plan=${encodeURIComponent(plan)}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as QuotaResult;
  } catch {
    return null;
  }
}

export function getPdfServiceConfig(): {
  url: string;
  internalToken: string;
  configured: boolean;
} {
  return {
    url: PDF_SERVICE_URL,
    internalToken: INTERNAL_TOKEN,
    configured: Boolean(INTERNAL_TOKEN),
  };
}
