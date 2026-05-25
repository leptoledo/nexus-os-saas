from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.middleware.tenant import TenantMiddleware

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("NexusOS API starting up (env=%s)", settings.APP_ENV)

    # Skip blocking connectivity checks at startup — they can hang if env vars
    # are not yet configured (e.g. fresh Railway deploy). Use /health/ready instead.
    logger.info("NexusOS API ready")

    yield

    logger.info("NexusOS API shutting down")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="NexusOS API",
    description=(
        "Multi-tenant SaaS backend for NexusOS — the all-in-one business operating system. "
        "Covers auth, organizations, billing, marketing, projects, analytics, WhatsApp and notifications."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.nexusos.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-RateLimit-Remaining"],
)

# ---------------------------------------------------------------------------
# Tenant middleware (must come after CORS)
# ---------------------------------------------------------------------------

app.add_middleware(TenantMiddleware)

# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

from app.auth.router import router as auth_router
from app.analytics.router import router as analytics_router
from app.billing.router import router as billing_router
from app.marketing.router import router as marketing_router
from app.notifications.router import router as notifications_router
from app.projects.router import router as projects_router
from app.tenants.router import router as tenants_router
from app.whatsapp.router import router as whatsapp_router

app.include_router(auth_router)
app.include_router(tenants_router)
app.include_router(billing_router)
app.include_router(marketing_router)
app.include_router(projects_router)
app.include_router(analytics_router)
app.include_router(whatsapp_router)
app.include_router(notifications_router)

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["Health"], summary="Health check")
async def health_check():
    """Lightweight liveness probe — always returns 200 immediately."""
    return {"status": "ok", "version": "1.0.0", "environment": settings.APP_ENV}


@app.get("/health/ready", tags=["Health"], summary="Readiness check")
async def readiness_check():
    """Returns connectivity status for Supabase and Redis."""
    checks: dict = {"api": "ok"}

    # Supabase ping (only if URL is configured)
    if settings.SUPABASE_URL:
        try:
            from app.database import get_supabase_admin
            import anyio
            with anyio.fail_after(5):
                get_supabase_admin().table("organizations").select("id").limit(1).execute()
            checks["database"] = "ok"
        except Exception as exc:
            checks["database"] = f"error: {exc}"
    else:
        checks["database"] = "not configured"

    # Redis ping
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        r.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {exc}"

    overall = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    status_code = 200 if overall == "healthy" else 207
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content={"status": overall, "version": "1.0.0", "environment": settings.APP_ENV, "checks": checks},
        status_code=status_code,
    )


@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": "NexusOS API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/health",
    }
