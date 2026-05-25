from enum import Enum
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class SubscriptionPlan(str, Enum):
    starter = "starter"
    pro = "pro"
    business = "business"


class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    viewer = "viewer"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_BUSINESS: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Twilio / WhatsApp
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = ""

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # SMTP
    SMTP_HOST: str = "smtp.resend.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    EMAIL_FROM: str = "onboarding@resend.dev"

    # App
    FRONTEND_URL: str = "http://localhost:3000"
    APP_NAME: str = "NexusOS"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"


settings = Settings()

PLAN_LIMITS = {
    SubscriptionPlan.starter: {
        "max_members": 5,
        "max_projects": 10,
        "max_campaigns": 5,
        "ai_insights": False,
        "whatsapp": False,
        "custom_reports": False,
    },
    SubscriptionPlan.pro: {
        "max_members": 25,
        "max_projects": 50,
        "max_campaigns": 50,
        "ai_insights": True,
        "whatsapp": True,
        "custom_reports": True,
    },
    SubscriptionPlan.business: {
        "max_members": -1,  # unlimited
        "max_projects": -1,
        "max_campaigns": -1,
        "ai_insights": True,
        "whatsapp": True,
        "custom_reports": True,
    },
}
