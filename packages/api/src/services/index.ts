/**
 * Typed clients for the AI and PDF FastAPI services.
 * Implementations land in subsequent tiers; placeholders below establish the
 * shared contract so the web/admin apps can import without circular changes.
 */

export interface AiServiceClient {
  rewriteBio(input: { resumeId: string; bio: string; tone?: string }): Promise<{ bio: string }>;
}

export interface PdfServiceClient {
  renderResume(input: { resumeId: string; format: "pdf" | "png" }): Promise<{ url: string }>;
}

export const AI_SERVICE_PATHS = {
  health: "/health",
  rewriteBio: "/v1/rewrite-bio",
} as const;

export const PDF_SERVICE_PATHS = {
  health: "/health",
  renderResume: "/v1/render",
} as const;
