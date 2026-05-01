"""Tests for POST /ai/suggest-skills."""

from __future__ import annotations

from fastapi.testclient import TestClient

from .conftest import FakeOpenAIClient


def test_suggest_skills_normalizes_levels(
    client: TestClient,
    fake_openai: FakeOpenAIClient,
    caller_payload: dict[str, str],
) -> None:
    fake_openai.queue_json(
        {
            "suggested_skills": [
                {
                    "name": {"ar": "Python", "en": "Python"},
                    "level": "expert",
                    "relevance": 0.95,
                },
                {
                    "name": {"ar": "بايثون", "en": "TypeScript"},
                    "level": "wizard",  # invalid -> intermediate
                    "relevance": "high",  # invalid -> 0.5
                },
                {"name": "", "level": "good", "relevance": 0.5},  # dropped (empty name)
            ]
        }
    )

    response = client.post(
        "/ai/suggest-skills",
        json={
            "caller": caller_payload,
            "job_title": "Senior Backend Engineer",
            "experience_descriptions": ["Built REST APIs at scale."],
            "language": "en",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["suggested_skills"]) == 2
    assert body["suggested_skills"][1]["level"] == "intermediate"
    assert body["suggested_skills"][1]["relevance"] == 0.5
