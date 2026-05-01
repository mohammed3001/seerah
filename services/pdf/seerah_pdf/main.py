"""FastAPI entrypoint for the Seerah PDF service."""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from .config import get_settings

app = FastAPI(
    title="Seerah PDF Service",
    version="0.0.0",
    description="Resume PDF/PNG rendering via Puppeteer with WeasyPrint fallback.",
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    settings = get_settings()
    _ = settings
    return HealthResponse(status="ok", service="seerah-pdf", version="0.0.0")
