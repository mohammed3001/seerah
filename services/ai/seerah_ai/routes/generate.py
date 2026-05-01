"""POST /ai/generate-section — turn casual text into structured section items."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from ..auth import require_internal_token
from ..openai_client import get_openai_client
from ..prompts import generate_section_system_prompt, generate_section_user_prompt
from ..schemas import GenerateSectionRequest, GenerateSectionResponse, SectionItem
from ._common import coerce_str, enforce_rate_limit, upstream_error

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_internal_token)])


@router.post("/generate-section", response_model=GenerateSectionResponse)
async def generate_section(
    req: GenerateSectionRequest,
    response: Response,
) -> GenerateSectionResponse:
    rate = await enforce_rate_limit(req.caller.user_id, req.caller.plan)
    response.headers["X-RateLimit-Limit"] = str(rate.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate.remaining)
    response.headers["X-RateLimit-Reset"] = str(rate.reset_at)

    client = get_openai_client()
    system = generate_section_system_prompt(req.section_type)
    user = generate_section_user_prompt(
        section_type=req.section_type,
        user_input_ar=req.user_input_ar,
        user_input_en=req.user_input_en,
        language=req.language,
        resume_context=req.resume_context,
    )

    try:
        data = await client.json_completion(system_prompt=system, user_prompt=user)
    except Exception as exc:  # noqa: BLE001
        raise upstream_error(exc) from exc

    raw_items = data.get("generated_items") or []
    items: list[SectionItem] = []
    if isinstance(raw_items, list):
        for entry in raw_items:
            if isinstance(entry, dict) and isinstance(entry.get("data"), dict):
                items.append(SectionItem(data=entry["data"]))
            elif isinstance(entry, dict):
                items.append(SectionItem(data=entry))

    return GenerateSectionResponse(
        generated_items=items,
        explanation=coerce_str(data.get("explanation")),
    )
