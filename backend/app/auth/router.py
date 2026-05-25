from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from app.config import settings
from app.database import get_current_user, get_supabase_admin, get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    organization_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    access_token: str
    new_password: str = Field(..., min_length=8)


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None


class MFAEnrollRequest(BaseModel):
    factor_type: str = "totp"


class MFAVerifyRequest(BaseModel):
    factor_id: str
    code: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    phone: Optional[str]
    timezone: Optional[str]
    language: Optional[str]
    org_id: Optional[str]
    role: Optional[str]
    created_at: Optional[str]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    """Create a new user account and optionally bootstrap an organization."""
    supabase = get_supabase_client()
    admin_client = get_supabase_admin()

    # 1. Create the auth user
    try:
        auth_response = supabase.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {exc}",
        ) from exc

    if not auth_response.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed: no user returned",
        )

    user_id = auth_response.user.id

    # 2. Insert profile row
    try:
        admin_client.table("user_profiles").insert(
            {
                "id": user_id,
                "email": body.email,
                "full_name": body.full_name,
                "created_at": datetime.utcnow().isoformat(),
            }
        ).execute()
    except Exception as exc:
        logger.warning("Could not insert profile for %s: %s", user_id, exc)

    # 3. Optionally create organisation
    if body.organization_name:
        try:
            org_res = admin_client.table("organizations").insert(
                {
                    "name": body.organization_name,
                    "owner_id": user_id,
                    "plan": "starter",
                    "created_at": datetime.utcnow().isoformat(),
                }
            ).execute()
            if org_res.data:
                org_id = org_res.data[0]["id"]
                admin_client.table("org_members").insert(
                    {"org_id": org_id, "user_id": user_id, "role": "admin"}
                ).execute()
        except Exception as exc:
            logger.warning("Could not create org during registration: %s", exc)

    session = auth_response.session
    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check your email to confirm your account before logging in.",
        )

    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_in=session.expires_in or 3600,
        user={"id": user_id, "email": body.email, "full_name": body.full_name},
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """Authenticate with email + password."""
    supabase = get_supabase_client()
    try:
        auth_response = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid credentials: {exc}",
        ) from exc

    if not auth_response.user or not auth_response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    session = auth_response.session
    user = auth_response.user

    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_in=session.expires_in or 3600,
        user={
            "id": user.id,
            "email": user.email,
            "user_metadata": user.user_metadata,
        },
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user=Depends(get_current_user)):
    """Invalidate the current session."""
    supabase = get_supabase_client()
    try:
        supabase.auth.sign_out()
    except Exception as exc:
        logger.warning("Logout error for user %s: %s", current_user.user_id, exc)


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(body: RefreshRequest):
    """Exchange a refresh token for a new access token."""
    supabase = get_supabase_client()
    try:
        auth_response = supabase.auth.refresh_session(body.refresh_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not refresh session: {exc}",
        ) from exc

    if not auth_response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    session = auth_response.session
    user = auth_response.user

    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_in=session.expires_in or 3600,
        user={"id": user.id if user else "", "email": user.email if user else ""},
    )


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
async def forgot_password(body: ForgotPasswordRequest):
    """Send a password reset email."""
    supabase = get_supabase_client()
    try:
        supabase.auth.reset_password_email(
            body.email,
            options={"redirect_to": f"{settings.FRONTEND_URL}/auth/reset-password"},
        )
    except Exception as exc:
        logger.warning("Forgot password error: %s", exc)
        # Do not leak whether email exists
    # Always return 204 to prevent user enumeration


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(body: ResetPasswordRequest):
    """Set a new password using the token from the reset email."""
    supabase = get_supabase_client()
    try:
        # Set the session from the recovery token
        supabase.auth.set_session(body.access_token, body.access_token)
        supabase.auth.update_user({"password": body.new_password})
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not reset password: {exc}",
        ) from exc


@router.get("/me", response_model=UserProfile)
async def get_me(current_user=Depends(get_current_user)):
    """Return the current user's profile."""
    admin_client = get_supabase_admin()
    try:
        result = (
            admin_client.table("user_profiles")
            .select("*")
            .eq("id", current_user.user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        ) from exc

    profile = result.data or {}
    return UserProfile(
        id=current_user.user_id,
        email=current_user.email,
        full_name=profile.get("full_name"),
        avatar_url=profile.get("avatar_url"),
        phone=profile.get("phone"),
        timezone=profile.get("timezone"),
        language=profile.get("language"),
        org_id=current_user.org_id,
        role=current_user.role,
        created_at=profile.get("created_at"),
    )


@router.put("/me", response_model=UserProfile)
async def update_me(body: UpdateProfileRequest, current_user=Depends(get_current_user)):
    """Update the current user's profile."""
    admin_client = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    try:
        result = (
            admin_client.table("user_profiles")
            .update(update_data)
            .eq("id", current_user.user_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not update profile: {exc}",
        ) from exc

    profile = result.data[0] if result.data else {}
    return UserProfile(
        id=current_user.user_id,
        email=current_user.email,
        full_name=profile.get("full_name"),
        avatar_url=profile.get("avatar_url"),
        phone=profile.get("phone"),
        timezone=profile.get("timezone"),
        language=profile.get("language"),
        org_id=current_user.org_id,
        role=current_user.role,
        created_at=profile.get("created_at"),
    )


@router.post("/mfa/enroll")
async def mfa_enroll(body: MFAEnrollRequest, current_user=Depends(get_current_user)):
    """Begin MFA enrollment (returns QR code / secret for TOTP)."""
    supabase = get_supabase_client()
    try:
        response = supabase.auth.mfa.enroll({"factor_type": body.factor_type})
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MFA enroll failed: {exc}",
        ) from exc

    return {
        "factor_id": response.id,
        "totp": {
            "qr_code": response.totp.qr_code if response.totp else None,
            "secret": response.totp.secret if response.totp else None,
            "uri": response.totp.uri if response.totp else None,
        },
    }


@router.post("/mfa/verify")
async def mfa_verify(body: MFAVerifyRequest, current_user=Depends(get_current_user)):
    """Verify an MFA challenge and complete enrollment or authentication."""
    supabase = get_supabase_client()
    try:
        challenge = supabase.auth.mfa.challenge({"factor_id": body.factor_id})
        verify_response = supabase.auth.mfa.verify(
            {
                "factor_id": body.factor_id,
                "challenge_id": challenge.id,
                "code": body.code,
            }
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MFA verification failed: {exc}",
        ) from exc

    return {
        "verified": True,
        "access_token": verify_response.access_token if hasattr(verify_response, "access_token") else None,
    }
