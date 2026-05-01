"""FastAPI entrypoint for the Seerah AI service."""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from .config import get_settings

app = FastAPI(
    title="Seerah AI Service",
    version="0.0.0",
    description="Anthropic Claude integration for Seerah (rewrites, suggestions, ATS).",
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    """Liveness probe used by Railway / Inngest / uptime monitors."""
    settings = get_settings()
    _ = settings  # ensures env loads at boot
    return HealthResponse(status="ok", service="seerah-ai", version="0.0.0")
