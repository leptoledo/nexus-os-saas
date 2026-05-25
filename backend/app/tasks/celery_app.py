from __future__ import annotations

import io
import logging
import smtplib
import ssl
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

from celery import Celery
from celery.utils.log import get_task_logger

from app.config import settings

logger = get_task_logger(__name__)

# ---------------------------------------------------------------------------
# Celery app configuration
# ---------------------------------------------------------------------------

celery_app = Celery(
    "nexus_os",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.tasks.celery_app.send_campaign_email": {"queue": "email"},
        "app.tasks.celery_app.send_notification_email": {"queue": "email"},
        "app.tasks.celery_app.export_report_pdf": {"queue": "reports"},
        "app.tasks.celery_app.export_report_excel": {"queue": "reports"},
        "app.tasks.celery_app.generate_weekly_ai_summary": {"queue": "ai"},
        "app.tasks.celery_app.detect_anomalies": {"queue": "ai"},
        "app.tasks.celery_app.schedule_social_post": {"queue": "social"},
        "app.tasks.celery_app.process_whatsapp_message": {"queue": "whatsapp"},
        "app.tasks.celery_app.check_threshold_alerts": {"queue": "monitoring"},
    },
    beat_schedule={
        "weekly-ai-summary": {
            "task": "app.tasks.celery_app.generate_weekly_ai_summary",
            "schedule": 604800.0,  # Every 7 days
            "args": ("all",),
        },
        "check-alerts-every-15min": {
            "task": "app.tasks.celery_app.check_threshold_alerts",
            "schedule": 900.0,  # Every 15 minutes
            "args": ("all",),
        },
    },
)


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------


def _get_admin_client():
    from app.database import get_supabase_admin
    return get_supabase_admin()


def _send_email(to_email: str, subject: str, body_text: str, body_html: Optional[str] = None):
    """Send an email via SMTP (supports both SSL/465 and STARTTLS/587)."""
    if not settings.SMTP_USER or not settings.SMTP_PASS:
        logger.warning("SMTP not configured, skipping email to %s", to_email)
        return False

    from_addr = getattr(settings, "EMAIL_FROM", settings.SMTP_USER)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email

    msg.attach(MIMEText(body_text, "plain"))
    if body_html:
        msg.attach(MIMEText(body_html, "html"))

    try:
        if settings.SMTP_PORT == 465:
            # SSL direto
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(from_addr, to_email, msg.as_string())
        else:
            # STARTTLS (porta 587)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(from_addr, to_email, msg.as_string())
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


def _now() -> str:
    return datetime.utcnow().isoformat()


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------


@celery_app.task(name="app.tasks.celery_app.send_campaign_email", bind=True, max_retries=3, default_retry_delay=60)
def send_campaign_email(self, campaign_id: str, recipient_list: Optional[List[str]] = None):
    """
    Send a marketing campaign to its recipient list.
    If recipient_list is empty, fetches from the campaign's recipient_list_id.
    """
    logger.info("Sending campaign %s", campaign_id)
    admin = _get_admin_client()

    try:
        # Fetch campaign
        campaign_res = admin.table("campaigns").select("*").eq("id", campaign_id).single().execute()
        if not campaign_res.data:
            logger.error("Campaign %s not found", campaign_id)
            return {"status": "error", "message": "Campaign not found"}

        campaign = campaign_res.data

        # Fetch recipients
        recipients = recipient_list or []
        if not recipients and campaign.get("recipient_list_id"):
            contacts_res = admin.table("email_contacts").select("email").eq("list_id", campaign["recipient_list_id"]).execute()
            recipients = [c["email"] for c in (contacts_res.data or [])]

        if not recipients:
            logger.warning("No recipients for campaign %s", campaign_id)
            admin.table("campaigns").update({"status": "sent", "sent_count": 0}).eq("id", campaign_id).execute()
            return {"status": "no_recipients"}

        sent_count = 0
        failed_count = 0

        for email in recipients:
            success = _send_email(
                to_email=email,
                subject=campaign["subject"],
                body_text=campaign.get("body_text") or "",
                body_html=campaign.get("body_html"),
            )
            if success:
                sent_count += 1
            else:
                failed_count += 1

        admin.table("campaigns").update({
            "status": "sent",
            "sent_count": sent_count,
            "failed_count": failed_count,
            "sent_at": _now(),
        }).eq("id", campaign_id).execute()

        # Upsert stats
        admin.table("campaign_stats").upsert({
            "campaign_id": campaign_id,
            "sent": sent_count,
            "delivered": sent_count,
            "opened": 0, "clicked": 0, "bounced": failed_count, "unsubscribed": 0,
        }).execute()

        logger.info("Campaign %s sent: %d success, %d failed", campaign_id, sent_count, failed_count)
        return {"status": "done", "sent": sent_count, "failed": failed_count}

    except Exception as exc:
        logger.error("Campaign send error: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.celery_app.generate_weekly_ai_summary", bind=True, max_retries=2)
def generate_weekly_ai_summary(self, org_id: str):
    """Generate a weekly AI business summary and email it to org admins."""
    logger.info("Generating weekly AI summary for org %s", org_id)

    try:
        admin = _get_admin_client()

        # Gather org metrics
        if org_id == "all":
            orgs_res = admin.table("organizations").select("id, name").execute()
            org_ids = [o["id"] for o in (orgs_res.data or [])]
        else:
            org_ids = [org_id]

        for oid in org_ids:
            _generate_summary_for_org(admin, oid)

        return {"status": "done", "orgs_processed": len(org_ids)}

    except Exception as exc:
        logger.error("AI summary error: %s", exc)
        raise self.retry(exc=exc)


def _generate_summary_for_org(admin, org_id: str):
    leads_res = admin.table("leads").select("stage, value").eq("org_id", org_id).execute()
    tasks_res = admin.table("tasks").select("column_id, priority").eq("org_id", org_id).execute()

    leads = leads_res.data or []
    tasks = tasks_res.data or []

    summary_text = f"""
NexusOS Weekly Summary - {datetime.utcnow().strftime('%B %d, %Y')}
Organization: {org_id}

LEADS:
- Total leads: {len(leads)}
- Won: {len([l for l in leads if l.get('stage') == 'closed_won'])}
- Pipeline value: ${sum(l.get('value') or 0 for l in leads):,.2f}

TASKS:
- Total: {len(tasks)}
- Completed: {len([t for t in tasks if t.get('column_id') == 'done'])}
- High priority pending: {len([t for t in tasks if t.get('priority') in ('high', 'urgent') and t.get('column_id') != 'done'])}
"""

    # Get admin members to email
    admins_res = (
        admin.table("org_members")
        .select("user_id, user_profiles(email)")
        .eq("org_id", org_id)
        .eq("role", "admin")
        .execute()
    )

    for member in admins_res.data or []:
        profile = member.get("user_profiles") or {}
        email = profile.get("email")
        if email:
            _send_email(
                to_email=email,
                subject=f"NexusOS Weekly Summary - {datetime.utcnow().strftime('%B %d')}",
                body_text=summary_text,
            )


@celery_app.task(name="app.tasks.celery_app.schedule_social_post", bind=True, max_retries=3)
def schedule_social_post(self, post_id: str):
    """Publish a scheduled social media post."""
    logger.info("Publishing social post %s", post_id)

    try:
        admin = _get_admin_client()
        post_res = admin.table("content_calendar").select("*").eq("id", post_id).single().execute()
        if not post_res.data:
            logger.warning("Post %s not found", post_id)
            return {"status": "not_found"}

        post = post_res.data
        # TODO: Integrate with social media APIs (Meta, LinkedIn, Twitter)
        # For now, mark as published
        admin.table("content_calendar").update({
            "status": "published",
            "published_at": _now(),
        }).eq("id", post_id).execute()

        logger.info("Post %s published (channel: %s)", post_id, post.get("channel"))
        return {"status": "published", "post_id": post_id, "channel": post.get("channel")}

    except Exception as exc:
        logger.error("Social post error: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.celery_app.export_report_pdf", bind=True, max_retries=2)
def export_report_pdf(self, report_id: str):
    """Generate a PDF report and store it for download."""
    logger.info("Exporting PDF for report %s", report_id)

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

        admin = _get_admin_client()
        report_res = admin.table("scheduled_reports").select("*").eq("id", report_id).single().execute()
        if not report_res.data:
            return {"status": "not_found"}

        report = report_res.data
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph(report["name"], styles["Title"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Organization: {report.get('org_id', 'N/A')}", styles["Normal"]))
        story.append(Paragraph(f"Generated: {_now()}", styles["Normal"]))
        story.append(Spacer(1, 24))

        if report.get("description"):
            story.append(Paragraph(report["description"], styles["Normal"]))

        doc.build(story)
        pdf_bytes = buffer.getvalue()

        # Store in Supabase storage or return base64
        import base64
        pdf_b64 = base64.b64encode(pdf_bytes).decode()

        admin.table("report_exports").insert({
            "report_id": report_id,
            "org_id": report.get("org_id"),
            "format": "pdf",
            "data_b64": pdf_b64,
            "created_at": _now(),
        }).execute()

        admin.table("scheduled_reports").update({"last_run_at": _now()}).eq("id", report_id).execute()

        logger.info("PDF export complete for report %s (%d bytes)", report_id, len(pdf_bytes))
        return {"status": "done", "report_id": report_id, "size_bytes": len(pdf_bytes)}

    except Exception as exc:
        logger.error("PDF export error: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.celery_app.export_report_excel", bind=True, max_retries=2)
def export_report_excel(self, report_id: str):
    """Generate an Excel report and store it for download."""
    logger.info("Exporting Excel for report %s", report_id)

    try:
        import base64

        import pandas as pd

        admin = _get_admin_client()
        report_res = admin.table("scheduled_reports").select("*").eq("id", report_id).single().execute()
        if not report_res.data:
            return {"status": "not_found"}

        report = report_res.data
        org_id = report.get("org_id")

        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            # Info sheet
            pd.DataFrame([{
                "Report": report["name"],
                "Org": org_id,
                "Generated": _now(),
            }]).to_excel(writer, sheet_name="Info", index=False)

            # Leads sheet
            leads_res = admin.table("leads").select("*").eq("org_id", org_id).execute()
            if leads_res.data:
                pd.DataFrame(leads_res.data).to_excel(writer, sheet_name="Leads", index=False)

            # Tasks sheet
            tasks_res = admin.table("tasks").select("id, title, column_id, priority, assignee_id, due_date, logged_hours").eq("org_id", org_id).execute()
            if tasks_res.data:
                pd.DataFrame(tasks_res.data).to_excel(writer, sheet_name="Tasks", index=False)

        excel_bytes = buffer.getvalue()
        excel_b64 = base64.b64encode(excel_bytes).decode()

        admin.table("report_exports").insert({
            "report_id": report_id,
            "org_id": org_id,
            "format": "excel",
            "data_b64": excel_b64,
            "created_at": _now(),
        }).execute()

        admin.table("scheduled_reports").update({"last_run_at": _now()}).eq("id", report_id).execute()

        logger.info("Excel export complete for report %s (%d bytes)", report_id, len(excel_bytes))
        return {"status": "done", "report_id": report_id, "size_bytes": len(excel_bytes)}

    except Exception as exc:
        logger.error("Excel export error: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.celery_app.detect_anomalies", bind=True, max_retries=2)
def detect_anomalies(self, org_id: str, metric_name: str):
    """Detect anomalies in org metrics using statistical methods."""
    logger.info("Detecting anomalies for org %s, metric %s", org_id, metric_name)

    try:
        import pandas as pd

        admin = _get_admin_client()
        org_ids = []

        if org_id == "all":
            orgs_res = admin.table("organizations").select("id").execute()
            org_ids = [o["id"] for o in (orgs_res.data or [])]
        else:
            org_ids = [org_id]

        for oid in org_ids:
            _detect_org_anomalies(admin, oid, metric_name)

        return {"status": "done", "orgs": len(org_ids)}

    except Exception as exc:
        logger.error("Anomaly detection error: %s", exc)
        raise self.retry(exc=exc)


def _detect_org_anomalies(admin, org_id: str, metric_name: str):
    import pandas as pd

    # Fetch daily lead creation counts for the last 60 days
    leads_res = admin.table("leads").select("created_at").eq("org_id", org_id).execute()
    if not leads_res.data or len(leads_res.data) < 10:
        return  # Not enough data

    df = pd.DataFrame(leads_res.data)
    df["created_at"] = pd.to_datetime(df["created_at"])
    daily = df.groupby(df["created_at"].dt.date).size()

    if len(daily) < 7:
        return

    mean = daily.mean()
    std = daily.std()
    if std == 0:
        return

    # Z-score anomaly detection
    anomalies = []
    for date, count in daily.items():
        z_score = abs((count - mean) / std)
        if z_score > 2.5:
            anomalies.append({
                "org_id": org_id,
                "metric": "daily_leads",
                "date": str(date),
                "value": int(count),
                "expected": round(float(mean), 2),
                "z_score": round(float(z_score), 2),
                "severity": "high" if z_score > 3.5 else "medium",
                "detected_at": _now(),
            })

    for anomaly in anomalies:
        try:
            admin.table("anomaly_alerts").insert(anomaly).execute()
            logger.info("Anomaly detected for org %s: %s", org_id, anomaly)
        except Exception:
            pass


@celery_app.task(name="app.tasks.celery_app.send_notification_email", bind=True, max_retries=3, default_retry_delay=30)
def send_notification_email(
    self,
    user_id: Optional[str],
    subject: str,
    body: str,
    to_email: Optional[str] = None,
    body_html: Optional[str] = None,
):
    """Send a notification email to a user or a direct email address."""
    logger.info("Sending notification email: %s", subject)

    try:
        email = to_email
        if not email and user_id:
            admin = _get_admin_client()
            profile_res = admin.table("user_profiles").select("email").eq("id", user_id).single().execute()
            if profile_res.data:
                email = profile_res.data.get("email")

        if not email:
            logger.warning("No email found for user %s", user_id)
            return {"status": "no_email"}

        success = _send_email(email, subject, body, body_html)
        return {"status": "sent" if success else "failed", "to": email}

    except Exception as exc:
        logger.error("Notification email error: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.celery_app.process_whatsapp_message", bind=True, max_retries=3, default_retry_delay=10)
def process_whatsapp_message(self, message_data: Dict[str, Any]):
    """
    Process an inbound WhatsApp message:
    1. Match to_number → org via whatsapp_configs
    2. Find or create contact + conversation
    3. Store message in messages table
    4. Match active conversation_flow → send bot reply
    """
    logger.info("Processing WhatsApp message from %s", message_data.get("from"))

    try:
        admin = _get_admin_client()
        from_number = message_data.get("from", "").replace("whatsapp:", "").strip()
        to_number = message_data.get("to", "").replace("whatsapp:", "").strip()
        body = message_data.get("body", "").strip()
        body_lower = body.lower()
        source = message_data.get("source", "twilio")

        # Match incoming to_number → org via whatsapp_configs
        org_id = None
        if to_number:
            cfg_res = admin.table("whatsapp_configs").select("org_id").eq("phone_number", to_number).execute()
            if cfg_res.data:
                org_id = cfg_res.data[0]["org_id"]

        # Fallback: first org (sandbox / single-tenant dev)
        if not org_id:
            orgs_res = admin.table("organizations").select("id").limit(1).execute()
            if not orgs_res.data:
                return {"status": "no_org"}
            org_id = orgs_res.data[0]["id"]

        # Find or create contact
        contact_res = (
            admin.table("contacts")
            .select("id")
            .eq("org_id", org_id)
            .eq("phone_number", from_number)
            .execute()
        )
        if contact_res.data:
            contact_id = contact_res.data[0]["id"]
        else:
            contact_ins = admin.table("contacts").insert({
                "org_id": org_id,
                "phone_number": from_number,
                "opt_in": True,
                "opted_in_at": _now(),
            }).execute()
            contact_id = contact_ins.data[0]["id"]

        # Find or create active conversation (includes current_node_id for flow state)
        conv_res = (
            admin.table("conversations")
            .select("id, context, flow_id, current_node_id, status")
            .eq("org_id", org_id)
            .eq("contact_id", contact_id)
            .in_("status", ["active", "waiting_agent"])
            .order("started_at", desc=True)
            .limit(1)
            .execute()
        )
        if conv_res.data:
            conv_id = conv_res.data[0]["id"]
            context = conv_res.data[0].get("context") or {}
            current_node_id = conv_res.data[0].get("current_node_id")
            existing_flow_id = conv_res.data[0].get("flow_id")
        else:
            conv_ins = admin.table("conversations").insert({
                "org_id": org_id,
                "contact_id": contact_id,
                "status": "active",
                "context": {},
            }).execute()
            conv_id = conv_ins.data[0]["id"]
            context = {}
            current_node_id = None
            existing_flow_id = None

        # Store inbound message
        admin.table("messages").insert({
            "conversation_id": conv_id,
            "org_id": org_id,
            "direction": "inbound",
            "content": body,
            "type": "text",
            "media_url": message_data.get("media_url"),
            "provider_message_id": message_data.get("message_sid") or message_data.get("message_id"),
            "status": "delivered",
        }).execute()

        # ----------------------------------------------------------------
        # Flow engine: navigate nodes based on conversation state
        # ----------------------------------------------------------------
        reply = None
        next_node_id = None
        flow_id_matched = existing_flow_id

        # Load the active flow
        if existing_flow_id:
            flow_res = admin.table("conversation_flows").select("id, flow_data").eq("id", existing_flow_id).single().execute()
            active_flow = flow_res.data
        else:
            flows_res = (
                admin.table("conversation_flows")
                .select("id, trigger_keywords, flow_data")
                .eq("org_id", org_id)
                .eq("is_active", True)
                .execute()
            )
            active_flow = flows_res.data[0] if flows_res.data else None
            if active_flow:
                flow_id_matched = active_flow["id"]

        if active_flow:
            flow_data = active_flow.get("flow_data") or {}
            nodes = flow_data.get("nodes") or []
            nodes_by_id = {n["id"]: n for n in nodes}

            # Reset keywords: "menu", "ola", "olá", "inicio", "start", "hi", "hello"
            reset_words = {"menu", "ola", "olá", "inicio", "start", "hi", "hello", "oi", "bom dia", "boa tarde"}
            is_reset = body_lower in reset_words or not current_node_id

            if is_reset:
                # Start from first node (menu)
                target_node = nodes[0] if nodes else None
                next_node_id = target_node["id"] if target_node else None
            else:
                # We are inside a flow — find the current node
                current_node = nodes_by_id.get(current_node_id)
                if current_node:
                    # Check if user's reply matches one of the node's options
                    options = current_node.get("options") or []
                    matched_option = None
                    for opt in options:
                        if body_lower == str(opt.get("label", "")).lower():
                            matched_option = opt
                            break

                    if matched_option:
                        next_node_id = matched_option.get("next_node")
                    elif current_node.get("next_node"):
                        # Linear flow: go to next node
                        next_node_id = current_node.get("next_node")
                    else:
                        # End of flow or unrecognised input
                        next_node_id = current_node.get("next_node")  # may be None
                else:
                    # Unknown node_id — restart
                    target_node = nodes[0] if nodes else None
                    next_node_id = target_node["id"] if target_node else None

            # Get the reply from the target node
            if next_node_id and next_node_id in nodes_by_id:
                target_node = nodes_by_id[next_node_id]
                reply = target_node.get("content")

                # If it's a handover node → mark conversation as waiting_agent
                if target_node.get("type") == "handover":
                    admin.table("conversations").update(
                        {"status": "waiting_agent", "flow_id": flow_id_matched, "current_node_id": next_node_id}
                    ).eq("id", conv_id).execute()
                else:
                    admin.table("conversations").update(
                        {"flow_id": flow_id_matched, "current_node_id": next_node_id}
                    ).eq("id", conv_id).execute()
            elif not reply and not next_node_id and current_node_id:
                # No next node — we're at the end, send a fallback
                reply = "Obrigado! Escreve *menu* para ver as opcoes novamente."
                admin.table("conversations").update({"current_node_id": None}).eq("id", conv_id).execute()
        else:
            reply = "Ola! Como posso ajudar?"

        # Send auto-reply via Twilio
        if reply and source == "twilio":
            try:
                from twilio.rest import Client
                cfg_number = settings.TWILIO_WHATSAPP_NUMBER.replace("whatsapp:", "")
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                msg = client.messages.create(
                    from_=f"whatsapp:{cfg_number}",
                    to=f"whatsapp:{from_number}",
                    body=reply,
                )
                admin.table("messages").insert({
                    "conversation_id": conv_id,
                    "org_id": org_id,
                    "direction": "outbound",
                    "content": reply,
                    "type": "text",
                    "provider_message_id": msg.sid,
                    "status": "sent",
                    "sent_at": _now(),
                }).execute()
            except Exception as exc:
                logger.error("Could not send WhatsApp auto-reply: %s", exc)

        return {"status": "processed", "conversation_id": conv_id, "reply_sent": reply is not None}

    except Exception as exc:
        logger.error("WhatsApp processing error: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.celery_app.check_threshold_alerts", bind=True, max_retries=2)
def check_threshold_alerts(self, org_id: str):
    """Check all active threshold alerts and fire notifications if conditions are met."""
    logger.info("Checking threshold alerts for org %s", org_id)

    try:
        admin = _get_admin_client()
        org_ids = []

        if org_id == "all":
            orgs_res = admin.table("organizations").select("id").execute()
            org_ids = [o["id"] for o in (orgs_res.data or [])]
        else:
            org_ids = [org_id]

        for oid in org_ids:
            alerts_res = admin.table("analytics_alerts").select("*").eq("org_id", oid).eq("active", True).execute()
            for alert in alerts_res.data or []:
                _evaluate_alert(admin, oid, alert)

        return {"status": "done"}

    except Exception as exc:
        logger.error("Alert check error: %s", exc)
        raise self.retry(exc=exc)


def _evaluate_alert(admin, org_id: str, alert: Dict[str, Any]):
    """Evaluate a single alert condition against current metric value."""
    metric = alert.get("metric", "")
    condition = alert.get("condition", "gt")
    threshold = float(alert.get("threshold", 0))

    # Compute current metric value
    current_value = None

    if metric == "leads_count":
        res = admin.table("leads").select("id", count="exact").eq("org_id", org_id).execute()
        current_value = len(res.data or [])
    elif metric == "open_tasks_count":
        res = admin.table("tasks").select("id").eq("org_id", org_id).neq("column_id", "done").execute()
        current_value = len(res.data or [])
    elif metric == "campaign_open_rate":
        res = admin.table("campaign_stats").select("open_rate").eq("org_id", org_id).execute()
        values = [r.get("open_rate") or 0 for r in (res.data or [])]
        current_value = sum(values) / len(values) if values else 0

    if current_value is None:
        return

    # Evaluate condition
    triggered = False
    if condition == "gt" and current_value > threshold:
        triggered = True
    elif condition == "lt" and current_value < threshold:
        triggered = True
    elif condition == "gte" and current_value >= threshold:
        triggered = True
    elif condition == "lte" and current_value <= threshold:
        triggered = True
    elif condition == "eq" and current_value == threshold:
        triggered = True

    if triggered:
        logger.info("Alert triggered: %s (value=%s, threshold=%s)", alert.get("name"), current_value, threshold)

        # Record trigger
        admin.table("analytics_alerts").update({
            "triggered_count": (alert.get("triggered_count") or 0) + 1,
            "last_triggered_at": _now(),
            "last_value": current_value,
        }).eq("id", alert["id"]).execute()

        # Create notification for recipients
        for recipient_id in (alert.get("recipients") or []):
            admin.table("notifications").insert({
                "user_id": recipient_id,
                "org_id": org_id,
                "type": "analytics.alert_triggered",
                "title": f"Alert: {alert.get('name')}",
                "message": f"Metric '{metric}' is {current_value} (threshold: {condition} {threshold})",
                "read": False,
                "data": {"alert_id": alert["id"], "metric": metric, "value": current_value},
                "created_at": _now(),
            }).execute()

        # Send email notifications
        if "email" in (alert.get("notification_channels") or []):
            for recipient_id in (alert.get("recipients") or []):
                send_notification_email.delay(
                    user_id=recipient_id,
                    subject=f"NexusOS Alert: {alert.get('name')}",
                    body=f"Alert '{alert.get('name')}' was triggered.\nMetric: {metric}\nCurrent value: {current_value}\nThreshold: {condition} {threshold}",
                )
