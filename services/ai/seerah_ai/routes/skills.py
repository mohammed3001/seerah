"""POST /ai/suggest-skills — recommend skills for a job title."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from ..auth import require_internal_token
from ..openai_client import get_openai_client
from ..prompts import SUGGEST_SKILLS_SYSTEM_PROMPT
from ..schemas import (
    SuggestedSkill,
    SuggestSkillsRequest,
    SuggestSkillsResponse,
)
from ._common import enforce_rate_limit, upstream_error

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_internal_token)])


_VALID_LEVELS = {"beginner", "intermediate", "good", "advanced", "expert"}


@router.post("/suggest-skills", response_model=SuggestSkillsResponse)
async def suggest_skills(
    req: SuggestSkillsRequest,
    response: Response,
) -> SuggestSkillsResponse:
    rate = await enforce_rate_limit(req.caller.user_id, req.caller.plan)
    response.headers["X-RateLimit-Limit"] = str(rate.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate.remaining)
    response.headers["X-RateLimit-Reset"] = str(rate.reset_at)

    client = get_openai_client()
    body = "\n".join(f"- {desc}" for desc in req.experience_descriptions[:10])
    user_prompt = (
        f"Job title: {req.job_title}\n"
        f"Primary language: {req.language}\n"
        "Experience snippets:\n"
        f"{body or '(none provided)'}"
    )

    try:
        data = await client.json_completion(
            system_prompt=SUGGEST_SKILLS_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=1200,
        )
    except Exception as exc:  # noqa: BLE001
        raise upstream_error(exc) from exc

    raw = data.get("suggested_skills") or []
    suggestions: list[SuggestedSkill] = []
    if isinstance(raw, list):
        for entry in raw:
            if not isinstance(entry, dict):
                continue
            name_raw = entry.get("name")
            if isinstance(name_raw, dict):
                name = (
                    name_raw.get("ar")
                    if req.language == "ar"
                    else name_raw.get("en")
                ) or name_raw.get("en") or name_raw.get("ar") or ""
            else:
                name = str(name_raw or "")
            if not name:
                continue
            level = entry.get("level", "intermediate")
            if level not in _VALID_LEVELS:
                level = "intermediate"
            try:
                relevance = max(0.0, min(1.0, float(entry.get("relevance", 0.5))))
            except (TypeError, ValueError):
                relevance = 0.5
            suggestions.append(
                SuggestedSkill(name=name, level=level, relevance=relevance)
            )

    return SuggestSkillsResponse(suggested_skills=suggestions)
