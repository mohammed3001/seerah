"""POST /ai/enhance-text — rewrite a single resume field bilingually."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from ..auth import require_internal_token
from ..openai_client import get_openai_client
from ..prompts import enhance_text_system_prompt, enhance_text_user_prompt
from ..schemas import EnhanceTextRequest, EnhanceTextResponse
from ._common import coerce_str, coerce_str_list, enforce_rate_limit, upstream_error

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_internal_token)])


@router.post("/enhance-text", response_model=EnhanceTextResponse)
async def enhance_text(req: EnhanceTextRequest, response: Response) -> EnhanceTextResponse:
    rate = await enforce_rate_limit(req.caller.user_id, req.caller.plan)
    response.headers["X-RateLimit-Limit"] = str(rate.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate.remaining)
    response.headers["X-RateLimit-Reset"] = str(rate.reset_at)

    client = get_openai_client()
    system = enhance_text_system_prompt(req.field_type)
    user = enhance_text_user_prompt(
        field_type=req.field_type,
        current_text=req.current_text,
        context=req.context,
        language=req.language,
        resume_context=req.resume_context,
    )

    try:
        data = await client.json_completion(system_prompt=system, user_prompt=user)
    except Exception as exc:  # noqa: BLE001 — wrap any provider failure as upstream
        raise upstream_error(exc) from exc

    return EnhanceTextResponse(
        enhanced_ar=coerce_str(data.get("enhanced_ar")),
        enhanced_en=coerce_str(data.get("enhanced_en")),
        suggestions=coerce_str_list(data.get("suggestions")),
    )
