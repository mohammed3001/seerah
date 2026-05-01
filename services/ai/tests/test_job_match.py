"""Tests for POST /ai/improve-for-job."""

from __future__ import annotations

from fastapi.testclient import TestClient

from .conftest import FakeOpenAIClient


def test_improve_for_job_returns_keyword_diff(
    client: TestClient,
    fake_openai: FakeOpenAIClient,
    caller_payload: dict[str, str],
) -> None:
    fake_openai.queue_json(
        {
            "tailored_bio": "Backend engineer with 5y in distributed systems...",
            "keyword_matches": ["Python", "AWS"],
            "missing_keywords": ["Kubernetes", "Terraform"],
            "suggestions": [
                {"section": "skills", "suggestion": "Add Kubernetes"},
                {"section": "experience", "suggestion": "Highlight scaling impact"},
                "noise",  # invalid entry, ignored
            ],
        }
    )

    response = client.post(
        "/ai/improve-for-job",
        json={
            "caller": caller_payload,
            "job_description": "We need a backend engineer fluent in K8s, Terraform...",
            "resume_data": {"skills": [{"name": "Python"}, {"name": "AWS"}]},
            "language": "en",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert "Backend engineer" in body["tailored_bio"]
    assert "Kubernetes" in body["missing_keywords"]
    assert len(body["suggestions"]) == 2
