"""POST /ai/smart-fill — extract structured resume data from PDF/image.

LinkedIn URLs are intentionally rejected. LinkedIn aggressively rate-limits
unauthenticated scrapes and forbids them in their ToS, so we ask the user
to upload a "Save to PDF" export of their LinkedIn profile instead and run
that through the same vision pipeline.
"""

from __future__ import annotations

import base64
import binascii

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..auth import require_internal_token
from ..openai_client import get_openai_client
from ..prompts import SMART_FILL_SYSTEM_PROMPT
from ..schemas import ErrorResponse, SmartFillRequest, SmartFillResponse
from ._common import coerce_str, enforce_rate_limit, upstream_error

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_internal_token)])

# Common image format magic bytes. Order matters because some prefixes are
# overlapping (RIFF for WEBP must be checked alongside the trailing tag).
_IMAGE_MAGIC: tuple[tuple[bytes, str], ...] = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
)


def _sniff_image_mime(b64: str, *, default: str = "image/png") -> str:
    """Detect MIME type from the first bytes of a base64-encoded image.

    OpenAI Vision rejects ``data:image/png`` URLs whose payload is actually
    JPEG/WEBP, so we sniff the magic bytes rather than hard-coding a single
    type. Falls back to ``default`` if the input is too short or otherwise
    unrecognisable.
    """
    try:
        # Decode only the first ~32 bytes — enough for any magic-byte check.
        head = base64.b64decode(b64[:64], validate=False)
    except (binascii.Error, ValueError):
        return default
    for prefix, mime in _IMAGE_MAGIC:
        if head.startswith(prefix):
            return mime
    # WEBP: "RIFF" + 4-byte length + "WEBP".
    if head.startswith(b"RIFF") and head[8:12] == b"WEBP":
        return "image/webp"
    return default


@router.post("/smart-fill", response_model=SmartFillResponse)
async def smart_fill(req: SmartFillRequest, response: Response) -> SmartFillResponse:
    if req.file_type == "linkedin_url":
        body = ErrorResponse(
            error="linkedin_scraping_unsupported",
            message_ar=(
                "لا ندعم استخراج البيانات من رابط LinkedIn مباشرة. "
                "افتح ملفك على LinkedIn → More → Save to PDF، ثم ارفع الملف هنا."
            ),
            message_en=(
                "Direct LinkedIn URL scraping is not supported. "
                "Export your LinkedIn profile via 'More → Save to PDF' and upload the file."
            ),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=body.model_dump(),
        )

    if not req.uploaded_file_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="uploaded_file_base64 is required for pdf/image",
        )

    rate = await enforce_rate_limit(req.caller.user_id, req.caller.plan)
    response.headers["X-RateLimit-Limit"] = str(rate.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate.remaining)
    response.headers["X-RateLimit-Reset"] = str(rate.reset_at)

    if req.file_type == "pdf":
        mime = "application/pdf"
    else:
        mime = _sniff_image_mime(req.uploaded_file_base64)
    data_url = f"data:{mime};base64,{req.uploaded_file_base64}"
    attachments = [{"type": "image_url", "image_url": {"url": data_url}}]

    client = get_openai_client()
    user_prompt = (
        f"Primary language: {req.language}\n"
        "Extract a structured resume from the attached document."
    )

    try:
        data = await client.json_completion(
            system_prompt=SMART_FILL_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            attachments=attachments,
            temperature=0.1,
            max_tokens=3000,
        )
    except Exception as exc:  # noqa: BLE001
        raise upstream_error(exc) from exc

    extracted = data.get("extracted_data")
    if not isinstance(extracted, dict):
        extracted = {}

    confidence_raw = data.get("confidence_scores")
    confidence: dict[str, float] = {}
    if isinstance(confidence_raw, dict):
        for key, value in confidence_raw.items():
            try:
                confidence[str(key)] = max(0.0, min(1.0, float(value)))
            except (TypeError, ValueError):
                continue

    return SmartFillResponse(
        extracted_data=extracted,
        confidence_scores=confidence,
        notes=coerce_str(data.get("notes")),
    )
