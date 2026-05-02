"""Tests for POST /ai/smart-fill."""

from __future__ import annotations

import base64

from fastapi.testclient import TestClient

from seerah_ai.routes.smart_fill import _sniff_image_mime

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


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def test_sniff_image_mime_detects_png() -> None:
    payload = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    assert _sniff_image_mime(_b64(payload)) == "image/png"


def test_sniff_image_mime_detects_jpeg() -> None:
    payload = b"\xff\xd8\xff\xe0" + b"\x00" * 16
    assert _sniff_image_mime(_b64(payload)) == "image/jpeg"


def test_sniff_image_mime_detects_webp() -> None:
    # RIFF<size>WEBP header
    payload = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 16
    assert _sniff_image_mime(_b64(payload)) == "image/webp"


def test_sniff_image_mime_detects_gif() -> None:
    payload = b"GIF89a" + b"\x00" * 16
    assert _sniff_image_mime(_b64(payload)) == "image/gif"


def test_sniff_image_mime_falls_back_on_unknown() -> None:
    payload = b"\x00\x01\x02\x03" + b"\x00" * 16
    assert _sniff_image_mime(_b64(payload)) == "image/png"


def test_sniff_image_mime_handles_invalid_base64() -> None:
    # Non-base64 garbage must not raise.
    assert _sniff_image_mime("not!!base64", default="image/jpeg") == "image/jpeg"
