"""OpenAI provider wrapper with retry/backoff and JSON mode helpers.

We wrap the official `openai` SDK so the rest of the service speaks in
strict, typed terms ("give me JSON conforming to schema X") and can be
swapped out in tests via dependency injection.

Models default to gpt-4o-mini per the project's cost preference. Vision
calls (smart-fill) reuse the same model — gpt-4o-mini supports image
inputs.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from openai import APIConnectionError, APIStatusError, AsyncOpenAI, RateLimitError

from .config import get_settings

logger = logging.getLogger(__name__)


_RETRYABLE_STATUSES = {408, 409, 425, 429, 500, 502, 503, 504}


class OpenAIClient:
    """Async wrapper that handles retries and JSON-mode parsing."""

    def __init__(self, client: AsyncOpenAI | None = None) -> None:
        settings = get_settings()
        self._settings = settings
        if client is not None:
            self._client = client
        elif settings.openai_api_key:
            self._client = AsyncOpenAI(
                api_key=settings.openai_api_key,
                timeout=settings.openai_request_timeout_s,
            )
        else:
            self._client = None  # type: ignore[assignment]

    @property
    def configured(self) -> bool:
        return self._client is not None

    async def json_completion(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.4,
        max_tokens: int = 1500,
        attachments: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Call chat.completions with response_format=json_object and return parsed JSON."""
        if self._client is None:
            raise RuntimeError("OpenAI client not configured (OPENAI_API_KEY missing)")

        user_content: list[dict[str, Any]] | str = user_prompt
        if attachments:
            user_content = [{"type": "text", "text": user_prompt}, *attachments]

        # Vision-capable model is used whenever the caller passed image/file
        # attachments. Otherwise a deployer who set OPENAI_MODEL to a cheap
        # text-only model would silently break smart-fill.
        model = (
            self._settings.openai_vision_model
            if attachments
            else self._settings.openai_model
        )

        last_error: Exception | None = None
        for attempt in range(3):
            try:
                completion = await self._client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format={"type": "json_object"},
                )
                content = completion.choices[0].message.content or "{}"
                return json.loads(content)
            except (APIConnectionError, APIStatusError, RateLimitError) as exc:
                if not _is_retryable(exc) or attempt == 2:
                    raise
                last_error = exc
                backoff = 2**attempt
                logger.warning(
                    "OpenAI retryable error (attempt %d/3): %s — backing off %ds",
                    attempt + 1,
                    exc,
                    backoff,
                )
                await asyncio.sleep(backoff)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"OpenAI returned non-JSON content: {exc}") from exc

        if last_error is not None:
            raise last_error
        raise RuntimeError("OpenAI call failed without raising")

    async def stream_chat(
        self,
        *,
        system_prompt: str,
        messages: list[dict[str, str]],
        temperature: float = 0.6,
        max_tokens: int = 1500,
    ) -> AsyncIterator[str]:
        """Stream text deltas from chat.completions for SSE."""
        if self._client is None:
            raise RuntimeError("OpenAI client not configured (OPENAI_API_KEY missing)")

        all_messages = [{"role": "system", "content": system_prompt}, *messages]

        stream = await self._client.chat.completions.create(
            model=self._settings.openai_model,
            messages=all_messages,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, APIConnectionError | RateLimitError):
        return True
    if isinstance(exc, APIStatusError):
        return exc.status_code in _RETRYABLE_STATUSES
    return False


_singleton: OpenAIClient | None = None


def get_openai_client() -> OpenAIClient:
    global _singleton
    if _singleton is None:
        _singleton = OpenAIClient()
    return _singleton


def reset_openai_client_for_tests() -> None:
    """Clear the singleton between test cases."""
    global _singleton
    _singleton = None
