"""POST /export/pdf, POST /export/png, GET /export/quota."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, Response

from ..auth import require_internal_token
from ..rate_limiter import RateLimiter, get_rate_limiter
from ..renderer import PlaywrightRenderer, RenderRequest, get_renderer
from ..schemas import (
    ErrorResponse,
    ExportRequest,
    QuotaResponse,
    RateLimitInfo,
)
from ..supabase_client import assert_resume_owner

_logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/export",
    tags=["export"],
    dependencies=[Depends(require_internal_token)],
)

FILENAME_BY_EXT = {
    "pdf": "resume.pdf",
    "png": "resume.png",
}

# Annotated dependencies — by reading the global getters as module-level
# `Depends` instances we keep route signatures clean and satisfy ruff's
# B008 (no `Depends()` calls in default-arg position).
LimiterDep = Annotated[RateLimiter, Depends(get_rate_limiter)]
RendererDep = Annotated[PlaywrightRenderer, Depends(get_renderer)]


@router.post(
    "/pdf",
    responses={
        429: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
)
async def export_pdf(
    body: ExportRequest,
    limiter: LimiterDep,
    renderer: RendererDep,
) -> Response:
    if body.format == "png":
        # Force callers onto the right route — keeps responses unambiguous
        # so we never return image/png from /export/pdf.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "استخدم /export/png لتصدير الصور",
                "error_en": "Use /export/png for PNG output.",
            },
        )
    return await _do_export(body, limiter, renderer)


@router.post(
    "/png",
    responses={
        429: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
)
async def export_png(
    body: ExportRequest,
    limiter: LimiterDep,
    renderer: RendererDep,
) -> Response:
    if body.format != "png":
        # Coerce silently — the caller asked for PNG via the URL, so honour it.
        body = body.model_copy(update={"format": "png"})
    return await _do_export(body, limiter, renderer)


@router.get("/quota", response_model=QuotaResponse)
async def export_quota(
    user_id: str,
    limiter: LimiterDep,
    plan: str = "free",
) -> QuotaResponse:
    if plan not in ("free", "prime", "enterprise"):
        plan = "free"
    res = await limiter.peek(user_id, plan)
    return QuotaResponse(
        plan=plan,  # type: ignore[arg-type]
        rate_limit=RateLimitInfo(
            limit=res.limit,
            remaining=res.remaining,
            reset_at=res.reset_at,
        ),
        unlimited=plan in ("prime", "enterprise"),
    )


async def _do_export(
    body: ExportRequest,
    limiter: RateLimiter,
    renderer: PlaywrightRenderer,
) -> Response:
    is_owner = await assert_resume_owner(body.resume_id, body.user_id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "السيرة غير موجودة",
                "error_en": "Resume not found.",
            },
        )

    rate_result = await limiter.check_and_record(body.user_id, body.plan)
    if not rate_result.allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "تجاوزت حدّ التصدير اليومي. ترقى إلى برايم للتصدير غير المحدود.",
                "error_en": "Daily export limit reached. Upgrade to Prime for unlimited.",
                "rate_limit": {
                    "limit": rate_result.limit,
                    "remaining": rate_result.remaining,
                    "reset_at": rate_result.reset_at,
                },
            },
            headers={
                "X-RateLimit-Limit": str(rate_result.limit),
                "X-RateLimit-Remaining": str(rate_result.remaining),
                "X-RateLimit-Reset": str(rate_result.reset_at),
            },
        )

    try:
        result = await renderer.render(
            RenderRequest(
                resume_id=body.resume_id,
                language=body.language,
                format=body.format,
                template_id=body.template_id,
                primary_color=body.primary_color,
                mode=body.mode,
            )
        )
    except Exception as exc:  # noqa: BLE001 — surface to client as 502
        _logger.exception("render failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "تعذّر إنشاء الملف الآن، حاول مرة أخرى.",
                "error_en": "Render failed; please try again.",
            },
        ) from exc

    filename = FILENAME_BY_EXT.get(result.extension, f"resume.{result.extension}")
    return Response(
        content=result.content,
        media_type=result.content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-RateLimit-Limit": str(rate_result.limit),
            "X-RateLimit-Remaining": str(rate_result.remaining),
            "X-RateLimit-Reset": str(rate_result.reset_at),
            "Cache-Control": "no-store",
        },
    )
