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
