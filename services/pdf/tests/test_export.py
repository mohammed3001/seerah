"""Tests for the export endpoints."""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from typing import Any
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from seerah_pdf.main import app
from seerah_pdf.rate_limiter import RateLimitResult, get_rate_limiter
from seerah_pdf.renderer import RenderResult, get_renderer
from seerah_pdf.routes.export import router as export_router


@asynccontextmanager
async def _noop_lifespan(_app: Any) -> AsyncIterator[None]:
    yield


@pytest.fixture(autouse=True)
def _disable_lifespan(monkeypatch: pytest.MonkeyPatch) -> None:
    """The real lifespan starts Playwright; bypass it for unit tests."""
    monkeypatch.setattr(app.router, "lifespan_context", _noop_lifespan)


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_overrides() -> Iterator[None]:
    yield
    app.dependency_overrides.clear()
    # Drop the auth guard from the router so tests can hit endpoints
    # without setting PDF_SERVICE_INTERNAL_TOKEN.
    export_router.dependencies.clear()


def _override_limiter(allowed: bool = True, remaining: int = 4, limit: int = 5) -> AsyncMock:
    limiter = AsyncMock()
    limiter.check_and_record.return_value = RateLimitResult(
        allowed=allowed,
        limit=limit,
        remaining=remaining,
        reset_at=1_700_000_000,
    )
    limiter.peek.return_value = RateLimitResult(
        allowed=remaining > 0,
        limit=limit,
        remaining=remaining,
        reset_at=1_700_000_000,
    )
    app.dependency_overrides[get_rate_limiter] = lambda: limiter
    return limiter


def _override_renderer(content: bytes = b"%PDF-1.4 fake", content_type: str = "application/pdf",
                       extension: str = "pdf") -> AsyncMock:
    renderer = AsyncMock()
    renderer.render.return_value = RenderResult(
        content=content,
        content_type=content_type,
        extension=extension,
    )
    app.dependency_overrides[get_renderer] = lambda: renderer
    return renderer


def _override_owner(returns: bool = True) -> None:
    from seerah_pdf.routes import export as export_module

    async def _owner(_resume_id: str, _user_id: str) -> bool:
        return returns

    export_module.assert_resume_owner = _owner  # type: ignore[assignment]


def test_health(client: TestClient) -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["service"] == "seerah-pdf"


def test_export_pdf_returns_binary_with_rate_limit_headers(client: TestClient) -> None:
    _override_limiter()
    _override_renderer()
    _override_owner()

    res = client.post(
        "/export/pdf",
        json={
            "user_id": "u-1",
            "plan": "free",
            "resume_id": "r-1",
            "language": "ar",
            "format": "pdf_multi",
        },
    )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("application/pdf")
    assert res.headers["x-ratelimit-limit"] == "5"
    assert res.headers["x-ratelimit-remaining"] == "4"
    assert "filename=" in res.headers["content-disposition"]
    assert res.content.startswith(b"%PDF-")


def test_export_pdf_rejects_png_format(client: TestClient) -> None:
    _override_limiter()
    _override_renderer()
    _override_owner()

    res = client.post(
        "/export/pdf",
        json={
            "user_id": "u-1",
            "plan": "free",
            "resume_id": "r-1",
            "language": "ar",
            "format": "png",
        },
    )
    assert res.status_code == 400


def test_export_png_returns_image(client: TestClient) -> None:
    _override_limiter()
    _override_renderer(content=b"\x89PNG\r\n\x1a\nfake", content_type="image/png", extension="png")
    _override_owner()

    res = client.post(
        "/export/png",
        json={
            "user_id": "u-1",
            "plan": "free",
            "resume_id": "r-1",
            "language": "en",
            "format": "png",
        },
    )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/png")


def test_export_returns_429_when_rate_limited(client: TestClient) -> None:
    _override_limiter(allowed=False, remaining=0, limit=5)
    _override_renderer()
    _override_owner()

    res = client.post(
        "/export/pdf",
        json={
            "user_id": "u-1",
            "plan": "free",
            "resume_id": "r-1",
            "language": "ar",
            "format": "pdf_multi",
        },
    )
    assert res.status_code == 429
    payload = res.json()
    assert payload["rate_limit"]["limit"] == 5
    assert payload["rate_limit"]["remaining"] == 0
    assert "Daily export limit" in payload["error_en"]


def test_export_returns_404_when_caller_does_not_own_resume(client: TestClient) -> None:
    _override_limiter()
    _override_renderer()
    _override_owner(returns=False)

    res = client.post(
        "/export/pdf",
        json={
            "user_id": "u-1",
            "plan": "free",
            "resume_id": "r-1",
            "language": "ar",
            "format": "pdf_multi",
        },
    )
    assert res.status_code == 404


def test_export_returns_502_when_render_fails(client: TestClient) -> None:
    _override_limiter()
    renderer = AsyncMock()
    renderer.render.side_effect = RuntimeError("boom")
    app.dependency_overrides[get_renderer] = lambda: renderer
    _override_owner()

    res = client.post(
        "/export/pdf",
        json={
            "user_id": "u-1",
            "plan": "free",
            "resume_id": "r-1",
            "language": "ar",
            "format": "pdf_multi",
        },
    )
    assert res.status_code == 502


def test_quota_returns_remaining_for_free(client: TestClient) -> None:
    _override_limiter(remaining=3, limit=5)

    res = client.get("/export/quota", params={"user_id": "u-1", "plan": "free"})
    assert res.status_code == 200
    body = res.json()
    assert body["plan"] == "free"
    assert body["unlimited"] is False
    assert body["rate_limit"]["remaining"] == 3
    assert body["rate_limit"]["limit"] == 5


def test_quota_returns_unlimited_for_prime(client: TestClient) -> None:
    _override_limiter(remaining=10_000, limit=10_000)

    res = client.get("/export/quota", params={"user_id": "u-1", "plan": "prime"})
    assert res.status_code == 200
    body = res.json()
    assert body["plan"] == "prime"
    assert body["unlimited"] is True


def test_quota_falls_back_to_free_for_invalid_plan(client: TestClient) -> None:
    _override_limiter(remaining=5, limit=5)

    res = client.get("/export/quota", params={"user_id": "u-1", "plan": "garbage"})
    assert res.status_code == 200
    body = res.json()
    assert body["plan"] == "free"
