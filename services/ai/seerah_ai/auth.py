"""Service-to-service authentication via shared bearer token."""

from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status

from .config import get_settings


async def require_internal_token(
    authorization: str | None = Header(default=None),
) -> None:
    """Validate the internal token in the `Authorization: Bearer <token>` header.

    The frontend (Next.js server actions) is the only legitimate caller; user
    auth happens there before the request reaches us. We reject any request
    whose bearer token doesn't match `AI_SERVICE_INTERNAL_TOKEN`.

    If the token is unset (empty string in env), authentication is disabled
    — useful for local development against `pnpm dev` without secrets, but
    never deploy that way. The startup code logs a warning when this is
    detected.
    """

    settings = get_settings()
    expected = settings.internal_token
    if not expected:
        return  # auth disabled for local development

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    provided = authorization.split(" ", 1)[1].strip()
    if not secrets.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        )
