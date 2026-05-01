"""Shared pytest fixtures for the AI service tests."""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from typing import Any
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from seerah_ai import openai_client as openai_client_module
from seerah_ai import rate_limiter as rate_limiter_module


class FakeOpenAIClient:
    """Test double for OpenAIClient with scriptable responses."""

    def __init__(self) -> None:
        self.json_responses: list[dict[str, Any]] = []
        self.stream_chunks: list[str] = []
        self.json_calls: list[dict[str, Any]] = []
        self.stream_calls: list[dict[str, Any]] = []
        self.json_exception: Exception | None = None
        self.stream_exception: Exception | None = None

    @property
    def configured(self) -> bool:
        return True

    def queue_json(self, payload: dict[str, Any]) -> None:
        self.json_responses.append(payload)

    def queue_stream(self, chunks: list[str]) -> None:
        self.stream_chunks = chunks

    async def json_completion(self, **kwargs: Any) -> dict[str, Any]:
        self.json_calls.append(kwargs)
        if self.json_exception is not None:
            raise self.json_exception
        if not self.json_responses:
            return {}
        return self.json_responses.pop(0)

    async def stream_chat(self, **kwargs: Any) -> AsyncIterator[str]:
        self.stream_calls.append(kwargs)
        if self.stream_exception is not None:
            raise self.stream_exception
        for chunk in self.stream_chunks:
            yield chunk


class FakeRateLimiter:
    """Permissive in-memory rate limiter for tests."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []
        self.allow = True
        self.limit = 10
        self.remaining = 9
        self.reset_at = 1700000000

    def limit_for(self, plan: str) -> int:
        return self.limit

    @property
    def configured(self) -> bool:
        return True

    async def check_and_record(
        self, user_id: str, plan: str
    ) -> rate_limiter_module.RateLimitResult:
        self.calls.append((user_id, plan))
        return rate_limiter_module.RateLimitResult(
            allowed=self.allow,
            limit=self.limit,
            remaining=self.remaining if self.allow else 0,
            reset_at=self.reset_at,
        )


@pytest.fixture
def fake_openai() -> Iterator[FakeOpenAIClient]:
    fake = FakeOpenAIClient()
    with patch.object(openai_client_module, "_singleton", fake):
        yield fake


@pytest.fixture
def fake_rate_limiter() -> Iterator[FakeRateLimiter]:
    fake = FakeRateLimiter()
    with patch.object(rate_limiter_module, "_rate_limiter", fake):
        yield fake


@pytest.fixture
def client(
    fake_openai: FakeOpenAIClient,
    fake_rate_limiter: FakeRateLimiter,
) -> TestClient:
    """FastAPI TestClient with provider + rate limiter swapped to fakes."""
    from seerah_ai.main import create_app

    return TestClient(create_app())


@pytest.fixture
def caller_payload() -> dict[str, str]:
    return {"user_id": "user-1", "plan": "free"}
