"use server";

/**
 * Server actions that wrap the FastAPI AI service. Always pulls the caller
 * (user_id + plan) from the active Supabase session — clients never get to
 * supply their own caller info.
 */

import { AIServiceError, aiServer } from "./server";
import type {
  AIErrorResponse,
  AnalyzeResumeResponse,
  Caller,
  EnhanceFieldType,
  EnhanceTextResponse,
  GenerateSectionResponse,
  ImproveForJobResponse,
  Language,
  RateLimitInfo,
  SectionType,
  SmartFillResponse,
  SuggestSkillsResponse,
} from "./types";
import { getDashboardSession } from "@/lib/dashboard/get-session";

export interface ActionResult<T> {
  ok: true;
  data: T;
  rate_limit: RateLimitInfo | null;
}

export interface ActionFailure {
  ok: false;
  status: number;
  error: AIErrorResponse | { error: string; message_ar: string; message_en: string };
}

async function resolveCaller(): Promise<Caller> {
  const session = await getDashboardSession();
  return { user_id: session.userId, plan: session.profile.plan };
}

function toFailure(err: unknown): ActionFailure {
  if (err instanceof AIServiceError) {
    return {
      ok: false,
      status: err.status,
      error: err.body ?? {
        error: "upstream_unavailable",
        message_ar: "تعذّر الاتصال بخدمة الذكاء الاصطناعي. حاول مرة أخرى.",
        message_en: "AI service is unreachable. Please try again.",
      },
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    ok: false,
    status: 500,
    error: {
      error: "internal_error",
      message_ar: "حدث خطأ غير متوقع.",
      message_en: message,
    },
  };
}

export async function enhanceTextAction(input: {
  field_type: EnhanceFieldType;
  current_text: string;
  context?: string | null;
  language: Language;
  resume_context?: Record<string, unknown> | null;
}): Promise<ActionResult<EnhanceTextResponse> | ActionFailure> {
  // Auth resolution must run outside try/catch — getDashboardSession() may
  // call Next's redirect(), which works by throwing a NEXT_REDIRECT error.
  // Catching it here would silently turn the redirect into a generic 500.
  const caller = await resolveCaller();
  try {
    const { data, rate_limit } = await aiServer.enhanceText({ caller, ...input });
    return { ok: true, data, rate_limit };
  } catch (err) {
    return toFailure(err);
  }
}

export async function generateSectionAction(input: {
  section_type: SectionType;
  user_input_ar?: string | null;
  user_input_en?: string | null;
  resume_context?: Record<string, unknown> | null;
  language: Language;
}): Promise<ActionResult<GenerateSectionResponse> | ActionFailure> {
  const caller = await resolveCaller();
  try {
    const { data, rate_limit } = await aiServer.generateSection({
      caller,
      ...input,
    });
    return { ok: true, data, rate_limit };
  } catch (err) {
    return toFailure(err);
  }
}

export async function analyzeResumeAction(input: {
  resume_data: Record<string, unknown>;
  language: Language;
}): Promise<ActionResult<AnalyzeResumeResponse> | ActionFailure> {
  const caller = await resolveCaller();
  try {
    const { data, rate_limit } = await aiServer.analyzeResume({ caller, ...input });
    return { ok: true, data, rate_limit };
  } catch (err) {
    return toFailure(err);
  }
}

export async function smartFillAction(input: {
  file_type: "pdf" | "image" | "linkedin_url";
  uploaded_file_base64?: string | null;
  linkedin_url?: string | null;
  language: Language;
}): Promise<ActionResult<SmartFillResponse> | ActionFailure> {
  const caller = await resolveCaller();
  try {
    const { data, rate_limit } = await aiServer.smartFill({ caller, ...input });
    return { ok: true, data, rate_limit };
  } catch (err) {
    return toFailure(err);
  }
}

export async function suggestSkillsAction(input: {
  job_title: string;
  experience_descriptions: string[];
  language: Language;
}): Promise<ActionResult<SuggestSkillsResponse> | ActionFailure> {
  const caller = await resolveCaller();
  try {
    const { data, rate_limit } = await aiServer.suggestSkills({ caller, ...input });
    return { ok: true, data, rate_limit };
  } catch (err) {
    return toFailure(err);
  }
}

export async function improveForJobAction(input: {
  job_description: string;
  resume_data: Record<string, unknown>;
  language: Language;
}): Promise<ActionResult<ImproveForJobResponse> | ActionFailure> {
  const caller = await resolveCaller();
  try {
    const { data, rate_limit } = await aiServer.improveForJob({ caller, ...input });
    return { ok: true, data, rate_limit };
  } catch (err) {
    return toFailure(err);
  }
}
