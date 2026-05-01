"""Tests for POST /ai/generate-section."""

from __future__ import annotations

from fastapi.testclient import TestClient

from .conftest import FakeOpenAIClient


def test_generate_section_education(
    client: TestClient,
    fake_openai: FakeOpenAIClient,
    caller_payload: dict[str, str],
) -> None:
    fake_openai.queue_json(
        {
            "generated_items": [
                {
                    "data": {
                        "institution": {
                            "ar": "جامعة الملك عبدالعزيز",
                            "en": "King Abdulaziz University",
                        },
                        "degree": {"ar": "بكالوريوس", "en": "Bachelor"},
                        "field": {"ar": "علوم الحاسب", "en": "Computer Science"},
                        "start_date": "2018",
                        "end_date": "2022",
                        "is_current": False,
                    }
                }
            ],
            "explanation": "Inferred KAU = King Abdulaziz University.",
        }
    )

    response = client.post(
        "/ai/generate-section",
        json={
            "caller": caller_payload,
            "section_type": "education",
            "user_input_en": "I studied CS at KAU 2018-2022",
            "language": "en",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["generated_items"]) == 1
    item = body["generated_items"][0]["data"]
    assert item["institution"]["en"] == "King Abdulaziz University"
    assert "KAU" in body["explanation"]
