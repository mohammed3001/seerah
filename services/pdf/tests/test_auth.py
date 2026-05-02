"""Tests for the internal-token guard."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from seerah_pdf.auth import require_internal_token
from seerah_pdf.config import get_settings


@pytest.fixture(autouse=True)
def _reset_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _build_app() -> FastAPI:
    app = FastAPI()

    @app.get("/secret", dependencies=[__import__("fastapi").Depends(require_internal_token)])
    async def secret() -> dict[str, str]:
        return {"ok": "yes"}

    return app


def test_no_token_configured_allows_request(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PDF_SERVICE_INTERNAL_TOKEN", raising=False)
    get_settings.cache_clear()
    client = TestClient(_build_app())
    assert client.get("/secret").status_code == 200


def test_token_configured_rejects_missing_header(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PDF_SERVICE_INTERNAL_TOKEN", "expected-token")
    get_settings.cache_clear()
    client = TestClient(_build_app())
    res = client.get("/secret")
    assert res.status_code == 401
    body = res.json()
    assert body["detail"]["error"] == "غير مصرح"


def test_token_configured_rejects_wrong_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PDF_SERVICE_INTERNAL_TOKEN", "expected-token")
    get_settings.cache_clear()
    client = TestClient(_build_app())
    res = client.get("/secret", headers={"Authorization": "Bearer wrong"})
    assert res.status_code == 401


def test_token_configured_accepts_correct_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PDF_SERVICE_INTERNAL_TOKEN", "expected-token")
    get_settings.cache_clear()
    client = TestClient(_build_app())
    res = client.get("/secret", headers={"Authorization": "Bearer expected-token"})
    assert res.status_code == 200
