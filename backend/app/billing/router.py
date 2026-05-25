from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel

from app.config import SubscriptionPlan, settings
from app.database import get_current_user, get_supabase_admin, get_tenant_id
from app.middleware.rbac import require_role

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/billing", tags=["Billing"])

# ---------------------------------------------------------------------------
# Plans metadata (returned to frontend)
# ---------------------------------------------------------------------------

PLANS = [
    {
        "id": "starter",
        "name": "Starter",
        "price_monthly": 29,
        "price_yearly": 290,
        "stripe_price_id": settings.STRIPE_PRICE_STARTER,
        "features": [
            "Up to 5 team members",
            "10 projects",
            "5 email campaigns/month",
            "Basic analytics",
            "Email support",
        ],
    },
    {
        "id": "pro",
        "name": "Pro",
        "price_monthly": 79,
        "price_yearly": 790,
        "stripe_price_id": settings.STRIPE_PRICE_PRO,
        "features": [
            "Up to 25 team members",
            "50 projects",
            "Unlimited campaigns",
            "AI insights",
            "WhatsApp integration",
            "Custom reports",
            "Priority support",
        ],
    },
    {
        "id": "business",
        "name": "Business",
        "price_monthly": 199,
        "price_yearly": 1990,
        "stripe_price_id": settings.STRIPE_PRICE_BUSINESS,
        "features": [
            "Unlimited team members",
            "Unlimited projects",
            "Unlimited campaigns",
            "Advanced AI & forecasting",
            "White-label options",
            "Dedicated account manager",
            "SLA guarantee",
        ],
    },
]


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class CheckoutRequest(BaseModel):
    plan: SubscriptionPlan
    interval: str = "month"  # "month" or "year"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class SubscriptionResponse(BaseModel):
    id: Optional[str]
    plan: str
    status: str
    current_period_start: Optional[int]
    current_period_end: Optional[int]
    cancel_at_period_end: bool
    stripe_customer_id: Optional[str]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/plans")
async def list_plans():
    """Return all available subscription plans."""
    return {"plans": PLANS}


@router.post("/checkout")
async def create_checkout_session(
    body: CheckoutRequest,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    """Create a Stripe Checkout session for the selected plan."""
    admin_client = get_supabase_admin()

    # Get or create Stripe customer
    org_res = (
        admin_client.table("organizations")
        .select("name, stripe_customer_id")
        .eq("id", org_id)
        .single()
        .execute()
    )
    if not org_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    org = org_res.data
    customer_id = org.get("stripe_customer_id")

    if not customer_id:
        try:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=org["name"],
                metadata={"org_id": org_id},
            )
            customer_id = customer.id
            admin_client.table("organizations").update(
                {"stripe_customer_id": customer_id}
            ).eq("id", org_id).execute()
        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Stripe error: {exc.user_message}",
            ) from exc

    # Map plan + interval to price ID
    price_map = {
        SubscriptionPlan.starter: settings.STRIPE_PRICE_STARTER,
        SubscriptionPlan.pro: settings.STRIPE_PRICE_PRO,
        SubscriptionPlan.business: settings.STRIPE_PRICE_BUSINESS,
    }
    price_id = price_map[body.plan]
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Price not configured for plan {body.plan}",
        )

    success_url = body.success_url or f"{settings.FRONTEND_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = body.cancel_url or f"{settings.FRONTEND_URL}/billing/cancel"

    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"org_id": org_id, "plan": body.plan.value},
            subscription_data={"metadata": {"org_id": org_id}},
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message}",
        ) from exc

    return {"checkout_url": session.url, "session_id": session.id}


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    org_id: str = Depends(get_tenant_id), current_user=Depends(get_current_user)
):
    """Return the current subscription details."""
    admin_client = get_supabase_admin()
    org_res = (
        admin_client.table("organizations")
        .select("plan, stripe_customer_id, stripe_subscription_id, subscription_status")
        .eq("id", org_id)
        .single()
        .execute()
    )
    if not org_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    org = org_res.data
    sub_id = org.get("stripe_subscription_id")
    period_start = period_end = None
    cancel_at_period_end = False

    if sub_id:
        try:
            sub = stripe.Subscription.retrieve(sub_id)
            period_start = sub.current_period_start
            period_end = sub.current_period_end
            cancel_at_period_end = sub.cancel_at_period_end
        except stripe.StripeError:
            pass

    return SubscriptionResponse(
        id=sub_id,
        plan=org.get("plan", "starter"),
        status=org.get("subscription_status", "inactive"),
        current_period_start=period_start,
        current_period_end=period_end,
        cancel_at_period_end=cancel_at_period_end,
        stripe_customer_id=org.get("stripe_customer_id"),
    )


@router.post("/portal")
async def create_billing_portal(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    """Create a Stripe Customer Portal session."""
    admin_client = get_supabase_admin()
    org_res = (
        admin_client.table("organizations")
        .select("stripe_customer_id")
        .eq("id", org_id)
        .single()
        .execute()
    )
    if not org_res.data or not org_res.data.get("stripe_customer_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe customer found. Create a subscription first.",
        )

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=org_res.data["stripe_customer_id"],
            return_url=f"{settings.FRONTEND_URL}/billing",
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message}",
        ) from exc

    return {"portal_url": portal_session.url}


@router.put("/subscription/cancel")
async def cancel_subscription(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    """Cancel the subscription at period end."""
    admin_client = get_supabase_admin()
    org_res = (
        admin_client.table("organizations")
        .select("stripe_subscription_id")
        .eq("id", org_id)
        .single()
        .execute()
    )
    if not org_res.data or not org_res.data.get("stripe_subscription_id"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active subscription")

    try:
        sub = stripe.Subscription.modify(
            org_res.data["stripe_subscription_id"],
            cancel_at_period_end=True,
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message}",
        ) from exc

    return {
        "message": "Subscription will be cancelled at end of billing period",
        "cancel_at": sub.cancel_at,
    }


@router.get("/invoices")
async def list_invoices(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    limit: int = 20,
):
    """Return invoice history from Stripe."""
    admin_client = get_supabase_admin()
    org_res = (
        admin_client.table("organizations")
        .select("stripe_customer_id")
        .eq("id", org_id)
        .single()
        .execute()
    )
    if not org_res.data or not org_res.data.get("stripe_customer_id"):
        return {"invoices": []}

    try:
        invoices = stripe.Invoice.list(
            customer=org_res.data["stripe_customer_id"], limit=min(limit, 100)
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message}",
        ) from exc

    return {
        "invoices": [
            {
                "id": inv.id,
                "number": inv.number,
                "amount_due": inv.amount_due,
                "amount_paid": inv.amount_paid,
                "currency": inv.currency,
                "status": inv.status,
                "created": inv.created,
                "period_start": inv.period_start,
                "period_end": inv.period_end,
                "hosted_invoice_url": inv.hosted_invoice_url,
                "invoice_pdf": inv.invoice_pdf,
            }
            for inv in invoices.data
        ]
    }


# ---------------------------------------------------------------------------
# Stripe Webhooks
# ---------------------------------------------------------------------------


@router.post("/webhooks/stripe", include_in_schema=False)
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(None)):
    """Handle Stripe webhook events."""
    import json as _json

    payload = await request.body()

    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.warning("STRIPE_WEBHOOK_SECRET not configured, skipping signature check")
        event_dict = _json.loads(payload)
    else:
        try:
            # Verify signature — returns Event object
            stripe.Webhook.construct_event(
                payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
            )
            event_dict = _json.loads(payload)
        except stripe.SignatureVerificationError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Stripe signature: {exc}",
            ) from exc

    # Work with raw dict — avoids StripeObject attribute quirks in SDK v15+
    event_type = event_dict.get("type", "")
    event_obj = event_dict.get("data", {}).get("object", {})
    admin_client = get_supabase_admin()

    if event_type == "checkout.session.completed":
        metadata = event_obj.get("metadata") or {}
        org_id = metadata.get("org_id")
        plan = metadata.get("plan", "starter")
        sub_id = event_obj.get("subscription")

        if org_id:
            admin_client.table("organizations").update(
                {
                    "plan": plan,
                    "stripe_subscription_id": sub_id,
                    "subscription_status": "active",
                }
            ).eq("id", org_id).execute()
            logger.info("Activated plan %s for org %s", plan, org_id)

    elif event_type == "customer.subscription.updated":
        sub = event_obj
        org_res = (
            admin_client.table("organizations")
            .select("id")
            .eq("stripe_customer_id", sub.get("customer"))
            .execute()
        )
        if org_res.data:
            org_id = org_res.data[0]["id"]
            price_id = sub.get("items", {}).get("data", [{}])[0].get("price", {}).get("id", "")
            plan = _price_to_plan(price_id)
            admin_client.table("organizations").update(
                {
                    "plan": plan,
                    "subscription_status": sub.get("status"),
                    "stripe_subscription_id": sub.get("id"),
                }
            ).eq("id", org_id).execute()

    elif event_type == "customer.subscription.deleted":
        sub = event_obj
        org_res = (
            admin_client.table("organizations")
            .select("id")
            .eq("stripe_customer_id", sub.get("customer"))
            .execute()
        )
        if org_res.data:
            org_id = org_res.data[0]["id"]
            admin_client.table("organizations").update(
                {"plan": "starter", "subscription_status": "cancelled", "stripe_subscription_id": None}
            ).eq("id", org_id).execute()

    elif event_type == "invoice.payment_failed":
        invoice = event_obj
        org_res = (
            admin_client.table("organizations")
            .select("id")
            .eq("stripe_customer_id", invoice.get("customer"))
            .execute()
        )
        if org_res.data:
            org_id = org_res.data[0]["id"]
            admin_client.table("organizations").update(
                {"subscription_status": "past_due"}
            ).eq("id", org_id).execute()
            logger.warning("Payment failed for org %s", org_id)

    logger.info("Processed Stripe event: %s", event_type)
    return {"received": True}


def _price_to_plan(price_id: str) -> str:
    mapping = {
        settings.STRIPE_PRICE_STARTER: "starter",
        settings.STRIPE_PRICE_PRO: "pro",
        settings.STRIPE_PRICE_BUSINESS: "business",
    }
    return mapping.get(price_id, "starter")
