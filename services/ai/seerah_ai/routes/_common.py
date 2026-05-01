"""Shared helpers for AI route handlers."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from ..rate_limiter import RateLimitResult, get_rate_limiter
from ..schemas import ErrorResponse, RateLimitInfo


async def enforce_rate_limit(user_id: str, plan: str) -> RateLimitResult:
    """Check the per-user quota and raise 429 if exhausted."""
    limiter = get_rate_limiter()
    result = await limiter.check_and_record(user_id, plan)
    if not result.allowed:
        info = RateLimitInfo(
            limit=result.limit,
            remaining=0,
            reset_at=result.reset_at,
        )
        body = ErrorResponse(
            error="rate_limit_exceeded",
            message_ar=(
                "لقد استهلكت حصتك اليومية من الذكاء الاصطناعي. "
                "قم بالترقية إلى برايم للحصول على حد أعلى."
            ),
            message_en=(
                "You've used today's AI quota. "
                "Upgrade to Prime for a higher daily limit."
            ),
            upgrade_required=plan == "free",
            rate_limit=info,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=body.model_dump(),
            headers={
                "X-RateLimit-Limit": str(result.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(result.reset_at),
            },
        )
    return result


def upstream_error(exc: Exception) -> HTTPException:
    """Convert OpenAI/transport errors to a 502 with bilingual message."""
    body = ErrorResponse(
        error="upstream_unavailable",
        message_ar=(
            "تعذر الوصول إلى خدمة الذكاء الاصطناعي حالياً. "
            "يرجى المحاولة بعد قليل."
        ),
        message_en=(
            "The AI provider is temporarily unavailable. "
            "Please try again in a moment."
        ),
    )
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=body.model_dump(),
    )


def coerce_str(value: Any) -> str:
    if isinstance(value, str):
        return value
    if value is None:
        return ""
    return str(value)


def coerce_str_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [coerce_str(v) for v in value if v is not None]
    return []
