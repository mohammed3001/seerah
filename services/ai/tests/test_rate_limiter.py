"""Unit tests for the sliding-window rate limiter."""

from __future__ import annotations

from typing import Any

import pytest

from seerah_ai.rate_limiter import RateLimiter, _UpstashClient


class FakeUpstash:
    def __init__(self, count: int) -> None:
        self.count = count
        self.calls: list[list[list[Any]]] = []

    async def pipeline(
        self, commands: list[list[Any]], *, client: Any = None
    ) -> list[dict[str, Any]]:
        self.calls.append(commands)
        # First call returns prune + count; second is record (ZADD + EXPIRE)
        if commands[0][0] == "ZREMRANGEBYSCORE":
            return [{"result": 0}, {"result": self.count}]
        return [{"result": 1}, {"result": 1}]


@pytest.mark.asyncio
async def test_rate_limiter_allows_when_under_limit(monkeypatch: Any) -> None:
    fake = FakeUpstash(count=3)
    limiter = RateLimiter(client=fake)  # type: ignore[arg-type]
    monkeypatch.setattr(limiter, "_configured", True)
    result = await limiter.check_and_record("user-1", "free")
    assert result.allowed
    assert result.limit == 10
    assert result.remaining == 6  # 10 - 3 - 1
    assert len(fake.calls) == 2  # prune+count, then record


@pytest.mark.asyncio
async def test_rate_limiter_blocks_when_at_limit(monkeypatch: Any) -> None:
    fake = FakeUpstash(count=10)
    limiter = RateLimiter(client=fake)  # type: ignore[arg-type]
    monkeypatch.setattr(limiter, "_configured", True)
    result = await limiter.check_and_record("user-1", "free")
    assert not result.allowed
    assert result.remaining == 0
    assert len(fake.calls) == 1  # only prune+count, no record


@pytest.mark.asyncio
async def test_rate_limiter_prime_has_higher_limit(monkeypatch: Any) -> None:
    fake = FakeUpstash(count=50)
    limiter = RateLimiter(client=fake)  # type: ignore[arg-type]
    monkeypatch.setattr(limiter, "_configured", True)
    result = await limiter.check_and_record("user-1", "prime")
    assert result.allowed
    assert result.limit == 100
    assert result.remaining == 49


@pytest.mark.asyncio
async def test_rate_limiter_permissive_when_unconfigured() -> None:
    limiter = RateLimiter(client=None)
    result = await limiter.check_and_record("user-1", "free")
    assert result.allowed
    assert result.remaining == result.limit
    assert isinstance(limiter.configured, bool)


def test_upstash_client_constructs_with_url_and_token() -> None:
    client = _UpstashClient("https://example.upstash.io", "token-x")
    assert client._url == "https://example.upstash.io"  # noqa: SLF001
    assert client._token == "token-x"  # noqa: SLF001
