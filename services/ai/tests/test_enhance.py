"""Tests for POST /ai/enhance-text."""

from __future__ import annotations

from fastapi.testclient import TestClient

from .conftest import FakeOpenAIClient, FakeRateLimiter


def test_enhance_text_returns_bilingual(
    client: TestClient,
    fake_openai: FakeOpenAIClient,
    caller_payload: dict[str, str],
) -> None:
    fake_openai.queue_json(
        {
            "enhanced_ar": "نص محسّن باللغة العربية الفصحى.",
            "enhanced_en": "Polished bio with strong action verbs.",
            "suggestions": ["Add measurable impact", "Mention seniority"],
        }
    )

    response = client.post(
        "/ai/enhance-text",
        json={
            "caller": caller_payload,
            "field_type": "bio",
            "current_text": "أنا مطور",
            "language": "ar",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["enhanced_ar"].startswith("نص محسّن")
    assert body["enhanced_en"].startswith("Polished bio")
    assert len(body["suggestions"]) == 2
    assert response.headers["X-RateLimit-Limit"] == "10"


def test_enhance_text_rate_limited(
    client: TestClient,
    fake_rate_limiter: FakeRateLimiter,
    caller_payload: dict[str, str],
) -> None:
    fake_rate_limiter.allow = False
    response = client.post(
        "/ai/enhance-text",
        json={
            "caller": caller_payload,
            "field_type": "bio",
            "current_text": "x",
            "language": "ar",
        },
    )
    assert response.status_code == 429
    body = response.json()["detail"]
    assert body["error"] == "rate_limit_exceeded"
    assert body["upgrade_required"] is True
    assert "ترقية" in body["message_ar"]


def test_enhance_text_upstream_failure(
    client: TestClient,
    fake_openai: FakeOpenAIClient,
    caller_payload: dict[str, str],
) -> None:
    fake_openai.json_exception = RuntimeError("openai down")
    response = client.post(
        "/ai/enhance-text",
        json={
            "caller": caller_payload,
            "field_type": "bio",
            "current_text": "x",
            "language": "ar",
        },
    )
    assert response.status_code == 502
    body = response.json()["detail"]
    assert body["error"] == "upstream_unavailable"
