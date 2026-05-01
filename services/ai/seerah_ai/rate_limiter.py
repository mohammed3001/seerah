"""Per-user sliding-window rate limiter backed by Upstash Redis (REST).

We keep this dependency-light by talking to Upstash's REST API over httpx
instead of pulling the redis-py client. The sliding window is implemented
as a sorted set keyed by `aiquota:<user_id>:<YYYYMMDD>`, where each AI
request is added with score=now (unix ms) and value=unique-id. We trim
entries older than the window before counting.

Limits:
  - free plan: 10 / day
  - prime plan: 100 / day

Window: 24 hours, anchored on the trailing 86400 seconds (true sliding,
not calendar day).
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass

import httpx

from .config import get_settings

WINDOW_SECONDS = 24 * 60 * 60


@dataclass
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_at: int  # unix seconds


class _UpstashClient:
    """Tiny REST client for Upstash Redis pipeline / multi-exec."""

    def __init__(self, url: str, token: str) -> None:
        self._url = url.rstrip("/")
        self._token = token

    async def pipeline(
        self,
        commands: list[list[str | int]],
        *,
        client: httpx.AsyncClient | None = None,
    ) -> list[dict[str, object]]:
        """POST a JSON body of [[cmd, ...args], ...] to /pipeline."""
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
    """Sliding-window rate limiter."""

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
        if plan == "prime" or plan == "enterprise":
            return self._prime_limit
        return self._free_limit

    def _key(self, user_id: str) -> str:
        return f"aiquota:{user_id}"

    async def check_and_record(self, user_id: str, plan: str) -> RateLimitResult:
        """Atomically prune old entries, count, and (if allowed) record one hit."""
        limit = self.limit_for(plan)
        now_ms = int(time.time() * 1000)
        window_start_ms = now_ms - WINDOW_SECONDS * 1000
        reset_at = int(now_ms / 1000) + WINDOW_SECONDS

        if not self._configured or self._client is None:
            # No Redis configured -> permissive (development).
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
        # entry. This collapses the TOCTOU window of a check-then-record
        # sequence: concurrent requests all participate in the same ordered
        # ZADD+ZCARD pipeline, so only the first `limit` entries within the
        # window survive.
        commands: list[list[str | int]] = [
            ["ZREMRANGEBYSCORE", key, "0", str(window_start_ms - 1)],
            ["ZADD", key, str(now_ms), member],
            ["ZCARD", key],
            ["EXPIRE", key, str(WINDOW_SECONDS)],
        ]
        result = await self._client.pipeline(commands)
        count_after = _result_int(result[2])

        if count_after > limit:
            # Roll back: remove the entry we just added. Best-effort; even if
            # this fails the entry will expire after WINDOW_SECONDS.
            await self._client.pipeline([["ZREM", key, member]])
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


def _result_int(entry: object) -> int:
    """Upstash pipeline entries look like {'result': N} or {'error': '...'}."""
    if isinstance(entry, dict):
        result = entry.get("result")
        if isinstance(result, int):
            return result
        if isinstance(result, str) and result.isdigit():
            return int(result)
    return 0


# Module-level singleton: reused across requests.
_rate_limiter: RateLimiter | None = None


def get_rate_limiter() -> RateLimiter:
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter
