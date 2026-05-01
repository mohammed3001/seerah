"""POST /ai/chat — streaming SSE chat with the user's resume context."""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ..auth import require_internal_token
from ..openai_client import get_openai_client
from ..prompts import chat_system_prompt
from ..schemas import ChatRequest
from ._common import enforce_rate_limit

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_internal_token)])
logger = logging.getLogger(__name__)


def _sse(event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    rate = await enforce_rate_limit(req.caller.user_id, req.caller.plan)
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "X-RateLimit-Limit": str(rate.limit),
        "X-RateLimit-Remaining": str(rate.remaining),
        "X-RateLimit-Reset": str(rate.reset_at),
    }

    client = get_openai_client()
    system = chat_system_prompt(req.language, req.resume_context)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    async def event_stream() -> asyncio.AsyncIterator[str]:
        yield _sse(
            "rate_limit",
            {"limit": rate.limit, "remaining": rate.remaining, "reset_at": rate.reset_at},
        )
        try:
            async for chunk in client.stream_chat(
                system_prompt=system,
                messages=messages,
            ):
                yield _sse("delta", {"content": chunk})
        except Exception as exc:  # noqa: BLE001
            logger.exception("chat stream failed")
            yield _sse(
                "error",
                {
                    "error": "upstream_unavailable",
                    "message_ar": "تعذر إكمال المحادثة. يرجى المحاولة لاحقاً.",
                    "message_en": "The conversation failed. Please try again.",
                    "detail": str(exc),
                },
            )
            return
        yield _sse("done", {"finish_reason": "stop"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers=headers,
    )
