"""Tests for POST /ai/chat (SSE streaming)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from .conftest import FakeOpenAIClient


def test_chat_streams_sse(
    client: TestClient,
    fake_openai: FakeOpenAIClient,
    caller_payload: dict[str, str],
) -> None:
    fake_openai.queue_stream(["Hello", " there", "!"])

    with client.stream(
        "POST",
        "/ai/chat",
        json={
            "caller": caller_payload,
            "messages": [{"role": "user", "content": "Hi"}],
            "language": "en",
        },
    ) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        body = b"".join(response.iter_bytes()).decode()

    # SSE events: rate_limit -> delta x3 -> done
    assert "event: rate_limit" in body
    assert body.count("event: delta") == 3
    assert "Hello" in body
    assert " there" in body
    assert "!" in body
    assert "event: done" in body


def test_chat_emits_error_event_on_provider_failure(
    client: TestClient,
    fake_openai: FakeOpenAIClient,
    caller_payload: dict[str, str],
) -> None:
    fake_openai.stream_exception = RuntimeError("openai unavailable")

    with client.stream(
        "POST",
        "/ai/chat",
        json={
            "caller": caller_payload,
            "messages": [{"role": "user", "content": "Hi"}],
            "language": "ar",
        },
    ) as response:
        assert response.status_code == 200
        body = b"".join(response.iter_bytes()).decode()

    assert "event: error" in body
    assert "upstream_unavailable" in body
    assert "event: done" not in body
