from datetime import datetime, timedelta
import logging

from jose import jwt, JWTError, ExpiredSignatureError

from app.core.config import settings

logger = logging.getLogger(__name__)


def create_verification_token(email: str) -> str:
    """
    Create a short‑lived JWT for email verification.
    """
    expire = datetime.utcnow() + timedelta(hours=24)
    data = {"sub": email, "exp": expire, "type": "email_verification"}
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> str | None:
    """
    Validate an email verification token and return the email (subject)
    if valid, or None if invalid/expired.

    Uses explicit exception handling instead of a bare `except` and logs
    at debug/info level without leaking secrets.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except ExpiredSignatureError:
        logger.info("Email verification token expired")
        return None
    except JWTError as exc:
        # Includes invalid signature, malformed token, wrong algorithm, etc.
        logger.warning("Invalid email verification token: %s", exc)
        return None

    if payload.get("type") != "email_verification":
        logger.warning("Token with unexpected type used for email verification")
        return None

    return payload.get("sub")


def create_password_reset_token(email: str) -> str:
    """
    Create a short-lived JWT for password reset.
    Expires in 1 hour for security.
    """
    expire = datetime.utcnow() + timedelta(hours=1)
    data = {"sub": email, "exp": expire, "type": "password_reset"}
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_password_reset_token(token: str) -> str | None:
    """
    Validate a password reset token and return the email if valid,
    or None if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except ExpiredSignatureError:
        logger.info("Password reset token expired")
        return None
    except JWTError as exc:
        logger.warning("Invalid password reset token: %s", exc)
        return None

    if payload.get("type") != "password_reset":
        logger.warning("Token with unexpected type used for password reset")
        return None

    return payload.get("sub")
