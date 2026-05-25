# ============================================================
# Stage 1: Builder
# ============================================================
FROM python:3.12-slim AS builder

# System dependencies for native packages (cryptography, psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libssl-dev \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy only requirements first for layer caching
COPY requirements.txt .

# Install dependencies into a local prefix
RUN pip install --upgrade pip setuptools wheel && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt


# ============================================================
# Stage 2: Runtime
# ============================================================
FROM python:3.12-slim AS runtime

# Minimal runtime system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY --chown=appuser:appgroup . .

# Environment defaults (override via docker-compose / k8s secrets)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    PORT=8000

USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Entrypoint: run uvicorn with production settings
CMD ["sh", "-c", "uvicorn main:app \
    --host 0.0.0.0 \
    --port ${PORT} \
    --workers 4 \
    --loop uvloop \
    --http httptools \
    --proxy-headers \
    --forwarded-allow-ips '*' \
    --log-level info \
    --access-log"]
