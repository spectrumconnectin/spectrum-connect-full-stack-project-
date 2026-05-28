from pydantic_settings import BaseSettings
from pydantic import AnyUrl, EmailStr

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
    GOOGLE_REDIRECT_URI: AnyUrl | str = "http://localhost:8000/auth/google/callback"

    # Facebook OAuth
    FACEBOOK_CLIENT_ID: str = "dev-facebook-app-id"
    FACEBOOK_CLIENT_SECRET: str = "dev-facebook-app-secret"
    FACEBOOK_REDIRECT_URI: AnyUrl | str = "http://localhost:8000/auth/facebook_callback"

    # Email Configuration
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: EmailStr | str = "dev@example.com"
    SMTP_PASSWORD: str = "dev-smtp-password"
    FROM_EMAIL: EmailStr | str = "no-reply@example.com"

    # Frontend URL
    FRONTEND_URL: AnyUrl | str = "http://localhost:5173"

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