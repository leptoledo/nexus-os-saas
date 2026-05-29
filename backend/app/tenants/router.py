from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from app.config import UserRole
from app.database import get_current_user, get_supabase_admin, get_tenant_id
from app.middleware.rbac import require_min_role, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/organizations", tags=["Organizations / Tenants"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class CreateOrgRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: Optional[str] = Field(None, max_length=60)
    sector: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: Optional[str] = "Europe/Lisbon"


class UpdateOrgRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    logo_url: Optional[str] = None
    sector: Optional[str] = None
    timezone: Optional[str] = None


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.viewer
    message: Optional[str] = None


class UpdateMemberRoleRequest(BaseModel):
    role: UserRole


class OnboardingStepRequest(BaseModel):
    step: str  # e.g. "profile", "invite_team", "connect_integrations", "billing"
    data: Optional[Dict[str, Any]] = None


class OrgResponse(BaseModel):
    id: str
    name: str
    slug: Optional[str]
    plan: str
    sector: Optional[str]
    logo_url: Optional[str]
    timezone: Optional[str]
    created_at: str


class MemberResponse(BaseModel):
    user_id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    joined_at: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: CreateOrgRequest, current_user=Depends(get_current_user)
):
    """Create a new organization and set caller as admin.

    Idempotent: if the caller is already a member of an organization, that
    organization is returned instead of creating a duplicate.
    """
    admin_client = get_supabase_admin()

    # Idempotency: if user is already a member, update name/sector and return existing org
    existing_membership = (
        admin_client.table("organization_members")
        .select("org_id")
        .eq("user_id", current_user.user_id)
        .limit(1)
        .execute()
    )
    if existing_membership.data:
        existing_org_id = existing_membership.data[0]["org_id"]
        # Apply the submitted name / sector so re-submitting the form updates the org
        update_payload: Dict[str, Any] = {"name": body.name}
        if body.sector:
            update_payload["sector"] = body.sector
        admin_client.table("organizations").update(update_payload).eq("id", existing_org_id).execute()
        existing_org = (
            admin_client.table("organizations")
            .select("*")
            .eq("id", existing_org_id)
            .single()
            .execute()
        )
        if existing_org.data:
            return OrgResponse(**existing_org.data)

    # Build slug from name if not provided
    slug = body.slug or body.name.lower().replace(" ", "-")

    # Check slug uniqueness
    existing = (
        admin_client.table("organizations").select("id").eq("slug", slug).execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Organization slug '{slug}' is already taken.",
        )

    now = datetime.utcnow().isoformat()
    try:
        org_res = (
            admin_client.table("organizations")
            .insert(
                {
                    "name": body.name,
                    "slug": slug,
                    "plan": "starter",
                    "sector": body.sector,
                    "logo_url": body.logo_url,
                    "timezone": body.timezone or "Europe/Lisbon",
                    "onboarding_completed": False,
                }
            )
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not create organization: {exc}",
        ) from exc

    org = org_res.data[0]

    # Add caller as admin member
    admin_client.table("organization_members").insert(
        {
            "org_id": org["id"],
            "user_id": current_user.user_id,
            "role": "admin",
            "joined_at": now,
        }
    ).execute()

    # Bootstrap onboarding steps
    for step_name in ["profile", "invite_team", "connect_integrations", "billing"]:
        try:
            admin_client.table("onboarding_steps").insert(
                {"org_id": org["id"], "step_name": step_name, "completed": False}
            ).execute()
        except Exception:
            pass  # Ignore if already exists

    # Update Supabase auth user app_metadata so JWT includes org_id on next refresh
    try:
        import httpx
        from app.config import settings as _settings
        async with httpx.AsyncClient() as _http:
            await _http.put(
                f"{_settings.SUPABASE_URL}/auth/v1/admin/users/{current_user.user_id}",
                headers={
                    "apikey": _settings.SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {_settings.SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json",
                },
                json={"app_metadata": {"org_id": org["id"], "role": "admin", "plan": "starter"}},
                timeout=10,
            )
    except Exception as exc:
        logger.warning("Could not update user app_metadata: %s", exc)

    return OrgResponse(**org)


@router.get("/me", response_model=OrgResponse)
async def get_my_organization(
    org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)
):
    """Return the current organization details."""
    admin_client = get_supabase_admin()
    result = (
        admin_client.table("organizations").select("*").eq("id", org_id).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return OrgResponse(**result.data)


@router.put("/me", response_model=OrgResponse)
async def update_my_organization(
    body: UpdateOrgRequest,
    request: Request,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    """Update organization details (manager or admin)."""
    admin_client = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update")

    result = (
        admin_client.table("organizations").update(update_data).eq("id", org_id).execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return OrgResponse(**result.data[0])


@router.get("/me/members", response_model=List[MemberResponse])
async def list_members(
    org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)
):
    """List all members of the organization."""
    admin_client = get_supabase_admin()
    result = (
        admin_client.table("organization_members")
        .select("user_id, role, joined_at, user_profiles(email, full_name, avatar_url)")
        .eq("org_id", org_id)
        .execute()
    )
    members = []
    for row in result.data or []:
        profile = row.get("user_profiles") or {}
        members.append(
            MemberResponse(
                user_id=row["user_id"],
                email=profile.get("email", ""),
                full_name=profile.get("full_name"),
                avatar_url=profile.get("avatar_url"),
                role=row["role"],
                joined_at=row["joined_at"],
            )
        )
    return members


@router.post("/me/invite", status_code=status.HTTP_201_CREATED)
async def invite_member(
    body: InviteMemberRequest,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    """Invite a new member via email."""
    admin_client = get_supabase_admin()
    now = datetime.utcnow().isoformat()

    # Create invitation record
    invite_res = (
        admin_client.table("org_invitations")
        .insert(
            {
                "org_id": org_id,
                "email": body.email,
                "role": body.role.value,
                "invited_by": current_user.user_id,
                "status": "pending",
                "message": body.message,
                "created_at": now,
            }
        )
        .execute()
    )

    invite = invite_res.data[0] if invite_res.data else {}

    # Queue invitation email via Celery
    try:
        from app.tasks.celery_app import send_notification_email

        org_result = (
            admin_client.table("organizations").select("name").eq("id", org_id).single().execute()
        )
        org_name = org_result.data.get("name", "NexusOS") if org_result.data else "NexusOS"
        invite_url = f"{__import__('app.config', fromlist=['settings']).settings.FRONTEND_URL}/invite/{invite.get('id')}"

        send_notification_email.delay(
            user_id=None,
            subject=f"You've been invited to join {org_name} on NexusOS",
            body=f"Click here to accept: {invite_url}\n\n{body.message or ''}",
            to_email=body.email,
        )
    except Exception as exc:
        logger.warning("Could not queue invitation email: %s", exc)

    return {"message": f"Invitation sent to {body.email}", "invitation_id": invite.get("id")}


@router.put("/me/members/{user_id}", response_model=MemberResponse)
async def update_member_role(
    user_id: str,
    body: UpdateMemberRoleRequest,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    """Change a member's role (admin only)."""
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )

    admin_client = get_supabase_admin()
    result = (
        admin_client.table("organization_members")
        .update({"role": body.role.value})
        .eq("org_id", org_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    row = result.data[0]
    profile_res = (
        admin_client.table("user_profiles").select("email, full_name, avatar_url").eq("id", user_id).single().execute()
    )
    profile = profile_res.data or {}

    return MemberResponse(
        user_id=user_id,
        email=profile.get("email", ""),
        full_name=profile.get("full_name"),
        avatar_url=profile.get("avatar_url"),
        role=row["role"],
        joined_at=row["joined_at"],
    )


@router.delete("/me/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    user_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    """Remove a member from the organization."""
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself",
        )

    admin_client = get_supabase_admin()
    admin_client.table("organization_members").delete().eq("org_id", org_id).eq("user_id", user_id).execute()


@router.post("/me/onboarding")
async def complete_onboarding_step(
    body: OnboardingStepRequest,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Mark an onboarding step as completed."""
    from datetime import timezone as tz
    admin_client = get_supabase_admin()

    now = datetime.now(tz.utc).isoformat()

    # Upsert this step as completed
    admin_client.table("onboarding_steps").upsert(
        {
            "org_id": org_id,
            "step_name": body.step,
            "completed": True,
            "completed_at": now,
            "data": body.data or {},
        },
        on_conflict="org_id,step_name",
    ).execute()

    # Check all steps
    all_steps_res = (
        admin_client.table("onboarding_steps")
        .select("step_name, completed")
        .eq("org_id", org_id)
        .execute()
    )
    steps = {row["step_name"]: row["completed"] for row in (all_steps_res.data or [])}
    all_complete = bool(steps) and all(steps.values())

    if all_complete:
        admin_client.table("organizations").update(
            {"onboarding_completed": True}
        ).eq("id", org_id).execute()

    return {"step": body.step, "completed": True, "all_complete": all_complete, "steps": steps}


@router.get("/me/onboarding")
async def get_onboarding(
    org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)
):
    """Get current onboarding state."""
    admin_client = get_supabase_admin()
    result = (
        admin_client.table("onboarding_steps")
        .select("step_name, completed, completed_at, data")
        .eq("org_id", org_id)
        .execute()
    )
    steps = {row["step_name"]: row["completed"] for row in (result.data or [])}
    all_complete = bool(steps) and all(steps.values())
    return {"org_id": org_id, "steps": steps, "completed": all_complete, "details": result.data or []}


@router.get("/me/audit-logs")
async def get_audit_logs(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    page: int = 1,
    page_size: int = 50,
    action: Optional[str] = None,
):
    """Return paginated audit log entries."""
    admin_client = get_supabase_admin()
    offset = (page - 1) * page_size

    query = (
        admin_client.table("audit_logs")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if action:
        query = query.eq("action", action)

    result = query.execute()
    return {
        "data": result.data or [],
        "page": page,
        "page_size": page_size,
        "total": len(result.data or []),
    }
