"""FastAPI entrypoint for the Seerah AI service.

Exposes 7 endpoints under /ai/ plus a /health probe. All endpoints require
a service-to-service bearer token (`AI_SERVICE_INTERNAL_TOKEN`) issued by
the Next.js layer; per-user rate limits live in Upstash Redis.
"""

from __future__ import annotations

import logging

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import get_settings
from .routes import analyze, chat, enhance, generate, job_match, skills, smart_fill

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()

    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.0,
        )

    app = FastAPI(
        title="Seerah AI Service",
        version="0.1.0",
        description=(
            "OpenAI-powered resume engine: enhance text, generate sections, "
            "analyze resumes, smart-fill from PDF/image, suggest skills, "
            "improve for a job, and stream chat."
        ),
    )

    origins = [o.strip() for o in settings.cors_allow_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    if not settings.internal_token:
        logger.warning(
            "AI_SERVICE_INTERNAL_TOKEN is empty — auth is DISABLED. "
            "Acceptable in local dev only; never deploy this way."
        )
    if not settings.openai_api_key:
        logger.warning(
            "OPENAI_API_KEY is empty — every /ai/* call will return 502. "
            "Provide a key before exercising endpoints."
        )

    app.include_router(enhance.router)
    app.include_router(generate.router)
    app.include_router(analyze.router)
    app.include_router(smart_fill.router)
    app.include_router(skills.router)
    app.include_router(job_match.router)
    app.include_router(chat.router)

    @app.get("/health", response_model=HealthResponse, tags=["meta"])
    def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            service="seerah-ai",
            version="0.1.0",
            openai_configured=bool(settings.openai_api_key),
            redis_configured=bool(
                settings.upstash_redis_url and settings.upstash_redis_token
            ),
            auth_enabled=bool(settings.internal_token),
        )

    return app


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    openai_configured: bool
    redis_configured: bool
    auth_enabled: bool


app = create_app()
