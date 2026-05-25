from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.database import get_current_user, get_supabase_admin, get_tenant_id
from app.middleware.rbac import require_min_plan, require_min_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class DashboardCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    layout: Optional[Dict[str, Any]] = {}
    is_default: bool = False


class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None


class WidgetCreate(BaseModel):
    title: str = Field(..., max_length=200)
    # widget_type enum: line, bar, pie, area, funnel, table, kpi, sparkline
    type: str
    config: Optional[Dict[str, Any]] = {}
    position: Optional[Dict[str, Any]] = {"x": 0, "y": 0, "w": 4, "h": 3}


class WidgetUpdate(BaseModel):
    title: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    position: Optional[Dict[str, Any]] = None


class ReportCreate(BaseModel):
    name: str = Field(..., max_length=200)
    dashboard_id: Optional[str] = None
    schedule_cron: str = "0 9 * * 1"  # Weekly Monday 9am
    recipients: Optional[List[str]] = []
    format: str = "pdf"  # pdf, excel, both


class ReportUpdate(BaseModel):
    name: Optional[str] = None
    schedule_cron: Optional[str] = None
    recipients: Optional[List[str]] = None
    format: Optional[str] = None
    is_active: Optional[bool] = None


class AlertCreate(BaseModel):
    name: str = Field(..., max_length=200)
    metric: str  # e.g. "leads_count", "campaign_open_rate"
    condition: str  # "gt", "lt", "gte", "lte", "eq"
    threshold_value: float
    notification_channels: Optional[List[str]] = ["email"]
    is_active: bool = True


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _now() -> str:
    return datetime.utcnow().isoformat()


def _not_found(entity: str = "Resource") -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity} not found")


# ---------------------------------------------------------------------------
# Dashboard routes
# ---------------------------------------------------------------------------


@router.get("/dashboards")
async def list_dashboards(
    org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)
):
    admin = get_supabase_admin()
    result = (
        admin.table("analytics_dashboards")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": result.data or []}


@router.post("/dashboards", status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    body: DashboardCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    if body.is_default:
        # Unset any existing default
        try:
            admin.table("analytics_dashboards").update({"is_default": False}).eq(
                "org_id", org_id
            ).eq("is_default", True).execute()
        except Exception:
            pass
    data = {
        **body.model_dump(),
        "org_id": org_id,
        "created_by": current_user.user_id,
        "created_at": _now(),
    }
    result = admin.table("analytics_dashboards").insert(data).execute()
    return result.data[0]


@router.get("/dashboards/{dashboard_id}")
async def get_dashboard(
    dashboard_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("analytics_dashboards")
        .select("*")
        .eq("id", dashboard_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        raise _not_found("Dashboard")
    return result.data


@router.put("/dashboards/{dashboard_id}")
async def update_dashboard(
    dashboard_id: str,
    body: DashboardUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        admin.table("analytics_dashboards")
        .update(update_data)
        .eq("id", dashboard_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Dashboard")
    return result.data[0]


@router.delete("/dashboards/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("analytics_dashboards").delete().eq("id", dashboard_id).eq(
        "org_id", org_id
    ).execute()


# ---------------------------------------------------------------------------
# Widget routes
# ---------------------------------------------------------------------------


@router.get("/dashboards/{dashboard_id}/widgets")
async def list_widgets(
    dashboard_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("dashboard_widgets")
        .select("*")
        .eq("dashboard_id", dashboard_id)
        .eq("org_id", org_id)
        .execute()
    )
    return {"data": result.data or []}


@router.post("/dashboards/{dashboard_id}/widgets", status_code=status.HTTP_201_CREATED)
async def create_widget(
    dashboard_id: str,
    body: WidgetCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    data = {
        **body.model_dump(),
        "dashboard_id": dashboard_id,
        "org_id": org_id,
        "created_at": _now(),
    }
    result = admin.table("dashboard_widgets").insert(data).execute()
    return result.data[0]


@router.put("/dashboards/{dashboard_id}/widgets/{widget_id}")
async def update_widget(
    dashboard_id: str,
    widget_id: str,
    body: WidgetUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        admin.table("dashboard_widgets")
        .update(update_data)
        .eq("id", widget_id)
        .eq("dashboard_id", dashboard_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Widget")
    return result.data[0]


@router.delete(
    "/dashboards/{dashboard_id}/widgets/{widget_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_widget(
    dashboard_id: str,
    widget_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("dashboard_widgets").delete().eq("id", widget_id).eq(
        "dashboard_id", dashboard_id
    ).execute()


# ---------------------------------------------------------------------------
# Import routes
# ---------------------------------------------------------------------------


@router.post("/import/csv")
async def import_csv(
    file: UploadFile = File(...),
    dataset_name: Optional[str] = None,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    """Import data from a CSV file. Creates a data_source + imported_data record."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}") from exc

    name = dataset_name or file.filename.replace(".csv", "")
    records = df.to_dict(orient="records")
    columns = list(df.columns)

    admin = get_supabase_admin()

    # Create data_source entry
    ds_result = admin.table("data_sources").insert({
        "org_id": org_id,
        "name": name,
        "type": "csv",
        "connection_config": {"filename": file.filename},
        "created_by": current_user.user_id,
        "created_at": _now(),
    }).execute()
    data_source_id = ds_result.data[0]["id"] if ds_result.data else None

    dataset_id = None
    if data_source_id:
        imp_result = admin.table("imported_data").insert({
            "data_source_id": data_source_id,
            "org_id": org_id,
            "table_name": name,
            "schema": {"columns": columns},
            "row_count": len(records),
            "created_at": _now(),
        }).execute()
        dataset_id = imp_result.data[0]["id"] if imp_result.data else None

    return {
        "message": "CSV imported successfully",
        "dataset_id": dataset_id,
        "rows": len(records),
        "columns": columns,
        "preview": records[:5],
    }


@router.post("/import/excel")
async def import_excel(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = None,
    dataset_name: Optional[str] = None,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    """Import data from an Excel file."""
    if not (file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")

    content = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(content), sheet_name=sheet_name)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse Excel: {exc}") from exc

    name = dataset_name or file.filename.rsplit(".", 1)[0]
    records = df.to_dict(orient="records")
    columns = list(df.columns)

    admin = get_supabase_admin()

    ds_result = admin.table("data_sources").insert({
        "org_id": org_id,
        "name": name,
        "type": "excel",
        "connection_config": {"filename": file.filename},
        "created_by": current_user.user_id,
        "created_at": _now(),
    }).execute()
    data_source_id = ds_result.data[0]["id"] if ds_result.data else None

    dataset_id = None
    if data_source_id:
        imp_result = admin.table("imported_data").insert({
            "data_source_id": data_source_id,
            "org_id": org_id,
            "table_name": name,
            "schema": {"columns": columns},
            "row_count": len(records),
            "created_at": _now(),
        }).execute()
        dataset_id = imp_result.data[0]["id"] if imp_result.data else None

    return {
        "message": "Excel imported successfully",
        "dataset_id": dataset_id,
        "rows": len(records),
        "columns": columns,
        "preview": records[:5],
    }


# ---------------------------------------------------------------------------
# Reports routes
# ---------------------------------------------------------------------------


@router.get("/reports")
async def list_reports(
    org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)
):
    admin = get_supabase_admin()
    result = (
        admin.table("scheduled_reports")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": result.data or []}


@router.post("/reports", status_code=status.HTTP_201_CREATED)
async def create_report(
    body: ReportCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_plan("pro")),
):
    admin = get_supabase_admin()
    data = {
        **body.model_dump(),
        "org_id": org_id,
        "created_by": current_user.user_id,
        "is_active": True,
        "last_run_at": None,
        "created_at": _now(),
    }
    result = admin.table("scheduled_reports").insert(data).execute()
    return result.data[0]


@router.put("/reports/{report_id}")
async def update_report(
    report_id: str,
    body: ReportUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        admin.table("scheduled_reports")
        .update(update_data)
        .eq("id", report_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Report")
    return result.data[0]


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("scheduled_reports").delete().eq("id", report_id).eq("org_id", org_id).execute()


@router.post("/reports/{report_id}/export/pdf")
async def export_report_pdf(
    report_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_plan("pro")),
):
    """Generate and return a PDF export of the report."""
    admin = get_supabase_admin()
    report_res = (
        admin.table("scheduled_reports")
        .select("*")
        .eq("id", report_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not report_res.data:
        raise _not_found("Report")

    # Enqueue Celery task and return task ID for polling
    try:
        from app.tasks.celery_app import export_report_pdf as celery_export_pdf
        task = celery_export_pdf.delay(report_id)
        return {
            "task_id": task.id,
            "message": "Export queued. Check /analytics/reports/exports/{task_id} for download.",
        }
    except Exception as exc:
        logger.warning("Celery unavailable, generating inline: %s", exc)

    # Inline PDF generation (fallback)
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    c.setTitle(report_res.data["name"])
    c.drawString(100, 800, f"Report: {report_res.data['name']}")
    c.drawString(100, 780, f"Organization: {org_id}")
    c.drawString(100, 760, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"},
    )


@router.post("/reports/{report_id}/export/excel")
async def export_report_excel(
    report_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_plan("pro")),
):
    """Generate and return an Excel export of the report."""
    admin = get_supabase_admin()
    report_res = (
        admin.table("scheduled_reports")
        .select("*")
        .eq("id", report_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not report_res.data:
        raise _not_found("Report")

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        meta_df = pd.DataFrame([{
            "Report Name": report_res.data["name"],
            "Organization": org_id,
            "Generated At": datetime.utcnow().isoformat(),
            "Format": "Excel",
        }])
        meta_df.to_excel(writer, sheet_name="Info", index=False)

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.xlsx"},
    )


# ---------------------------------------------------------------------------
# AI Insights routes
# ---------------------------------------------------------------------------


@router.get("/ai/insights")
async def ai_insights(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_plan("pro")),
):
    """Return AI-generated insights for the organization."""
    admin = get_supabase_admin()

    # Gather data summaries
    leads_res = (
        admin.table("leads").select("stage, value_estimated, created_at").eq("org_id", org_id).execute()
    )
    campaigns_res = (
        admin.table("email_campaigns").select("status, created_at").eq("org_id", org_id).execute()
    )
    tasks_res = (
        admin.table("tasks").select("status, priority, created_at").eq("org_id", org_id).execute()
    )

    leads = leads_res.data or []
    campaigns = campaigns_res.data or []
    tasks = tasks_res.data or []

    summary = {
        "total_leads": len(leads),
        "won_leads": len([l for l in leads if l.get("stage") == "closed_won"]),
        "pipeline_value": sum(l.get("value_estimated") or 0 for l in leads),
        "total_campaigns": len(campaigns),
        "sent_campaigns": len([c for c in campaigns if c.get("status") in ("sent", "sending")]),
        "total_tasks": len(tasks),
        "completed_tasks": len([t for t in tasks if t.get("status") == "done"]),
        "overdue_high_priority": len([
            t for t in tasks
            if t.get("priority") in ("high", "urgent") and t.get("status") != "done"
        ]),
    }

    insights = []

    # Rule-based insights (fallback if no OpenAI)
    if summary["total_leads"] > 0:
        win_rate = summary["won_leads"] / summary["total_leads"] * 100
        if win_rate < 20:
            insights.append({
                "type": "warning",
                "title": "Low Lead Conversion Rate",
                "message": f"Your win rate is {win_rate:.1f}%. Consider improving your sales qualification process.",
                "metric": "win_rate",
                "value": win_rate,
            })
        else:
            insights.append({
                "type": "positive",
                "title": "Good Conversion Rate",
                "message": f"You're converting {win_rate:.1f}% of leads. Keep up the good work!",
                "metric": "win_rate",
                "value": win_rate,
            })

    if summary["overdue_high_priority"] > 0:
        insights.append({
            "type": "alert",
            "title": "High Priority Tasks Pending",
            "message": f"You have {summary['overdue_high_priority']} high/urgent priority tasks not yet completed.",
            "metric": "overdue_tasks",
            "value": summary["overdue_high_priority"],
        })

    # Try OpenAI for richer insights
    if settings.OPENAI_API_KEY:
        try:
            import openai
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            prompt = f"""Analyze this business data and provide 3 concise, actionable insights:
{summary}
Format as JSON array: [{{"type": "positive|warning|alert", "title": "...", "message": "...", "recommendation": "..."}}]"""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                response_format={"type": "json_object"},
            )
            import json
            ai_result = json.loads(response.choices[0].message.content)
            if isinstance(ai_result, list):
                insights.extend(ai_result)
            elif isinstance(ai_result, dict) and "insights" in ai_result:
                insights.extend(ai_result["insights"])
        except Exception as exc:
            logger.warning("OpenAI insights failed: %s", exc)

    return {"insights": insights, "summary": summary, "generated_at": _now()}


@router.get("/ai/forecast")
async def ai_forecast(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    metric: str = "leads",
    periods: int = 4,
    _=Depends(require_min_plan("pro")),
):
    """Return AI-generated forecasts for key metrics."""
    admin = get_supabase_admin()

    if metric == "leads":
        res = (
            admin.table("leads")
            .select("created_at, value_estimated")
            .eq("org_id", org_id)
            .order("created_at")
            .execute()
        )
        data = res.data or []
    elif metric == "revenue":
        res = (
            admin.table("leads")
            .select("created_at, value_estimated")
            .eq("org_id", org_id)
            .eq("stage", "closed_won")
            .order("created_at")
            .execute()
        )
        data = res.data or []
    else:
        data = []

    if len(data) < 3:
        return {
            "metric": metric,
            "message": "Insufficient data for forecasting. Need at least 3 data points.",
            "forecast": [],
        }

    # Simple linear trend forecast
    df = pd.DataFrame(data)
    df["created_at"] = pd.to_datetime(df["created_at"])
    df["month"] = df["created_at"].dt.to_period("M")
    monthly = df.groupby("month").size().reset_index(name="count")

    counts = monthly["count"].values.tolist()
    trend = (counts[-1] - counts[0]) / len(counts) if len(counts) >= 2 else 0

    forecast = []
    last_val = counts[-1] if counts else 0
    for i in range(1, periods + 1):
        forecast.append({
            "period": f"Month +{i}",
            "predicted_value": max(0, round(last_val + trend * i, 1)),
            "confidence": max(0.5, 0.95 - i * 0.1),
        })

    return {
        "metric": metric,
        "historical": counts,
        "forecast": forecast,
        "trend": round(trend, 2),
        "generated_at": _now(),
    }


@router.get("/ai/anomalies")
async def ai_anomalies(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_plan("pro")),
):
    """Return stored AI insights of type anomaly."""
    admin = get_supabase_admin()
    result = (
        admin.table("ai_insights")
        .select("*")
        .eq("org_id", org_id)
        .eq("type", "anomaly")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    return {
        "anomalies": result.data or [],
        "generated_at": _now(),
        "message": "Showing stored anomaly insights.",
    }


# ---------------------------------------------------------------------------
# Threshold Alerts
# ---------------------------------------------------------------------------


@router.post("/alerts", status_code=status.HTTP_201_CREATED)
async def create_alert(
    body: AlertCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    data = {
        **body.model_dump(),
        "org_id": org_id,
        "created_by": current_user.user_id,
        "created_at": _now(),
        "last_triggered_at": None,
    }
    result = admin.table("analytics_alerts").insert(data).execute()
    return result.data[0]


@router.get("/alerts")
async def list_alerts(
    org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)
):
    admin = get_supabase_admin()
    result = (
        admin.table("analytics_alerts")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": result.data or []}


@router.delete("/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("analytics_alerts").delete().eq("id", alert_id).eq("org_id", org_id).execute()


# ---------------------------------------------------------------------------
# Data Explorer (Visual Query)
# ---------------------------------------------------------------------------

ALLOWED_DATA_SOURCES = {
    "leads",
    "email_campaigns",
    "tasks",
    "time_entries",
    "landing_pages",
    "organization_members",
}


@router.get("/query")
async def data_explorer(
    data_source: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    limit: int = 100,
    order_by: Optional[str] = None,
    order_desc: bool = False,
    _=Depends(require_min_plan("pro")),
):
    """Run a simple visual query against an allowed data source."""
    if data_source not in ALLOWED_DATA_SOURCES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Data source '{data_source}' not allowed. Allowed: {sorted(ALLOWED_DATA_SOURCES)}",
        )

    limit = min(limit, 1000)
    admin = get_supabase_admin()
    query = admin.table(data_source).select("*").eq("org_id", org_id).limit(limit)
    if order_by:
        query = query.order(order_by, desc=order_desc)
    result = query.execute()
    return {"data": result.data or [], "count": len(result.data or []), "data_source": data_source}
