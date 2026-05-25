from __future__ import annotations

import logging
import re
from typing import Optional

from fastapi import Request, Response
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.config import settings

logger = logging.getLogger(__name__)

# Paths that bypass tenant resolution
EXCLUDED_PATH_PATTERNS = [
    re.compile(r"^/health"),
    re.compile(r"^/api/docs"),
    re.compile(r"^/api/redoc"),
    re.compile(r"^/openapi\.json"),
    re.compile(r"^/auth/"),
    re.compile(r"^/billing/webhooks/"),
    re.compile(r"^/whatsapp/webhooks/"),
]


def _is_excluded(path: str) -> bool:
    return any(pattern.match(path) for pattern in EXCLUDED_PATH_PATTERNS)


def _extract_bearer_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def _decode_jwt_safe(token: str) -> dict:
    """Decode JWT payload without signature verification (Supabase uses ES256)."""
    try:
        import base64 as _b64
        import json as _json
        parts = token.split(".")
        if len(parts) != 3:
            return {}
        pad = parts[1] + "=" * (-len(parts[1]) % 4)
        return _json.loads(_b64.urlsafe_b64decode(pad))
    except Exception:
        return {}


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware that resolves tenant context for every authenticated request.

    Sets the following on ``request.state``:
        - user_id  (str | None)
        - org_id   (str | None)
        - user_role (str)
        - org_plan  (str)
        - raw_token (str | None)
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response:
        # Initialise state defaults
        request.state.user_id = None
        request.state.org_id = None
        request.state.user_role = "viewer"
        request.state.org_plan = "starter"
        request.state.raw_token = None

        if _is_excluded(request.url.path):
            return await call_next(request)

        token = _extract_bearer_token(request)
        if token:
            request.state.raw_token = token
            payload = _decode_jwt_safe(token)

            if payload:
                request.state.user_id = payload.get("sub")

                app_meta: dict = payload.get("app_metadata", {})
                user_meta: dict = payload.get("user_metadata", {})

                # Org ID: prefer JWT claim, fallback to header
                org_id = (
                    app_meta.get("org_id")
                    or user_meta.get("org_id")
                    or request.headers.get("X-Organization-ID")
                )
                request.state.org_id = org_id
                request.state.user_role = (
                    app_meta.get("role") or user_meta.get("role") or "viewer"
                )
                request.state.org_plan = (
                    app_meta.get("plan") or user_meta.get("plan") or "starter"
                )
        else:
            # Allow unauthenticated requests through; individual routes enforce auth
            org_id = request.headers.get("X-Organization-ID")
            request.state.org_id = org_id

        response = await call_next(request)
        return response
