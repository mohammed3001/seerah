"""POST /ai/analyze-resume — score and audit a resume."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Response

from ..auth import require_internal_token
from ..openai_client import get_openai_client
from ..prompts import ANALYZE_SYSTEM_PROMPT
from ..schemas import AnalyzeResumeRequest, AnalyzeResumeResponse, CompletionTip
from ._common import coerce_str, coerce_str_list, enforce_rate_limit, upstream_error

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_internal_token)])


def _clamp_score(value: object) -> int:
    try:
        n = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0
    return max(0, min(100, n))


@router.post("/analyze-resume", response_model=AnalyzeResumeResponse)
async def analyze_resume(
    req: AnalyzeResumeRequest,
    response: Response,
) -> AnalyzeResumeResponse:
    rate = await enforce_rate_limit(req.caller.user_id, req.caller.plan)
    response.headers["X-RateLimit-Limit"] = str(rate.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate.remaining)
    response.headers["X-RateLimit-Reset"] = str(rate.reset_at)

    client = get_openai_client()
    user_prompt = (
        f"Language: {req.language}\n"
        "Resume JSON:\n"
        f"{json.dumps(req.resume_data, ensure_ascii=False)[:8000]}"
    )

    try:
        data = await client.json_completion(
            system_prompt=ANALYZE_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2,
            max_tokens=2000,
        )
    except Exception as exc:  # noqa: BLE001
        raise upstream_error(exc) from exc

    raw_tips = data.get("completion_tips") or []
    tips: list[CompletionTip] = []
    if isinstance(raw_tips, list):
        for entry in raw_tips:
            if not isinstance(entry, dict):
                continue
            sev = entry.get("severity", "info")
            if sev not in ("info", "warning", "critical"):
                sev = "info"
            tips.append(
                CompletionTip(
                    section=coerce_str(entry.get("section")),
                    message=coerce_str(entry.get("message")),
                    severity=sev,
                )
            )

    return AnalyzeResumeResponse(
        overall_score=_clamp_score(data.get("overall_score")),
        completion_tips=tips,
        strengths=coerce_str_list(data.get("strengths")),
        improvements=coerce_str_list(data.get("improvements")),
        keyword_suggestions=coerce_str_list(data.get("keyword_suggestions")),
        ats_score=_clamp_score(data.get("ats_score")),
        industry_insights=coerce_str(data.get("industry_insights")),
    )
