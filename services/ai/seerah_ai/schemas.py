"""Pydantic request and response models for AI endpoints.

Mirrors the contracts defined in the Phase 3 spec. Field names match the
shape consumed by `apps/web` so the Next.js server actions can serialize
arguments without any remapping.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Language = Literal["ar", "en"]
Plan = Literal["free", "prime", "enterprise"]
SkillLevel = Literal["beginner", "intermediate", "good", "advanced", "expert"]
LanguageFluency = Literal["beginner", "limited", "professional", "full", "native"]

FieldType = Literal[
    "bio",
    "job_title",
    "education_description",
    "experience_description",
    "course_description",
    "project_description",
    "reference_description",
    "hobby",
]

SectionType = Literal[
    "education",
    "experience",
    "courses",
    "projects",
    "references",
    "skills",
    "languages",
    "hobbies",
    "links",
]


class Caller(BaseModel):
    """Identifies the calling user for rate limiting and audit."""

    user_id: str
    plan: Plan = "free"


class ResumeContext(BaseModel):
    """A trimmed view of the active resume passed for context to the LLM."""

    title: str | None = None
    target_role: str | None = None
    industry: str | None = None
    summary_ar: str | None = None
    summary_en: str | None = None
    skills: list[str] = Field(default_factory=list)
    education_titles: list[str] = Field(default_factory=list)
    experience_titles: list[str] = Field(default_factory=list)


# ---------- /ai/enhance-text ------------------------------------------------


class EnhanceTextRequest(BaseModel):
    caller: Caller
    field_type: FieldType
    current_text: str = ""
    context: str | None = None
    language: Language = "ar"
    resume_context: ResumeContext | None = None


class EnhanceTextResponse(BaseModel):
    enhanced_ar: str
    enhanced_en: str
    suggestions: list[str] = Field(default_factory=list)


# ---------- /ai/generate-section --------------------------------------------


class GenerateSectionRequest(BaseModel):
    caller: Caller
    section_type: SectionType
    user_input_ar: str = ""
    user_input_en: str = ""
    resume_context: ResumeContext | None = None
    language: Language = "ar"


class SectionItem(BaseModel):
    """Generic section item — keys vary per section_type."""

    data: dict[str, Any]


class GenerateSectionResponse(BaseModel):
    generated_items: list[SectionItem]
    explanation: str = ""


# ---------- /ai/analyze-resume ----------------------------------------------


class AnalyzeResumeRequest(BaseModel):
    caller: Caller
    resume_data: dict[str, Any]
    language: Language = "ar"


class CompletionTip(BaseModel):
    section: str
    message: str
    severity: Literal["info", "warning", "critical"] = "info"


class AnalyzeResumeResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    completion_tips: list[CompletionTip]
    strengths: list[str]
    improvements: list[str]
    keyword_suggestions: list[str]
    ats_score: int = Field(ge=0, le=100)
    industry_insights: str


# ---------- /ai/smart-fill --------------------------------------------------


class SmartFillRequest(BaseModel):
    caller: Caller
    file_type: Literal["pdf", "image", "linkedin_url"]
    uploaded_file_base64: str | None = None
    linkedin_url: str | None = None
    language: Language = "ar"


class SmartFillResponse(BaseModel):
    extracted_data: dict[str, Any]
    confidence_scores: dict[str, float]
    notes: str = ""


# ---------- /ai/suggest-skills ----------------------------------------------


class SuggestSkillsRequest(BaseModel):
    caller: Caller
    job_title: str
    experience_descriptions: list[str] = Field(default_factory=list)
    language: Language = "ar"


class SuggestedSkill(BaseModel):
    name: str
    level: SkillLevel
    relevance: float = Field(ge=0.0, le=1.0)


class SuggestSkillsResponse(BaseModel):
    suggested_skills: list[SuggestedSkill]


# ---------- /ai/improve-for-job ---------------------------------------------


class ImproveForJobRequest(BaseModel):
    caller: Caller
    job_description: str
    resume_data: dict[str, Any]
    language: Language = "ar"


class JobImprovement(BaseModel):
    section: str
    suggestion: str


class ImproveForJobResponse(BaseModel):
    tailored_bio: str
    keyword_matches: list[str]
    missing_keywords: list[str]
    suggestions: list[JobImprovement]


# ---------- /ai/chat --------------------------------------------------------


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    caller: Caller
    messages: list[ChatMessage]
    resume_context: ResumeContext | None = None
    language: Language = "ar"


# ---------- Errors ----------------------------------------------------------


class RateLimitInfo(BaseModel):
    limit: int
    remaining: int
    reset_at: int  # unix timestamp seconds


class ErrorResponse(BaseModel):
    error: str
    message_ar: str
    message_en: str
    upgrade_required: bool = False
    rate_limit: RateLimitInfo | None = None
