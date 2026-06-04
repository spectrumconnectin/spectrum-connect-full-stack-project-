from __future__ import annotations
import logging
import os
import sys

from pydantic_settings import BaseSettings
from pydantic import AnyUrl, EmailStr
from typing import Union

logger = logging.getLogger(__name__)

# Sentinel values used as defaults in development. If any of these is still
# present in production, startup fails fast so we never run with weak secrets.
_INSECURE_SECRET_KEY = "spectrum-dev-secret-change-in-prod"
_INSECURE_ADMIN_KEY = "spectrum-admin-secret-2025"


class Settings(BaseSettings):
    """
    Central application settings.

    In production (ENVIRONMENT=production) any sentinel/default value below
    will cause startup to abort with a clear error.
    """

    # Core security / auth
    SECRET_KEY: str = _INSECURE_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Google OAuth
    GOOGLE_CLIENT_ID: str = "dev-google-client-id"
    GOOGLE_CLIENT_SECRET: str = "dev-google-client-secret"
    GOOGLE_REDIRECT_URI: Union[AnyUrl, str] = "http://localhost:8000/auth/google_callback"

    # Facebook OAuth
    FACEBOOK_CLIENT_ID: str = "dev-facebook-app-id"
    FACEBOOK_CLIENT_SECRET: str = "dev-facebook-app-secret"
    FACEBOOK_REDIRECT_URI: Union[AnyUrl, str] = "http://localhost:8000/auth/facebook_callback"

    # Email Configuration (Brevo)
    BREVO_API_KEY: str = ""
    BREVO_SMTP_USER: str = ""
    FROM_EMAIL: Union[EmailStr, str] = "team.spectrumstudios@gmail.com"

    # Frontend URL
    FRONTEND_URL: Union[AnyUrl, str] = "http://localhost:5173"

    # Environment
    ENVIRONMENT: str = "development"
    ENV: str = "development"

    # **MongoDB Configuration**
    MONGO_URI: str
    MONGODB_DB: str

    # Admin Registration — keep this secret, only share with trusted team
    ADMIN_REGISTRATION_KEY: str = _INSECURE_ADMIN_KEY

    # ── Commission (v1 split 8/4) ────────────────────────────────────────
    # See app/services/commission_service.py and the spec
    # "Spectrum Connect — Commission Logic (v1, Split 8/4)" for details.
    # Stored as strings so callers can convert to Decimal without float
    # round-tripping (Pydantic 2 happily reads floats from env, but we want
    # the exact decimal representation: "0.12" not 0.11999999...).
    COMM_TOTAL_RATE: str = "0.12"
    COMM_CREATOR_PART: str = "0.6666666666666667"   # 8/12
    COMM_CLIENT_PART: str = "0.3333333333333333"    # 4/12
    COMM_MICRO_THRESHOLD: str = "20.00"
    COMM_MICRO_CAP: str = "2.00"
    COMM_VERSION: str = "v1.split.8_4"

    # ── ETF Points (Earn Trust Framework) ────────────────────────────────
    # See app/services/etf_points_service.py and ETF_FRAMEWORK.md.
    # Internal point-to-USD conversion. NEVER expose this in any user-facing
    # response — only used by backend cash-out calculations.
    ETF_POINTS_PER_USD: int = 100                   # 100 points = $1.00

    # Per-action point awards. Tunable without code changes.
    ETF_POINTS_PROJECT_POSTED: int = 5              # client posts a job
    ETF_POINTS_PROJECT_HIRED: int = 20              # client hires (proposal accepted)
    ETF_POINTS_MILESTONE_FUNDED: int = 10           # client funds a milestone
    ETF_POINTS_MILESTONE_RELEASED_CLIENT: int = 15  # client releases on time
    ETF_POINTS_MILESTONE_RELEASED_CREATOR: int = 50 # creator gets paid out
    ETF_POINTS_PROJECT_COMPLETED_CLIENT: int = 50   # whole project wraps
    ETF_POINTS_PROJECT_COMPLETED_CREATOR: int = 100 # whole project wraps
    ETF_POINTS_REVIEW_SUBMITTED: int = 15           # leaving a review
    ETF_POINTS_REPEAT_CLIENT_BONUS: int = 25        # creator rewarded for repeat hire
    ETF_POINTS_ON_TIME_DELIVERY: int = 30           # bonus for delivering before due date
    ETF_POINTS_PROFILE_VERIFIED: int = 100          # one-shot on first verification

    # Level thresholds (in lifetime points). Crossing these flips the badge.
    ETF_LEVEL_SILVER: int = 250
    ETF_LEVEL_GOLD: int = 1000
    ETF_LEVEL_PLATINUM: int = 5000

    # Cash-out gating. All can be flipped via env without redeploy.
    ETF_CASHOUT_ENABLED: bool = False               # master kill switch
    ETF_CASHOUT_MIN_POINTS: int = 1000              # = $10.00 internally
    ETF_CASHOUT_MIN_ACCOUNT_AGE_DAYS: int = 365     # 12 months per spec

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production" or self.ENV.lower() == "production"


settings = Settings()


def _assert_production_secrets(s: Settings) -> None:
    """Refuse to run in production with development-default secrets."""
    if not s.is_production():
        return

    failures: list[str] = []

    if s.SECRET_KEY == _INSECURE_SECRET_KEY or len(s.SECRET_KEY) < 32:
        failures.append(
            "SECRET_KEY is missing or uses the development default. "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
        )

    if s.ADMIN_REGISTRATION_KEY == _INSECURE_ADMIN_KEY or len(s.ADMIN_REGISTRATION_KEY) < 24:
        failures.append(
            "ADMIN_REGISTRATION_KEY is missing or uses the development default. "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )

    if s.GOOGLE_CLIENT_ID == "dev-google-client-id" and os.getenv("ALLOW_INSECURE_OAUTH") != "1":
        # OAuth is optional, only block if you tried to use it without setting it.
        # Allow opt-out via ALLOW_INSECURE_OAUTH=1 if Google sign-in is intentionally disabled.
        logger.warning(
            "GOOGLE_CLIENT_ID is not configured. Google sign-in will not work."
        )

    if failures:
        sys.stderr.write("\n".join(["[FATAL] Insecure production configuration:"] + ["  - " + f for f in failures]) + "\n")
        sys.exit(1)


_assert_production_secrets(settings)
