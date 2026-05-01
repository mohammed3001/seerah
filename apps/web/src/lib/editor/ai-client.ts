"use client";

export interface AiGenerateRequest {
  section: string;
  field: string | null;
  prompt: string;
  language: "ar" | "en";
}

export interface AiGenerateResponse {
  text: string;
  language: "ar" | "en";
  /** Approximate token usage if reported by upstream. */
  tokens?: number;
}

const AI_BASE_URL =
  process.env["NEXT_PUBLIC_AI_SERVICE_URL"] ?? "http://localhost:8001";

/**
 * Calls the FastAPI services/ai service. Falls back to a clear error when the
 * service is unreachable so the panel can offer the user a retry.
 */
export async function aiGenerate(req: AiGenerateRequest): Promise<AiGenerateResponse> {
  const res = await fetch(`${AI_BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI service ${res.status}: ${body || res.statusText}`);
  }
  return (await res.json()) as AiGenerateResponse;
}
