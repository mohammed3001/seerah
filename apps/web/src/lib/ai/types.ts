/**
 * Shared types for the AI service. Mirrors the Pydantic schemas in
 * `services/ai/seerah_ai/schemas.py`. Keep these in lockstep with the backend.
 */

export type Language = "ar" | "en";

export type Plan = "free" | "prime" | "enterprise";

export interface Caller {
  user_id: string;
  plan: Plan;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset_at: number;
}

export type EnhanceFieldType =
  | "bio"
  | "job_title"
  | "education_description"
  | "experience_description"
  | "course_description"
  | "project_description"
  | "reference_description"
  | "hobby";

export interface EnhanceTextRequest {
  caller: Caller;
  field_type: EnhanceFieldType;
  current_text: string;
  context?: string | null;
  language: Language;
  resume_context?: Record<string, unknown> | null;
}

export interface EnhanceTextResponse {
  enhanced_ar: string;
  enhanced_en: string;
  suggestions: string[];
}

export type SectionType =
  | "education"
  | "experience"
  | "courses"
  | "projects"
  | "references"
  | "hobbies"
  | "skills"
  | "languages"
  | "links"
  | "address";

export interface SectionItem {
  data: Record<string, unknown>;
}

export interface GenerateSectionRequest {
  caller: Caller;
  section_type: SectionType;
  user_input_ar?: string | null;
  user_input_en?: string | null;
  resume_context?: Record<string, unknown> | null;
  language: Language;
}

export interface GenerateSectionResponse {
  generated_items: SectionItem[];
  explanation: string;
}

export interface CompletionTip {
  section: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

export interface AnalyzeResumeRequest {
  caller: Caller;
  resume_data: Record<string, unknown>;
  language: Language;
}

export interface AnalyzeResumeResponse {
  overall_score: number;
  completion_tips: CompletionTip[];
  strengths: string[];
  improvements: string[];
  keyword_suggestions: string[];
  ats_score: number;
  industry_insights: string;
}

export interface SmartFillRequest {
  caller: Caller;
  file_type: "pdf" | "image" | "linkedin_url";
  uploaded_file_base64?: string | null;
  linkedin_url?: string | null;
  language: Language;
}

export interface SmartFillResponse {
  extracted_data: Record<string, unknown>;
  confidence_scores: Record<string, number>;
  notes?: string | null;
}

export interface SuggestedSkill {
  name: string | { ar?: string; en?: string };
  level: "beginner" | "intermediate" | "advanced" | "expert" | "native";
  relevance: number;
}

export interface SuggestSkillsRequest {
  caller: Caller;
  job_title: string;
  experience_descriptions: string[];
  language: Language;
}

export interface SuggestSkillsResponse {
  suggested_skills: SuggestedSkill[];
}

export interface JobImprovement {
  section: string;
  suggestion: string;
}

export interface ImproveForJobRequest {
  caller: Caller;
  job_description: string;
  resume_data: Record<string, unknown>;
  language: Language;
}

export interface ImproveForJobResponse {
  tailored_bio: string;
  keyword_matches: string[];
  missing_keywords: string[];
  suggestions: JobImprovement[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  caller: Caller;
  messages: ChatMessage[];
  resume_context?: Record<string, unknown> | null;
  language: Language;
}

export interface AIErrorResponse {
  error: string;
  message_ar: string;
  message_en: string;
  upgrade_required: boolean;
  rate_limit: RateLimitInfo | null;
}

/** Wraps a successful AI response with rate-limit headers parsed from the response. */
export interface AIResult<T> {
  data: T;
  rate_limit: RateLimitInfo | null;
}
