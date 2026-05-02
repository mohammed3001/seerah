"""FastAPI entrypoint for the Seerah PDF service."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from pydantic import BaseModel
from sentry_sdk.integrations.fastapi import FastApiIntegration

from .config import get_settings
from .renderer import get_renderer
from .routes.export import router as export_router

_logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.1,
        )
    # Warm-start Playwright so the first export doesn't pay the launch cost.
    try:
        await get_renderer().start()
    except Exception:  # noqa: BLE001 — log + degrade gracefully
        _logger.warning("playwright warm-start failed", exc_info=True)
    yield
    try:
        await get_renderer().stop()
    except Exception:  # noqa: BLE001
        _logger.warning("playwright shutdown failed", exc_info=True)


app = FastAPI(
    title="Seerah PDF Service",
    version="0.1.0",
    description="Resume PDF/PNG rendering via Playwright (headless Chromium).",
    lifespan=lifespan,
)

app.include_router(export_router)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    settings = get_settings()
    _ = settings
    return HealthResponse(status="ok", service="seerah-pdf", version="0.1.0")
