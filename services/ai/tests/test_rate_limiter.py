"""Unit tests for the sliding-window rate limiter."""

from __future__ import annotations

from typing import Any

import pytest

from seerah_ai.rate_limiter import RateLimiter, _UpstashClient


class FakeUpstash:
    """Test double for the Upstash REST client.

    Returns deterministic results for the rate-limiter's two pipeline shapes:
    - main pipeline: [ZREMRANGEBYSCORE, ZADD, ZCARD, EXPIRE]
    - rollback pipeline: [ZREM]
    """

    def __init__(self, count_after: int) -> None:
        self.count_after = count_after
        self.calls: list[list[list[Any]]] = []

    async def pipeline(
        self, commands: list[list[Any]], *, client: Any = None
    ) -> list[dict[str, Any]]:
        self.calls.append(commands)
        if commands and commands[0][0] == "ZREM":
            return [{"result": 1}]
        # Main pipeline: prune, ZADD, ZCARD, EXPIRE
        return [
            {"result": 0},
            {"result": 1},
            {"result": self.count_after},
            {"result": 1},
        ]


@pytest.mark.asyncio
async def test_rate_limiter_allows_when_under_limit(monkeypatch: Any) -> None:
    fake = FakeUpstash(count_after=4)  # 3 prior + 1 new
    limiter = RateLimiter(client=fake)  # type: ignore[arg-type]
    monkeypatch.setattr(limiter, "_configured", True)
    result = await limiter.check_and_record("user-1", "free")
    assert result.allowed
    assert result.limit == 10
    assert result.remaining == 6  # 10 - 4
    assert len(fake.calls) == 1  # single combined pipeline


@pytest.mark.asyncio
async def test_rate_limiter_blocks_and_rolls_back_on_overflow(
    monkeypatch: Any,
) -> None:
    fake = FakeUpstash(count_after=11)  # exceeds free limit (10)
    limiter = RateLimiter(client=fake)  # type: ignore[arg-type]
    monkeypatch.setattr(limiter, "_configured", True)
    result = await limiter.check_and_record("user-1", "free")
    assert not result.allowed
    assert result.remaining == 0
    # Two pipelines: main + rollback ZREM
    assert len(fake.calls) == 2
    assert fake.calls[1][0][0] == "ZREM"


@pytest.mark.asyncio
async def test_rate_limiter_prime_has_higher_limit(monkeypatch: Any) -> None:
    fake = FakeUpstash(count_after=51)  # 50 prior + 1 new
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
