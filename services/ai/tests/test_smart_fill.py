"""Tests for POST /ai/smart-fill."""

from __future__ import annotations

from fastapi.testclient import TestClient

from .conftest import FakeOpenAIClient


def test_smart_fill_rejects_linkedin_url(
    client: TestClient,
    caller_payload: dict[str, str],
) -> None:
    response = client.post(
        "/ai/smart-fill",
        json={
            "caller": caller_payload,
            "file_type": "linkedin_url",
            "linkedin_url": "https://linkedin.com/in/example",
            "language": "ar",
        },
    )
    assert response.status_code == 400
    body = response.json()["detail"]
    assert body["error"] == "linkedin_scraping_unsupported"


def test_smart_fill_requires_file_for_pdf(
    client: TestClient,
    caller_payload: dict[str, str],
) -> None:
    response = client.post(
        "/ai/smart-fill",
        json={"caller": caller_payload, "file_type": "pdf", "language": "ar"},
    )
    assert response.status_code == 400


def test_smart_fill_extracts_data(
    client: TestClient,
    fake_openai: FakeOpenAIClient,
    caller_payload: dict[str, str],
) -> None:
    fake_openai.queue_json(
        {
            "extracted_data": {
                "personal": {"full_name": {"en": "Mohammed", "ar": "محمد"}}
            },
            "confidence_scores": {"personal": 0.92, "education": 1.5, "experience": "n/a"},
            "notes": "Clean PDF.",
        }
    )

    response = client.post(
        "/ai/smart-fill",
        json={
            "caller": caller_payload,
            "file_type": "pdf",
            "uploaded_file_base64": "JVBERi0xLjQK",  # tiny fake
            "language": "ar",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["extracted_data"]["personal"]["full_name"]["en"] == "Mohammed"
    # 1.5 should clamp to 1.0; "n/a" should be dropped
    assert body["confidence_scores"]["personal"] == 0.92
    assert body["confidence_scores"]["education"] == 1.0
    assert "experience" not in body["confidence_scores"]
