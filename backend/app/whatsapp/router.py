from __future__ import annotations

"""
WhatsApp Bot module — NexusOS

DB tables (migration 006):
  whatsapp_configs    — org Twilio/Meta credentials
  conversation_flows  — bot flows (is_active, flow_data jsonb, trigger_keywords text[])
  contacts            — phone book (phone_number, name, opt_in)
  conversations       — threads (contact_id FK, status: active/waiting_agent/resolved/closed)
  messages            — messages (content, type, direction, provider_message_id)
  whatsapp_templates  — message templates
  whatsapp_metrics    — daily aggregates
"""

import logging
from datetime import datetime, timezone as tz
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.config import settings
from app.database import get_current_user, get_supabase_admin, get_tenant_id
from app.middleware.rbac import require_min_plan, require_min_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _now() -> str:
    return datetime.now(tz.utc).isoformat()


def _not_found(entity: str = "Resource") -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity} not found")


def _twilio_send(to: str, body: str, from_number: Optional[str] = None, media_url: Optional[str] = None) -> Dict[str, Any]:
    """Send a WhatsApp message via Twilio REST API."""
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        # Strip whatsapp: prefix if present, then re-add correctly
        clean_from = (from_number or settings.TWILIO_WHATSAPP_NUMBER).replace("whatsapp:", "")
        clean_to = to.replace("whatsapp:", "")
        kwargs: Dict[str, Any] = {
            "from_": f"whatsapp:{clean_from}",
            "to": f"whatsapp:{clean_to}",
            "body": body,
        }
        if media_url:
            kwargs["media_url"] = [media_url]
        msg = client.messages.create(**kwargs)
        return {"sid": msg.sid, "status": msg.status}
    except Exception as exc:
        logger.error("Twilio send error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Twilio error: {exc}",
        ) from exc


def _find_or_create_contact(admin, org_id: str, phone_number: str, name: Optional[str] = None) -> str:
    """Return contact id, creating the record if it doesn't exist."""
    clean = phone_number.replace("whatsapp:", "").strip()
    res = (
        admin.table("contacts")
        .select("id")
        .eq("org_id", org_id)
        .eq("phone_number", clean)
        .execute()
    )
    if res.data:
        return res.data[0]["id"]
    insert = admin.table("contacts").insert(
        {"org_id": org_id, "phone_number": clean, "name": name, "opt_in": True, "opted_in_at": _now()}
    ).execute()
    return insert.data[0]["id"]


def _find_or_create_conversation(admin, org_id: str, contact_id: str) -> tuple[str, dict]:
    """Return (conversation_id, context_dict). Creates one if none is active."""
    res = (
        admin.table("conversations")
        .select("id, context, flow_id, current_node_id")
        .eq("org_id", org_id)
        .eq("contact_id", contact_id)
        .in_("status", ["active", "waiting_agent"])
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )
    if res.data:
        row = res.data[0]
        return row["id"], row.get("context") or {}
    insert = admin.table("conversations").insert(
        {"org_id": org_id, "contact_id": contact_id, "status": "active", "context": {}}
    ).execute()
    return insert.data[0]["id"], {}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class ConfigUpsert(BaseModel):
    provider: str = "twilio"  # twilio | meta
    account_sid: Optional[str] = None
    auth_token: Optional[str] = None
    phone_number: str
    webhook_url: Optional[str] = None


class FlowNode(BaseModel):
    id: str
    type: str  # message | condition | action | input | handover
    content: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = []
    next_node: Optional[str] = None
    conditions: Optional[List[Dict[str, Any]]] = []
    action: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = {}


class FlowCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    trigger_keywords: Optional[List[str]] = []
    nodes: Optional[List[FlowNode]] = []  # stored inside flow_data.nodes


class FlowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_keywords: Optional[List[str]] = None
    nodes: Optional[List[FlowNode]] = None


class ContactCreate(BaseModel):
    phone_number: str
    name: Optional[str] = None
    email: Optional[str] = None
    tags: Optional[List[str]] = []
    custom_fields: Optional[Dict[str, Any]] = {}
    opt_in: bool = True


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    opt_in: Optional[bool] = None


class SendMessageRequest(BaseModel):
    to: str  # E.164 or with whatsapp: prefix
    message: str = Field(..., max_length=4096)
    media_url: Optional[str] = None


class AssignConversationRequest(BaseModel):
    agent_id: str
    note: Optional[str] = None


class TemplateCreate(BaseModel):
    name: str
    language: str = "pt_BR"
    category: str = "utility"
    body_text: str
    header: Optional[Dict[str, Any]] = None
    footer: Optional[str] = None
    buttons: Optional[List[Dict[str, Any]]] = []


# ---------------------------------------------------------------------------
# Config routes
# ---------------------------------------------------------------------------


@router.get("/config")
async def get_config(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    """Return the WhatsApp integration config for this org (tokens redacted)."""
    admin = get_supabase_admin()
    res = admin.table("whatsapp_configs").select(
        "id, provider, phone_number, is_active, webhook_url, created_at, updated_at"
    ).eq("org_id", org_id).execute()
    return res.data[0] if res.data else None


@router.put("/config")
async def upsert_config(
    body: ConfigUpsert,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    """Save or update Twilio/Meta credentials for this org."""
    admin = get_supabase_admin()
    data: Dict[str, Any] = {
        "org_id": org_id,
        "provider": body.provider,
        "phone_number": body.phone_number.replace("whatsapp:", ""),
        "webhook_url": body.webhook_url,
        "is_active": True,
    }
    if body.account_sid:
        data["account_sid"] = body.account_sid
    if body.auth_token:
        data["auth_token_encrypted"] = body.auth_token  # TODO: encrypt in prod

    res = admin.table("whatsapp_configs").upsert(data, on_conflict="org_id").execute()
    result = res.data[0] if res.data else data
    if isinstance(result, dict) and "auth_token_encrypted" in result:
        result["auth_token_encrypted"] = "••••••••"
    return result


@router.post("/config/test")
async def test_config(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    """Send a test WhatsApp message to validate Twilio credentials."""
    admin = get_supabase_admin()
    cfg_res = admin.table("whatsapp_configs").select("*").eq("org_id", org_id).execute()
    if not cfg_res.data:
        raise HTTPException(status_code=400, detail="No WhatsApp config found. Configure it first.")
    cfg = cfg_res.data[0]

    # Try to send to the same number (echo test)
    test_to = cfg["phone_number"]
    result = _twilio_send(test_to, "✅ NexusOS WhatsApp Bot — configuração confirmada!", cfg["phone_number"])
    return {"message": "Test message sent", "sid": result.get("sid")}


# ---------------------------------------------------------------------------
# Flow routes
# ---------------------------------------------------------------------------


@router.get("/flows")
async def list_flows(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_plan("pro")),
):
    admin = get_supabase_admin()
    res = (
        admin.table("conversation_flows")
        .select("id, name, description, trigger_keywords, is_active, created_at, updated_at")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": res.data or []}


@router.post("/flows", status_code=status.HTTP_201_CREATED)
async def create_flow(
    body: FlowCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_plan("pro")),
):
    admin = get_supabase_admin()
    nodes_data = [n.model_dump() for n in (body.nodes or [])]
    res = admin.table("conversation_flows").insert({
        "org_id": org_id,
        "name": body.name,
        "description": body.description,
        "trigger_keywords": body.trigger_keywords or [],
        "flow_data": {"nodes": nodes_data, "edges": []},
        "is_active": False,
        "created_by": current_user.user_id,
    }).execute()
    return res.data[0]


@router.get("/flows/{flow_id}")
async def get_flow(
    flow_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    res = (
        admin.table("conversation_flows")
        .select("*")
        .eq("id", flow_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not res.data:
        raise _not_found("Flow")
    return res.data


@router.put("/flows/{flow_id}")
async def update_flow(
    flow_id: str,
    body: FlowUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_plan("pro")),
):
    admin = get_supabase_admin()
    update: Dict[str, Any] = {}
    if body.name is not None:
        update["name"] = body.name
    if body.description is not None:
        update["description"] = body.description
    if body.trigger_keywords is not None:
        update["trigger_keywords"] = body.trigger_keywords
    if body.nodes is not None:
        update["flow_data"] = {"nodes": [n.model_dump() for n in body.nodes], "edges": []}

    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")

    res = (
        admin.table("conversation_flows")
        .update(update)
        .eq("id", flow_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not res.data:
        raise _not_found("Flow")
    return res.data[0]


@router.delete("/flows/{flow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flow(
    flow_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("conversation_flows").delete().eq("id", flow_id).eq("org_id", org_id).execute()


@router.post("/flows/{flow_id}/activate")
async def activate_flow(
    flow_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    """Activate a flow (deactivates all others for this org)."""
    admin = get_supabase_admin()
    # Deactivate all first
    admin.table("conversation_flows").update({"is_active": False}).eq("org_id", org_id).execute()
    # Activate the requested one
    res = (
        admin.table("conversation_flows")
        .update({"is_active": True})
        .eq("id", flow_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not res.data:
        raise _not_found("Flow")
    return {"message": "Flow activated", "flow_id": flow_id}


# ---------------------------------------------------------------------------
# Contacts routes
# ---------------------------------------------------------------------------


@router.get("/contacts")
async def list_contacts(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
):
    admin = get_supabase_admin()
    offset = (page - 1) * page_size
    query = (
        admin.table("contacts")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if q:
        query = query.ilike("name", f"%{q}%")
    res = query.execute()
    return {"data": res.data or [], "page": page, "page_size": page_size}


@router.post("/contacts", status_code=status.HTTP_201_CREATED)
async def create_contact(
    body: ContactCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    data = {
        **body.model_dump(),
        "org_id": org_id,
        "phone_number": body.phone_number.replace("whatsapp:", "").strip(),
    }
    if body.opt_in:
        data["opted_in_at"] = _now()
    try:
        res = admin.table("contacts").insert(data).execute()
    except Exception as exc:
        if "unique" in str(exc).lower():
            raise HTTPException(status_code=409, detail="Contact with this phone number already exists")
        raise HTTPException(status_code=500, detail=str(exc))
    return res.data[0]


@router.get("/contacts/{contact_id}")
async def get_contact(
    contact_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    res = (
        admin.table("contacts")
        .select("*")
        .eq("id", contact_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not res.data:
        raise _not_found("Contact")
    return res.data


@router.put("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    body: ContactUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update = body.model_dump(exclude_none=True)
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if update.get("opt_in") is False:
        update["opted_out_at"] = _now()
    res = (
        admin.table("contacts")
        .update(update)
        .eq("id", contact_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not res.data:
        raise _not_found("Contact")
    return res.data[0]


# ---------------------------------------------------------------------------
# Conversations routes
# ---------------------------------------------------------------------------


@router.get("/conversations")
async def list_conversations(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    status_filter: Optional[str] = None,
    assigned_to: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
):
    admin = get_supabase_admin()
    offset = (page - 1) * page_size
    query = (
        admin.table("conversations")
        .select("*, contacts(phone_number, name, email)")
        .eq("org_id", org_id)
        .order("updated_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if status_filter:
        query = query.eq("status", status_filter)
    if assigned_to:
        query = query.eq("assigned_to", assigned_to)
    res = query.execute()
    return {"data": res.data or [], "page": page, "page_size": page_size}


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    page: int = 1,
    page_size: int = 50,
):
    admin = get_supabase_admin()
    offset = (page - 1) * page_size
    res = (
        admin.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .eq("org_id", org_id)
        .order("created_at")
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return {"data": res.data or [], "page": page, "page_size": page_size}


@router.post("/conversations/{conversation_id}/reply")
async def reply_to_conversation(
    conversation_id: str,
    body: SendMessageRequest,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Send a manual reply inside an existing conversation."""
    admin = get_supabase_admin()
    # Get conversation + contact phone
    conv_res = (
        admin.table("conversations")
        .select("id, contact_id, contacts(phone_number)")
        .eq("id", conversation_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not conv_res.data:
        raise _not_found("Conversation")

    contact = conv_res.data.get("contacts") or {}
    phone = contact.get("phone_number") or body.to
    result = _twilio_send(phone, body.message, media_url=body.media_url)

    admin.table("messages").insert({
        "conversation_id": conversation_id,
        "org_id": org_id,
        "direction": "outbound",
        "content": body.message,
        "type": "text",
        "media_url": body.media_url,
        "provider_message_id": result.get("sid"),
        "status": result.get("status", "sent"),
        "sent_at": _now(),
    }).execute()

    return {"message": "Sent", "sid": result.get("sid")}


@router.post("/conversations/{conversation_id}/assign")
async def assign_conversation(
    conversation_id: str,
    body: AssignConversationRequest,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    res = (
        admin.table("conversations")
        .update({"assigned_to": body.agent_id, "status": "waiting_agent"})
        .eq("id", conversation_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not res.data:
        raise _not_found("Conversation")
    return {"message": "Assigned", "agent_id": body.agent_id}


@router.post("/conversations/{conversation_id}/resolve")
async def resolve_conversation(
    conversation_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    res = (
        admin.table("conversations")
        .update({"status": "resolved", "resolved_at": _now()})
        .eq("id", conversation_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not res.data:
        raise _not_found("Conversation")
    return {"message": "Conversation resolved"}


# ---------------------------------------------------------------------------
# Proactive messaging
# ---------------------------------------------------------------------------


@router.post("/send")
async def send_message(
    body: SendMessageRequest,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_plan("pro")),
):
    """Send a proactive outbound WhatsApp message."""
    admin = get_supabase_admin()
    clean_to = body.to.replace("whatsapp:", "").strip()

    result = _twilio_send(clean_to, body.message, media_url=body.media_url)

    contact_id = _find_or_create_contact(admin, org_id, clean_to)
    conv_id, _ = _find_or_create_conversation(admin, org_id, contact_id)

    admin.table("messages").insert({
        "conversation_id": conv_id,
        "org_id": org_id,
        "direction": "outbound",
        "content": body.message,
        "type": "text",
        "media_url": body.media_url,
        "provider_message_id": result.get("sid"),
        "status": result.get("status", "sent"),
        "sent_at": _now(),
    }).execute()

    return {"message": "Sent", "sid": result.get("sid"), "conversation_id": conv_id}


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------


@router.get("/templates")
async def list_templates(org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)):
    admin = get_supabase_admin()
    res = admin.table("whatsapp_templates").select("*").eq("org_id", org_id).execute()
    return {"data": res.data or []}


@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def create_template(
    body: TemplateCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    res = admin.table("whatsapp_templates").insert({
        **body.model_dump(),
        "org_id": org_id,
        "status": "pending",
    }).execute()
    return res.data[0]


# ---------------------------------------------------------------------------
# Webhook — Twilio
# ---------------------------------------------------------------------------


@router.post("/webhooks/twilio", include_in_schema=False)
async def twilio_webhook(request: Request):
    """Receive inbound WhatsApp messages from Twilio (form-encoded)."""
    form = await request.form()
    data = dict(form)

    from_number = data.get("From", "").replace("whatsapp:", "").strip()
    to_number = data.get("To", "").replace("whatsapp:", "").strip()
    body_text = data.get("Body", "")
    media_url = data.get("MediaUrl0")
    message_sid = data.get("MessageSid", "")

    logger.info("Twilio inbound from=%s body=%s", from_number, body_text[:80])

    try:
        from app.tasks.celery_app import process_whatsapp_message
        process_whatsapp_message.delay({
            "source": "twilio",
            "from": from_number,
            "to": to_number,
            "body": body_text,
            "media_url": media_url,
            "message_sid": message_sid,
            "received_at": _now(),
        })
    except Exception as exc:
        logger.warning("Could not queue WhatsApp message: %s", exc)

    # Twilio expects a TwiML response or empty 200
    from fastapi.responses import Response
    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        media_type="application/xml",
        status_code=200,
    )


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------


@router.get("/metrics")
async def get_metrics(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Aggregate WhatsApp metrics for this org."""
    admin = get_supabase_admin()

    convs = admin.table("conversations").select("id, status, started_at, resolved_at").eq("org_id", org_id).execute().data or []
    msgs = admin.table("messages").select("direction, created_at").eq("org_id", org_id).execute().data or []
    flows = admin.table("conversation_flows").select("id, name, is_active").eq("org_id", org_id).execute().data or []
    contacts_count = len((admin.table("contacts").select("id").eq("org_id", org_id).execute().data or []))

    total = len(convs)
    resolved = [c for c in convs if c.get("status") == "resolved"]

    resolution_times = []
    for c in resolved:
        if c.get("started_at") and c.get("resolved_at"):
            try:
                s = datetime.fromisoformat(c["started_at"].replace("Z", "+00:00"))
                e = datetime.fromisoformat(c["resolved_at"].replace("Z", "+00:00"))
                resolution_times.append((e - s).total_seconds() / 60)
            except Exception:
                pass

    avg_res = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0
    inbound = len([m for m in msgs if m.get("direction") == "inbound"])
    outbound = len([m for m in msgs if m.get("direction") == "outbound"])

    return {
        "contacts": contacts_count,
        "conversations": {
            "total": total,
            "active": len([c for c in convs if c.get("status") == "active"]),
            "waiting_agent": len([c for c in convs if c.get("status") == "waiting_agent"]),
            "resolved": len(resolved),
            "resolution_rate": round(len(resolved) / total * 100, 1) if total else 0,
            "avg_resolution_minutes": avg_res,
        },
        "messages": {"total": len(msgs), "inbound": inbound, "outbound": outbound},
        "flows": {"total": len(flows), "active": len([f for f in flows if f.get("is_active")])},
    }
