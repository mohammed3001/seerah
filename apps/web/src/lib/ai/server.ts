/**
 * Server-side AI service client. Used from server actions and route handlers
 * to call the FastAPI service in `services/ai`. Never imported by client
 * components — it reads the internal token from the server-only env.
 */

import "server-only";

import type {
  AIErrorResponse,
  AIResult,
  AnalyzeResumeRequest,
  AnalyzeResumeResponse,
  EnhanceTextRequest,
  EnhanceTextResponse,
  GenerateSectionRequest,
  GenerateSectionResponse,
  ImproveForJobRequest,
  ImproveForJobResponse,
  RateLimitInfo,
  SmartFillRequest,
  SmartFillResponse,
  SuggestSkillsRequest,
  SuggestSkillsResponse,
} from "./types";

const AI_SERVICE_URL =
  process.env["AI_SERVICE_URL"] ?? "http://localhost:8001";
const INTERNAL_TOKEN = process.env["AI_SERVICE_INTERNAL_TOKEN"] ?? "";

export class AIServiceError extends Error {
  readonly status: number;
  readonly body: AIErrorResponse | null;

  constructor(status: number, body: AIErrorResponse | null, message: string) {
    super(message);
    this.name = "AIServiceError";
    this.status = status;
    this.body = body;
  }

  /** Extract a user-facing message in the caller's language. */
  message_for(language: "ar" | "en"): string {
    if (this.body) {
      return language === "ar" ? this.body.message_ar : this.body.message_en;
    }
    return this.message;
  }
}

function rateLimitFromHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get("X-RateLimit-Limit");
  const remaining = headers.get("X-RateLimit-Remaining");
  const reset = headers.get("X-RateLimit-Reset");
  if (!limit || !remaining || !reset) return null;
  return {
    limit: Number(limit),
    remaining: Number(remaining),
    reset_at: Number(reset),
  };
}

async function call<TRequest, TResponse>(
  path: string,
  body: TRequest,
): Promise<AIResult<TResponse>> {
  const url = `${AI_SERVICE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (INTERNAL_TOKEN) headers["Authorization"] = `Bearer ${INTERNAL_TOKEN}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      // Server-side fetch; no caching of AI mutations.
      cache: "no-store",
    });
  } catch (cause) {
    throw new AIServiceError(
      0,
      null,
      `AI service unreachable at ${url}: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  if (!response.ok) {
    let parsed: AIErrorResponse | null = null;
    try {
      const json = (await response.json()) as { detail?: AIErrorResponse } | AIErrorResponse;
      if (typeof json === "object" && json && "detail" in json && json.detail) {
        parsed = json.detail as AIErrorResponse;
      } else if (typeof json === "object" && json && "error" in json) {
        parsed = json as AIErrorResponse;
      }
    } catch {
      // ignore
    }
    throw new AIServiceError(
      response.status,
      parsed,
      `AI ${path} ${response.status}: ${parsed?.message_en ?? response.statusText}`,
    );
  }

  const data = (await response.json()) as TResponse;
  return { data, rate_limit: rateLimitFromHeaders(response.headers) };
}

export const aiServer = {
  enhanceText: (req: EnhanceTextRequest) =>
    call<EnhanceTextRequest, EnhanceTextResponse>("/ai/enhance-text", req),
  generateSection: (req: GenerateSectionRequest) =>
    call<GenerateSectionRequest, GenerateSectionResponse>(
      "/ai/generate-section",
      req,
    ),
  analyzeResume: (req: AnalyzeResumeRequest) =>
    call<AnalyzeResumeRequest, AnalyzeResumeResponse>("/ai/analyze-resume", req),
  smartFill: (req: SmartFillRequest) =>
    call<SmartFillRequest, SmartFillResponse>("/ai/smart-fill", req),
  suggestSkills: (req: SuggestSkillsRequest) =>
    call<SuggestSkillsRequest, SuggestSkillsResponse>("/ai/suggest-skills", req),
  improveForJob: (req: ImproveForJobRequest) =>
    call<ImproveForJobRequest, ImproveForJobResponse>("/ai/improve-for-job", req),
};

export function getAIServiceConfig(): {
  url: string;
  internalToken: string;
  configured: boolean;
} {
  return {
    url: AI_SERVICE_URL,
    internalToken: INTERNAL_TOKEN,
    configured: Boolean(INTERNAL_TOKEN),
  };
}
