from __future__ import annotations

import functools
import logging
from typing import Callable, Sequence

from fastapi import HTTPException, Request, status

from app.config import SubscriptionPlan, UserRole

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Role hierarchy: admin > manager > viewer
# ---------------------------------------------------------------------------

ROLE_HIERARCHY = {
    UserRole.admin: 3,
    UserRole.manager: 2,
    UserRole.viewer: 1,
}


def _role_level(role: str) -> int:
    try:
        return ROLE_HIERARCHY[UserRole(role)]
    except (ValueError, KeyError):
        return 0


def _plan_level(plan: str) -> int:
    order = {
        SubscriptionPlan.starter: 1,
        SubscriptionPlan.pro: 2,
        SubscriptionPlan.business: 3,
    }
    try:
        return order[SubscriptionPlan(plan)]
    except (ValueError, KeyError):
        return 0


# ---------------------------------------------------------------------------
# Dependency factories
# ---------------------------------------------------------------------------


def require_role(*roles: str) -> Callable:
    """
    FastAPI dependency factory.

    Usage::

        @router.get("/admin-only")
        async def admin_route(
            request: Request,
            _: None = Depends(require_role("admin")),
        ):
            ...
    """
    required_roles = set(roles)

    async def dependency(request: Request) -> None:
        user_role: str = getattr(request.state, "user_role", "viewer")
        if user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role. Required: {required_roles}, your role: {user_role}",
            )

    return dependency


def require_min_role(min_role: str) -> Callable:
    """
    Require that the user has at least the given role level.

    Example: require_min_role("manager") → accepts manager and admin.
    """
    min_level = _role_level(min_role)

    async def dependency(request: Request) -> None:
        user_role: str = getattr(request.state, "user_role", "viewer")
        if _role_level(user_role) < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role. Minimum required: {min_role}, your role: {user_role}",
            )

    return dependency


def require_plan(*plans: str) -> Callable:
    """
    FastAPI dependency factory that checks subscription plan.

    Usage::

        @router.get("/pro-feature")
        async def pro_feature(
            request: Request,
            _: None = Depends(require_plan("pro", "business")),
        ):
            ...
    """
    required_plans = set(plans)

    async def dependency(request: Request) -> None:
        org_plan: str = getattr(request.state, "org_plan", "starter")
        if org_plan not in required_plans:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Plan upgrade required. This feature requires: {required_plans}. Your plan: {org_plan}",
            )

    return dependency


def require_min_plan(min_plan: str) -> Callable:
    """
    Require at least the given plan level.

    Example: require_min_plan("pro") → accepts pro and business.
    """
    min_level = _plan_level(min_plan)

    async def dependency(request: Request) -> None:
        org_plan: str = getattr(request.state, "org_plan", "starter")
        if _plan_level(org_plan) < min_level:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Plan upgrade required. Minimum plan: {min_plan}, your plan: {org_plan}",
            )

    return dependency


# ---------------------------------------------------------------------------
# Class-based checker (for use inside route handlers)
# ---------------------------------------------------------------------------


class RBACChecker:
    """Synchronous helper for inline role/plan checks inside route handlers."""

    @staticmethod
    def assert_role(request: Request, *roles: str) -> None:
        user_role = getattr(request.state, "user_role", "viewer")
        if user_role not in set(roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires role(s): {roles}",
            )

    @staticmethod
    def assert_min_role(request: Request, min_role: str) -> None:
        user_role = getattr(request.state, "user_role", "viewer")
        if _role_level(user_role) < _role_level(min_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires minimum role: {min_role}",
            )

    @staticmethod
    def assert_plan(request: Request, *plans: str) -> None:
        org_plan = getattr(request.state, "org_plan", "starter")
        if org_plan not in set(plans):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Action requires plan(s): {plans}",
            )

    @staticmethod
    def assert_min_plan(request: Request, min_plan: str) -> None:
        org_plan = getattr(request.state, "org_plan", "starter")
        if _plan_level(org_plan) < _plan_level(min_plan):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Action requires minimum plan: {min_plan}",
            )


rbac = RBACChecker()
