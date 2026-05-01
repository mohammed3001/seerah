"""Tests for POST /ai/analyze-resume."""

from __future__ import annotations

from fastapi.testclient import TestClient

from .conftest import FakeOpenAIClient


def test_analyze_resume_clamps_score(
    client: TestClient,
    fake_openai: FakeOpenAIClient,
    caller_payload: dict[str, str],
) -> None:
    fake_openai.queue_json(
        {
            "overall_score": 250,  # invalid: should clamp to 100
            "completion_tips": [
                {
                    "section": "experience",
                    "message": "Add metrics",
                    "severity": "warning",
                },
                {"section": "skills", "message": "Add tools", "severity": "junk"},
            ],
            "strengths": ["Bilingual"],
            "improvements": ["Add quantitative impact"],
            "keyword_suggestions": ["Kubernetes", "AWS"],
            "ats_score": -10,  # clamp to 0
            "industry_insights": "Solid foundation.",
        }
    )

    response = client.post(
        "/ai/analyze-resume",
        json={
            "caller": caller_payload,
            "resume_data": {"personal": {"full_name": {"en": "Mohammed"}}},
            "language": "en",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["overall_score"] == 100
    assert body["ats_score"] == 0
    assert len(body["completion_tips"]) == 2
    assert body["completion_tips"][1]["severity"] == "info"  # invalid coerced
    assert body["strengths"] == ["Bilingual"]
