from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, HttpUrl

from app.database import get_current_user, get_supabase_admin, get_tenant_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class NotificationPreferences(BaseModel):
    email_enabled: bool = True
    push_enabled: bool = True
    whatsapp_enabled: bool = False
    digest_frequency: str = "realtime"  # realtime, hourly, daily, weekly
    notify_on: Optional[Dict[str, bool]] = {
        "task_assigned": True,
        "task_due": True,
        "mention": True,
        "campaign_sent": True,
        "lead_stage_changed": True,
        "billing_alert": True,
        "team_invite": True,
        "sprint_started": True,
        "sprint_closed": True,
        "anomaly_detected": True,
    }
    quiet_hours_start: Optional[str] = None  # "22:00"
    quiet_hours_end: Optional[str] = None  # "08:00"


class WebhookCreate(BaseModel):
    name: str = Field(..., max_length=200)
    url: str = Field(..., max_length=500)
    events: List[str] = Field(..., description="List of event types to subscribe to")
    secret: Optional[str] = None  # For signature verification
    active: bool = True
    headers: Optional[Dict[str, str]] = {}


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None
    active: Optional[bool] = None
    headers: Optional[Dict[str, str]] = None


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _now() -> str:
    return datetime.utcnow().isoformat()


# ---------------------------------------------------------------------------
# Notification routes
# ---------------------------------------------------------------------------


@router.get("")
async def list_notifications(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    page: int = 1,
    page_size: int = 30,
    unread_only: bool = False,
    notification_type: Optional[str] = None,
):
    """List notifications for the current user."""
    admin = get_supabase_admin()
    offset = (page - 1) * page_size

    query = (
        admin.table("notifications")
        .select("*")
        .eq("user_id", current_user.user_id)
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if unread_only:
        query = query.eq("is_read", False)
    if notification_type:
        query = query.eq("type", notification_type)

    result = query.execute()

    # Unread count
    unread_res = (
        admin.table("notifications")
        .select("id", count="exact")
        .eq("user_id", current_user.user_id)
        .eq("org_id", org_id)
        .eq("is_read", False)
        .execute()
    )
    unread_count = unread_res.count if hasattr(unread_res, "count") else len(unread_res.data or [])

    return {
        "data": result.data or [],
        "page": page,
        "page_size": page_size,
        "unread_count": unread_count,
    }


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Mark a single notification as read."""
    admin = get_supabase_admin()
    result = (
        admin.table("notifications")
        .update({"is_read": True, "read_at": _now()})
        .eq("id", notification_id)
        .eq("user_id", current_user.user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return result.data[0]


@router.put("/read-all")
async def mark_all_notifications_read(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    admin = get_supabase_admin()
    admin.table("notifications").update({"is_read": True, "read_at": _now()}).eq("user_id", current_user.user_id).eq("org_id", org_id).eq("is_read", False).execute()
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Delete a notification."""
    admin = get_supabase_admin()
    admin.table("notifications").delete().eq("id", notification_id).eq("user_id", current_user.user_id).execute()


# ---------------------------------------------------------------------------
# Preference routes
# ---------------------------------------------------------------------------


@router.get("/preferences")
async def get_preferences(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Get notification preferences for the current user."""
    admin = get_supabase_admin()
    result = (
        admin.table("notification_preferences")
        .select("*")
        .eq("user_id", current_user.user_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        # Return defaults
        return NotificationPreferences().model_dump()
    return result.data


@router.put("/preferences")
async def update_preferences(
    body: NotificationPreferences,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Upsert notification preferences."""
    admin = get_supabase_admin()

    # Check if preferences exist
    existing = (
        admin.table("notification_preferences")
        .select("id")
        .eq("user_id", current_user.user_id)
        .eq("org_id", org_id)
        .execute()
    )

    data = {
        **body.model_dump(),
        "user_id": current_user.user_id,
        "org_id": org_id,
        "updated_at": _now(),
    }

    if existing.data:
        result = (
            admin.table("notification_preferences")
            .update(data)
            .eq("user_id", current_user.user_id)
            .eq("org_id", org_id)
            .execute()
        )
    else:
        data["created_at"] = _now()
        result = admin.table("notification_preferences").insert(data).execute()

    return result.data[0] if result.data else data


# ---------------------------------------------------------------------------
# Webhook routes
# ---------------------------------------------------------------------------

AVAILABLE_EVENTS = [
    "task.created", "task.updated", "task.completed", "task.assigned",
    "lead.created", "lead.stage_changed", "lead.won", "lead.lost",
    "campaign.sent", "campaign.completed",
    "member.invited", "member.joined", "member.removed",
    "billing.subscription_updated", "billing.payment_failed",
    "sprint.started", "sprint.closed",
    "project.created", "project.completed",
    "whatsapp.message_received", "whatsapp.conversation_resolved",
    "analytics.anomaly_detected", "analytics.alert_triggered",
]


@router.post("/webhooks", status_code=status.HTTP_201_CREATED)
async def create_webhook(
    body: WebhookCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Register a new outbound webhook endpoint."""
    # Validate events
    invalid_events = [e for e in body.events if e not in AVAILABLE_EVENTS]
    if invalid_events:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid events: {invalid_events}. Available: {AVAILABLE_EVENTS}",
        )

    admin = get_supabase_admin()

    # Generate signing secret if not provided
    signing_secret = body.secret or secrets.token_hex(32)
    secret_hash = hashlib.sha256(signing_secret.encode()).hexdigest()

    data = {
        "name": body.name,
        "url": body.url,
        "events": body.events,
        "secret_hash": secret_hash,
        "active": body.active,
        "headers": body.headers or {},
        "org_id": org_id,
        "created_by": current_user.user_id,
        "created_at": _now(),
        "delivery_count": 0,
        "failure_count": 0,
    }

    result = admin.table("webhooks").insert(data).execute()
    webhook = result.data[0]

    # Return signing secret ONCE (not stored in plain text)
    return {
        **webhook,
        "signing_secret": signing_secret,
        "message": "Save the signing_secret - it will not be shown again",
    }


@router.get("/webhooks")
async def list_webhooks(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """List all configured webhooks for the organization."""
    admin = get_supabase_admin()
    result = (
        admin.table("webhooks")
        .select("id, name, url, events, active, created_at, delivery_count, failure_count, last_delivery_at")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {
        "data": result.data or [],
        "available_events": AVAILABLE_EVENTS,
    }


@router.get("/webhooks/{webhook_id}")
async def get_webhook(
    webhook_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("webhooks")
        .select("id, name, url, events, active, headers, created_at, delivery_count, failure_count")
        .eq("id", webhook_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    return result.data


@router.put("/webhooks/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    body: WebhookUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Update a webhook configuration."""
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)

    if "events" in update_data:
        invalid = [e for e in update_data["events"] if e not in AVAILABLE_EVENTS]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid events: {invalid}")

    update_data["updated_at"] = _now()
    result = admin.table("webhooks").update(update_data).eq("id", webhook_id).eq("org_id", org_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    return result.data[0]


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("webhooks").delete().eq("id", webhook_id).eq("org_id", org_id).execute()


@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Send a test delivery to a webhook endpoint."""
    import httpx

    admin = get_supabase_admin()
    result = admin.table("webhooks").select("url, headers, secret_hash").eq("id", webhook_id).eq("org_id", org_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Webhook not found")

    webhook = result.data
    payload = {
        "event": "webhook.test",
        "org_id": org_id,
        "timestamp": _now(),
        "data": {"message": "This is a test delivery from NexusOS"},
    }

    import json
    import hmac
    body_bytes = json.dumps(payload).encode()
    signature = hmac.new(
        webhook["secret_hash"].encode(),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "X-NexusOS-Signature": f"sha256={signature}",
        "X-NexusOS-Event": "webhook.test",
        **(webhook.get("headers") or {}),
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(webhook["url"], json=payload, headers=headers)
        return {
            "success": response.status_code < 400,
            "status_code": response.status_code,
            "response_body": response.text[:500],
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}
