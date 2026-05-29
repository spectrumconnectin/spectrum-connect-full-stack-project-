from __future__ import annotations
from pydantic_settings import BaseSettings
from pydantic import AnyUrl, EmailStr
from typing import Union

class Settings(BaseSettings):
    """
    Central application settings.
    """

    # Core security / auth
    SECRET_KEY: str = "spectrum-dev-secret-change-in-prod"
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
    ADMIN_REGISTRATION_KEY: str = "spectrum-admin-secret-2025"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()