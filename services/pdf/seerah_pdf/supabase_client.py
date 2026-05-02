"""Service-role Supabase access for the PDF service.

Used to verify that the requesting user owns the resume id they're trying
to export. The service-role key bypasses RLS, so we MUST always include
`user_id = ?` in the query — RLS isn't there to back us up.
"""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client | None:
    """Return a cached service-role client, or None if unconfigured."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def assert_resume_owner(resume_id: str, user_id: str) -> bool:
    """Return True iff the resume belongs to the user (or no client configured)."""
    client = get_supabase_admin()
    if client is None:
        # Permissive in dev (the Next.js side will have already gated the request).
        return True
    response = (
        client.table("resumes")
        .select("id")
        .eq("id", resume_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return bool(response.data)
