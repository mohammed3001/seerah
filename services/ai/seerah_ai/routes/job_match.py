"""POST /ai/improve-for-job — tailor a resume to a target job description."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Response

from ..auth import require_internal_token
from ..openai_client import get_openai_client
from ..prompts import IMPROVE_FOR_JOB_SYSTEM_PROMPT
from ..schemas import (
    ImproveForJobRequest,
    ImproveForJobResponse,
    JobImprovement,
)
from ._common import coerce_str, coerce_str_list, enforce_rate_limit, upstream_error

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_internal_token)])


@router.post("/improve-for-job", response_model=ImproveForJobResponse)
async def improve_for_job(
    req: ImproveForJobRequest,
    response: Response,
) -> ImproveForJobResponse:
    rate = await enforce_rate_limit(req.caller.user_id, req.caller.plan)
    response.headers["X-RateLimit-Limit"] = str(rate.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate.remaining)
    response.headers["X-RateLimit-Reset"] = str(rate.reset_at)

    client = get_openai_client()
    resume_blob = json.dumps(req.resume_data, ensure_ascii=False)[:6000]
    user_prompt = (
        f"Primary language: {req.language}\n\n"
        "Job description:\n"
        f"{req.job_description[:4000]}\n\n"
        "Candidate resume (JSON):\n"
        f"{resume_blob}"
    )

    try:
        data = await client.json_completion(
            system_prompt=IMPROVE_FOR_JOB_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=1800,
        )
    except Exception as exc:  # noqa: BLE001
        raise upstream_error(exc) from exc

    raw_suggestions = data.get("suggestions") or []
    suggestions: list[JobImprovement] = []
    if isinstance(raw_suggestions, list):
        for entry in raw_suggestions:
            if not isinstance(entry, dict):
                continue
            suggestions.append(
                JobImprovement(
                    section=coerce_str(entry.get("section")),
                    suggestion=coerce_str(entry.get("suggestion")),
                )
            )

    return ImproveForJobResponse(
        tailored_bio=coerce_str(data.get("tailored_bio")),
        keyword_matches=coerce_str_list(data.get("keyword_matches")),
        missing_keywords=coerce_str_list(data.get("missing_keywords")),
        suggestions=suggestions,
    )
