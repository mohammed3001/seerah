"""Service-to-service authentication for the export endpoints."""

from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, status

from .config import get_settings


async def require_internal_token(authorization: str = Header(default="")) -> None:
    """Reject any request not bearing the configured PDF service token.

    The token is provisioned per-environment as `PDF_SERVICE_INTERNAL_TOKEN`.
    Comparison is constant-time so timing attacks can't leak the token.
    """
    expected = get_settings().pdf_service_internal_token
    if not expected:
        # No token configured — only allow in dev (caller is presumed local).
        return

    provided = ""
    if authorization.lower().startswith("bearer "):
        provided = authorization[len("bearer ") :].strip()

    if not provided or not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "غير مصرح",
                "error_en": "Unauthorized.",
            },
        )
