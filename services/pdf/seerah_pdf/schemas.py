"""Pydantic models for the PDF service public surface."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ExportRequest(BaseModel):
    """Request body for POST /export/pdf and /export/png.

    The Next.js application authenticates the end user, looks up the resume
    in Supabase, and forwards a structured payload here. We intentionally
    do NOT trust the user_id from the request body for sensitive lookups —
    the resume_id alone identifies the document, the service-role Supabase
    fetch confirms ownership against the supplied user_id.
    """

    user_id: str = Field(..., description="Supabase auth.users.id of the requester.")
    plan: Literal["free", "prime", "enterprise"] = Field(default="free")
    resume_id: str = Field(..., description="resumes.id row to render.")
    language: Literal["ar", "en"] = Field(default="ar")
    format: Literal["pdf_single", "pdf_multi", "png"] = Field(default="pdf_multi")
    template_id: str | None = Field(default=None, description="Optional override.")
    primary_color: str | None = Field(default=None, description="Hex accent override.")
    mode: Literal["light", "dark"] | None = Field(default=None)


class RateLimitInfo(BaseModel):
    limit: int
    remaining: int
    reset_at: int


class ExportResponse(BaseModel):
    """Returned alongside the binary content via headers — the body is the file."""

    content_type: str
    rate_limit: RateLimitInfo


class QuotaResponse(BaseModel):
    plan: Literal["free", "prime", "enterprise"]
    rate_limit: RateLimitInfo
    unlimited: bool


class ErrorResponse(BaseModel):
    error: str
    error_en: str | None = None
    rate_limit: RateLimitInfo | None = None
