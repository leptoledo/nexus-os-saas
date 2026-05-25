from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from app.database import get_current_user, get_supabase_admin, get_tenant_id
from app.middleware.rbac import require_min_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketing", tags=["Marketing"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class CampaignCreate(BaseModel):
    name: str = Field(..., max_length=200)
    subject: str = Field(..., max_length=300)
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    segment_filters: Optional[Dict[str, Any]] = {}
    scheduled_at: Optional[datetime] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class LeadCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    stage: str = "new"  # new, qualified, proposal, negotiation, closed_won, closed_lost
    value_estimated: Optional[float] = None
    notes: Optional[str] = None
    assignee_id: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = {}


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    value_estimated: Optional[float] = None
    notes: Optional[str] = None
    assignee_id: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


class LeadStageUpdate(BaseModel):
    stage: str
    reason: Optional[str] = None


class ContentCalendarCreate(BaseModel):
    title: str = Field(..., max_length=200)
    content: Optional[str] = None
    platform: str  # instagram, linkedin, facebook, twitter
    scheduled_at: Optional[datetime] = None
    media_urls: Optional[List[str]] = []


class ContentCalendarUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    platform: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None


class SchedulePostRequest(BaseModel):
    scheduled_at: datetime
    channels: Optional[List[str]] = None


class LandingPageCreate(BaseModel):
    title: str = Field(..., max_length=200)
    slug: str = Field(..., max_length=100)
    content: Optional[Dict[str, Any]] = {}
    is_published: bool = False


class LandingPageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    is_published: Optional[bool] = None


class SEOKeywordCreate(BaseModel):
    keyword: str = Field(..., max_length=200)
    target_url: Optional[str] = None
    country: Optional[str] = "PT"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _now() -> str:
    return datetime.utcnow().isoformat()


def _not_found(entity: str = "Resource") -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity} not found")


# ---------------------------------------------------------------------------
# Campaign routes
# ---------------------------------------------------------------------------


@router.get("/campaigns")
async def list_campaigns(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
):
    admin = get_supabase_admin()
    offset = (page - 1) * page_size
    query = (
        admin.table("email_campaigns")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if search:
        query = query.ilike("name", f"%{search}%")
    result = query.execute()
    return {"data": result.data or [], "page": page, "page_size": page_size}


@router.post("/campaigns", status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    data = {
        **body.model_dump(),
        "org_id": org_id,
        "created_by": current_user.user_id,
        "status": "draft",
        "created_at": _now(),
    }
    if data.get("scheduled_at") and isinstance(data["scheduled_at"], datetime):
        data["scheduled_at"] = data["scheduled_at"].isoformat()
    result = admin.table("email_campaigns").insert(data).execute()
    return result.data[0]


@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("email_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        raise _not_found("Campaign")
    return result.data


@router.put("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    body: CampaignUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update")
    if "scheduled_at" in update_data and isinstance(update_data["scheduled_at"], datetime):
        update_data["scheduled_at"] = update_data["scheduled_at"].isoformat()
    result = (
        admin.table("email_campaigns")
        .update(update_data)
        .eq("id", campaign_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Campaign")
    return result.data[0]


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    admin.table("email_campaigns").delete().eq("id", campaign_id).eq("org_id", org_id).execute()


@router.post("/campaigns/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    """Queue campaign for sending via Celery."""
    admin = get_supabase_admin()
    result = (
        admin.table("email_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        raise _not_found("Campaign")
    campaign = result.data
    if campaign["status"] not in ("draft", "scheduled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot send campaign in status '{campaign['status']}'",
        )

    try:
        from app.tasks.celery_app import send_campaign_email
        send_campaign_email.delay(campaign_id, [])
    except Exception as exc:
        logger.warning("Could not queue campaign send: %s", exc)

    admin.table("email_campaigns").update({"status": "sending", "sent_at": _now()}).eq(
        "id", campaign_id
    ).execute()
    return {"message": "Campaign queued for sending", "campaign_id": campaign_id}


@router.get("/campaigns/{campaign_id}/stats")
async def campaign_stats(
    campaign_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Return campaign stats from the stats jsonb column in email_campaigns."""
    admin = get_supabase_admin()
    result = (
        admin.table("email_campaigns")
        .select("id, stats")
        .eq("id", campaign_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        raise _not_found("Campaign")
    stats = result.data.get("stats") or {}
    return {
        "campaign_id": campaign_id,
        "total_sent": stats.get("total_sent", 0),
        "opens": stats.get("opens", 0),
        "clicks": stats.get("clicks", 0),
        "bounces": stats.get("bounces", 0),
        "unsubscribes": stats.get("unsubscribes", 0),
        "open_rate": round(stats.get("opens", 0) / max(stats.get("total_sent", 1), 1) * 100, 2),
        "click_rate": round(stats.get("clicks", 0) / max(stats.get("total_sent", 1), 1) * 100, 2),
    }


# ---------------------------------------------------------------------------
# Leads / CRM routes
# ---------------------------------------------------------------------------


@router.get("/leads")
async def list_leads(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    page: int = 1,
    page_size: int = 20,
    stage: Optional[str] = None,
    assignee_id: Optional[str] = None,
    search: Optional[str] = None,
):
    admin = get_supabase_admin()
    offset = (page - 1) * page_size
    query = (
        admin.table("leads")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if stage:
        query = query.eq("stage", stage)
    if assignee_id:
        query = query.eq("assignee_id", assignee_id)
    if search:
        query = query.ilike("name", f"%{search}%")
    result = query.execute()
    return {"data": result.data or [], "page": page, "page_size": page_size}


@router.post("/leads", status_code=status.HTTP_201_CREATED)
async def create_lead(
    body: LeadCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    data = {**body.model_dump(), "org_id": org_id, "created_at": _now()}
    result = admin.table("leads").insert(data).execute()
    return result.data[0]


@router.get("/leads/pipeline")
async def leads_pipeline(
    org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)
):
    """Return Kanban view of leads grouped by stage."""
    admin = get_supabase_admin()
    result = admin.table("leads").select("*").eq("org_id", org_id).execute()
    stages = ["new", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]
    pipeline: Dict[str, List] = {s: [] for s in stages}
    for lead in result.data or []:
        stage = lead.get("stage", "new")
        if stage in pipeline:
            pipeline[stage].append(lead)
        else:
            pipeline["new"].append(lead)
    return {
        "columns": [
            {"id": s, "title": s.replace("_", " ").title(), "leads": pipeline[s]}
            for s in stages
        ]
    }


@router.get("/leads/{lead_id}")
async def get_lead(
    lead_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("leads")
        .select("*")
        .eq("id", lead_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        raise _not_found("Lead")
    return result.data


@router.put("/leads/{lead_id}")
async def update_lead(
    lead_id: str,
    body: LeadUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        admin.table("leads")
        .update(update_data)
        .eq("id", lead_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Lead")
    return result.data[0]


@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("leads").delete().eq("id", lead_id).eq("org_id", org_id).execute()


@router.put("/leads/{lead_id}/stage")
async def move_lead_stage(
    lead_id: str,
    body: LeadStageUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("leads")
        .update({"stage": body.stage})
        .eq("id", lead_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Lead")
    # Log as a note in lead_activities
    try:
        admin.table("lead_activities").insert({
            "lead_id": lead_id,
            "org_id": org_id,
            "user_id": current_user.user_id,
            "type": "note",
            "description": f"Moved to {body.stage}" + (f": {body.reason}" if body.reason else ""),
            "created_at": _now(),
        }).execute()
    except Exception as exc:
        logger.warning("Could not log stage change activity: %s", exc)
    return result.data[0]


# ---------------------------------------------------------------------------
# Content Calendar routes
# ---------------------------------------------------------------------------


@router.get("/content-calendar")
async def list_content_calendar(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    month: Optional[int] = None,
    year: Optional[int] = None,
    platform: Optional[str] = None,
):
    admin = get_supabase_admin()
    query = (
        admin.table("content_calendar")
        .select("*")
        .eq("org_id", org_id)
        .order("scheduled_at")
    )
    if platform:
        query = query.eq("platform", platform)
    result = query.execute()
    return {"data": result.data or []}


@router.post("/content-calendar", status_code=status.HTTP_201_CREATED)
async def create_content_item(
    body: ContentCalendarCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    data = body.model_dump()
    if data.get("scheduled_at") and isinstance(data["scheduled_at"], datetime):
        data["scheduled_at"] = data["scheduled_at"].isoformat()
    data.update({
        "org_id": org_id,
        "created_by": current_user.user_id,
        "status": "draft",
        "created_at": _now(),
    })
    result = admin.table("content_calendar").insert(data).execute()
    return result.data[0]


@router.get("/content-calendar/{item_id}")
async def get_content_item(
    item_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("content_calendar")
        .select("*")
        .eq("id", item_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        raise _not_found("Content item")
    return result.data


@router.put("/content-calendar/{item_id}")
async def update_content_item(
    item_id: str,
    body: ContentCalendarUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if "scheduled_at" in update_data and isinstance(update_data["scheduled_at"], datetime):
        update_data["scheduled_at"] = update_data["scheduled_at"].isoformat()
    result = (
        admin.table("content_calendar")
        .update(update_data)
        .eq("id", item_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Content item")
    return result.data[0]


@router.delete("/content-calendar/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content_item(
    item_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("content_calendar").delete().eq("id", item_id).eq("org_id", org_id).execute()


@router.post("/content-calendar/{item_id}/schedule")
async def schedule_content_post(
    item_id: str,
    body: SchedulePostRequest,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update = {"scheduled_at": body.scheduled_at.isoformat(), "status": "scheduled"}
    result = (
        admin.table("content_calendar")
        .update(update)
        .eq("id", item_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Content item")

    try:
        from app.tasks.celery_app import schedule_social_post
        schedule_social_post.apply_async(args=[item_id], eta=body.scheduled_at)
    except Exception as exc:
        logger.warning("Could not queue post: %s", exc)

    return {"message": "Post scheduled", "scheduled_at": body.scheduled_at.isoformat()}


# ---------------------------------------------------------------------------
# Landing Pages
# ---------------------------------------------------------------------------


@router.get("/landing-pages")
async def list_landing_pages(
    org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)
):
    admin = get_supabase_admin()
    result = (
        admin.table("landing_pages")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": result.data or []}


@router.post("/landing-pages", status_code=status.HTTP_201_CREATED)
async def create_landing_page(
    body: LandingPageCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    existing = (
        admin.table("landing_pages")
        .select("id")
        .eq("org_id", org_id)
        .eq("slug", body.slug)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Slug already in use")
    data = {
        **body.model_dump(),
        "org_id": org_id,
        "created_by": current_user.user_id,
        "created_at": _now(),
        "views_count": 0,
        "conversions_count": 0,
    }
    result = admin.table("landing_pages").insert(data).execute()
    return result.data[0]


@router.get("/landing-pages/{page_id}")
async def get_landing_page(
    page_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("landing_pages")
        .select("*")
        .eq("id", page_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        raise _not_found("Landing page")
    return result.data


@router.put("/landing-pages/{page_id}")
async def update_landing_page(
    page_id: str,
    body: LandingPageUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        admin.table("landing_pages")
        .update(update_data)
        .eq("id", page_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Landing page")
    return result.data[0]


@router.delete("/landing-pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_landing_page(
    page_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("landing_pages").delete().eq("id", page_id).eq("org_id", org_id).execute()


# ---------------------------------------------------------------------------
# SEO Keywords
# ---------------------------------------------------------------------------


@router.get("/seo/keywords")
async def list_seo_keywords(
    org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)
):
    admin = get_supabase_admin()
    result = (
        admin.table("seo_keywords")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": result.data or []}


@router.post("/seo/keywords", status_code=status.HTTP_201_CREATED)
async def add_seo_keyword(
    body: SEOKeywordCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    data = {
        **body.model_dump(),
        "org_id": org_id,
        "created_at": _now(),
        "current_position": None,
        "best_position": None,
        "monthly_volume": None,
    }
    result = admin.table("seo_keywords").insert(data).execute()
    return result.data[0]


# ---------------------------------------------------------------------------
# Marketing Analytics
# ---------------------------------------------------------------------------


@router.get("/analytics")
async def marketing_analytics(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Return aggregated marketing performance metrics."""
    admin = get_supabase_admin()

    campaigns_res = (
        admin.table("email_campaigns")
        .select("id, name, status, sent_at")
        .eq("org_id", org_id)
        .execute()
    )
    leads_res = admin.table("leads").select("id, stage, created_at").eq("org_id", org_id).execute()
    landing_res = (
        admin.table("landing_pages")
        .select("id, title, views_count, conversions_count")
        .eq("org_id", org_id)
        .execute()
    )

    campaigns = campaigns_res.data or []
    leads = leads_res.data or []
    landing_pages = landing_res.data or []

    total_leads = len(leads)
    won_leads = [l for l in leads if l.get("stage") == "closed_won"]
    conversion_rate = (len(won_leads) / total_leads * 100) if total_leads else 0

    return {
        "summary": {
            "total_campaigns": len(campaigns),
            "active_campaigns": len([c for c in campaigns if c["status"] == "sending"]),
            "total_leads": total_leads,
            "won_leads": len(won_leads),
            "conversion_rate": round(conversion_rate, 2),
            "total_landing_page_views": sum(p.get("views_count", 0) for p in landing_pages),
        },
        "campaigns": campaigns[:10],
        "top_landing_pages": sorted(
            landing_pages, key=lambda x: x.get("views_count", 0), reverse=True
        )[:5],
    }
