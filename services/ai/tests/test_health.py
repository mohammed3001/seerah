"""Smoke test for the AI service /health endpoint."""

from fastapi.testclient import TestClient

from seerah_ai.main import app


def test_health_returns_ok() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "seerah-ai"
