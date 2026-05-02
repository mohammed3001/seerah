"""Tests for the export rate limiter."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from seerah_pdf.config import get_settings
from seerah_pdf.rate_limiter import RateLimiter, _UpstashClient


@pytest.fixture(autouse=True)
def _reset_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_unconfigured_limiter_is_permissive() -> None:
    limiter = RateLimiter(client=None)
    res = await limiter.check_and_record("u-1", "free")
    assert res.allowed is True
    assert res.remaining == res.limit


@pytest.mark.asyncio
async def test_limiter_returns_disallowed_when_count_exceeds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "token")
    monkeypatch.setenv("EXPORT_LIMIT_FREE_PER_DAY", "5")
    get_settings.cache_clear()

    fake = AsyncMock(spec=_UpstashClient)
    # ZREMRANGEBYSCORE, ZADD, ZCARD=6 (over limit), EXPIRE
    fake.pipeline.side_effect = [
        [{"result": 0}, {"result": 1}, {"result": 6}, {"result": 1}],
        [{"result": 1}],  # rollback ZREM
    ]

    limiter = RateLimiter(client=fake)
    res = await limiter.check_and_record("u-1", "free")
    assert res.allowed is False
    assert res.remaining == 0
    assert res.limit == 5
    # Confirm rollback was attempted.
    assert fake.pipeline.call_count == 2


@pytest.mark.asyncio
async def test_limiter_allows_under_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "token")
    monkeypatch.setenv("EXPORT_LIMIT_FREE_PER_DAY", "5")
    get_settings.cache_clear()

    fake = AsyncMock(spec=_UpstashClient)
    fake.pipeline.return_value = [
        {"result": 0}, {"result": 1}, {"result": 3}, {"result": 1},
    ]

    limiter = RateLimiter(client=fake)
    res = await limiter.check_and_record("u-1", "free")
    assert res.allowed is True
    assert res.remaining == 2
    assert res.limit == 5
    # No rollback for allowed requests.
    assert fake.pipeline.call_count == 1


@pytest.mark.asyncio
async def test_prime_plan_uses_higher_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "token")
    monkeypatch.setenv("EXPORT_LIMIT_FREE_PER_DAY", "5")
    monkeypatch.setenv("EXPORT_LIMIT_PRIME_PER_DAY", "10000")
    get_settings.cache_clear()

    fake = AsyncMock(spec=_UpstashClient)
    fake.pipeline.return_value = [
        {"result": 0}, {"result": 1}, {"result": 100}, {"result": 1},
    ]

    limiter = RateLimiter(client=fake)
    res = await limiter.check_and_record("u-1", "prime")
    assert res.allowed is True
    assert res.limit == 10_000


@pytest.mark.asyncio
async def test_peek_does_not_record(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "token")
    monkeypatch.setenv("EXPORT_LIMIT_FREE_PER_DAY", "5")
    get_settings.cache_clear()

    fake = AsyncMock(spec=_UpstashClient)
    fake.pipeline.return_value = [{"result": 0}, {"result": 2}]

    limiter = RateLimiter(client=fake)
    res = await limiter.peek("u-1", "free")
    assert res.remaining == 3
    assert res.limit == 5
    # Peek must use a 2-command pipeline (no ZADD).
    args = fake.pipeline.call_args.args[0]
    assert len(args) == 2
    assert args[0][0] == "ZREMRANGEBYSCORE"
    assert args[1][0] == "ZCARD"
