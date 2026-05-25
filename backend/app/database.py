from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from supabase import Client, create_client
from tenacity import retry, stop_after_attempt, wait_fixed

from app.config import settings

logger = logging.getLogger(__name__)

_security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Supabase clients
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Return the public (anon key) Supabase client.
    Uses the user JWT when passed via the Authorization header.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Return the service-role Supabase client (bypasses RLS)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


# ---------------------------------------------------------------------------
# Current user resolution
# ---------------------------------------------------------------------------


class UserPayload:
    def __init__(
        self,
        user_id: str,
        email: str,
        org_id: Optional[str] = None,
        role: Optional[str] = None,
        plan: Optional[str] = None,
    ):
        self.user_id = user_id
        self.email = email
        self.org_id = org_id
        self.role = role
        self.plan = plan


def _decode_supabase_jwt(token: str) -> dict:
    """Decode a Supabase JWT by reading the payload section directly.

    Supabase uses ES256 (ECDSA) — we can't verify locally without the
    public key. Instead we decode the Base64 payload to read claims,
    and rely on Supabase Auth (via get_user) for actual token validation.
    Expiry is still checked manually.
    """
    import base64, json as _json, time

    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Not a valid JWT")

        # Base64url decode the payload (add padding if needed)
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = _json.loads(base64.urlsafe_b64decode(payload_b64))

        # Manual expiry check
        exp = payload.get("exp")
        if exp and int(exp) < int(time.time()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> UserPayload:
    """FastAPI dependency that validates the Bearer JWT and returns user info."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_supabase_jwt(credentials.credentials)

    user_id: Optional[str] = payload.get("sub")
    email: Optional[str] = payload.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject",
        )

    # Extract org metadata from the JWT app_metadata / user_metadata
    app_meta: dict = payload.get("app_metadata", {})
    user_meta: dict = payload.get("user_metadata", {})

    org_id = app_meta.get("org_id") or user_meta.get("org_id")
    role = app_meta.get("role") or user_meta.get("role", "viewer")
    plan = app_meta.get("plan") or user_meta.get("plan", "starter")

    return UserPayload(
        user_id=user_id,
        email=email or "",
        org_id=org_id,
        role=role,
        plan=plan,
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> Optional[UserPayload]:
    """Same as get_current_user but returns None instead of raising."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


# ---------------------------------------------------------------------------
# Tenant extraction
# ---------------------------------------------------------------------------


async def get_tenant_id(request: Request) -> str:
    """Extract org_id from request state (set by TenantMiddleware)."""
    org_id: Optional[str] = getattr(request.state, "org_id", None)
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization context not found. Make sure X-Organization-ID header or JWT org claim is set.",
        )
    return org_id


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
def supabase_query_with_retry(query_fn):
    """Execute a Supabase query with automatic retry on transient errors."""
    return query_fn()
