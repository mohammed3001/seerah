"""Per-user sliding-window export rate limiter (Upstash Redis REST).

Mirrors `services/ai/seerah_ai/rate_limiter.py` so the two services share
the same atomic ZADD+ZCARD pipeline + rollback pattern. We keep a separate
key namespace (`exportquota:`) so AI quotas and export quotas don't share
counters.

Limits:
  - free plan: 5 / day
  - prime plan: effectively unlimited (configurable; default 10 000 / day)

Window: trailing 86 400 seconds (true sliding window).
"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass

import httpx

from .config import get_settings

_logger = logging.getLogger(__name__)

WINDOW_SECONDS = 24 * 60 * 60


@dataclass
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_at: int  # unix seconds


class _UpstashClient:
    """Tiny REST client for Upstash Redis pipelines."""

    def __init__(self, url: str, token: str) -> None:
        self._url = url.rstrip("/")
        self._token = token

    async def pipeline(
        self,
        commands: list[list[str | int]],
        *,
        client: httpx.AsyncClient | None = None,
    ) -> list[dict[str, object]]:
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }
        url = f"{self._url}/pipeline"
        owns_client = client is None
        if client is None:
            client = httpx.AsyncClient(timeout=10.0)
        try:
            response = await client.post(url, headers=headers, json=commands)
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, list):
                raise RuntimeError(f"Unexpected Upstash response: {data!r}")
            return data
        finally:
            if owns_client:
                await client.aclose()


class RateLimiter:
    """Sliding-window export rate limiter."""

    def __init__(self, client: _UpstashClient | None = None) -> None:
        settings = get_settings()
        self._client = client
        self._free_limit = settings.rate_limit_free_per_day
        self._prime_limit = settings.rate_limit_prime_per_day
        self._configured = bool(settings.upstash_redis_url and settings.upstash_redis_token)
        if self._client is None and self._configured:
            self._client = _UpstashClient(
                settings.upstash_redis_url,
                settings.upstash_redis_token,
            )

    @property
    def configured(self) -> bool:
        return self._configured

    def limit_for(self, plan: str) -> int:
        if plan in ("prime", "enterprise"):
            return self._prime_limit
        return self._free_limit

    def _key(self, user_id: str) -> str:
        return f"exportquota:{user_id}"

    async def check_and_record(self, user_id: str, plan: str) -> RateLimitResult:
        """Atomically prune old entries, count, and (if allowed) record one hit."""
        limit = self.limit_for(plan)
        now_ms = int(time.time() * 1000)
        window_start_ms = now_ms - WINDOW_SECONDS * 1000
        reset_at = int(now_ms / 1000) + WINDOW_SECONDS

        if not self._configured or self._client is None:
            # No Redis configured -> permissive (development / local CI).
            return RateLimitResult(
                allowed=True,
                limit=limit,
                remaining=limit,
                reset_at=reset_at,
            )

        key = self._key(user_id)
        member = f"{now_ms}:{uuid.uuid4().hex}"

        # Single pipeline: prune old, add tentatively, count, refresh TTL.
        # If the post-add count exceeds the limit, roll back the just-added
        # entry. See `services/ai/.../rate_limiter.py` for full rationale.
        commands: list[list[str | int]] = [
            ["ZREMRANGEBYSCORE", key, "0", str(window_start_ms - 1)],
            ["ZADD", key, str(now_ms), member],
            ["ZCARD", key],
            ["EXPIRE", key, str(WINDOW_SECONDS)],
        ]
        result = await self._client.pipeline(commands)
        count_after = _result_int(result[2])

        if count_after > limit:
            try:
                await self._client.pipeline([["ZREM", key, member]])
            except Exception:  # noqa: BLE001 - best-effort rollback
                _logger.warning(
                    "rate_limiter: rollback ZREM failed; entry will expire naturally",
                    exc_info=True,
                )
            return RateLimitResult(
                allowed=False,
                limit=limit,
                remaining=0,
                reset_at=reset_at,
            )

        return RateLimitResult(
            allowed=True,
            limit=limit,
            remaining=max(0, limit - count_after),
            reset_at=reset_at,
        )

    async def peek(self, user_id: str, plan: str) -> RateLimitResult:
        """Return current usage without recording. Used by /export/quota."""
        limit = self.limit_for(plan)
        now_ms = int(time.time() * 1000)
        window_start_ms = now_ms - WINDOW_SECONDS * 1000
        reset_at = int(now_ms / 1000) + WINDOW_SECONDS

        if not self._configured or self._client is None:
            return RateLimitResult(
                allowed=True,
                limit=limit,
                remaining=limit,
                reset_at=reset_at,
            )

        key = self._key(user_id)
        commands: list[list[str | int]] = [
            ["ZREMRANGEBYSCORE", key, "0", str(window_start_ms - 1)],
            ["ZCARD", key],
        ]
        result = await self._client.pipeline(commands)
        used = _result_int(result[1])
        remaining = max(0, limit - used)
        return RateLimitResult(
            allowed=remaining > 0,
            limit=limit,
            remaining=remaining,
            reset_at=reset_at,
        )


def _result_int(entry: object) -> int:
    if isinstance(entry, dict):
        result = entry.get("result")
        if isinstance(result, int):
            return result
        if isinstance(result, str) and result.isdigit():
            return int(result)
    return 0


_rate_limiter: RateLimiter | None = None


def get_rate_limiter() -> RateLimiter:
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter
