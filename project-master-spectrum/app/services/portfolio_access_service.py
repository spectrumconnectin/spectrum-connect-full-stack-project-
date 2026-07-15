"""
Portfolio access tokens — short-lived JWTs proving a visitor entered the
correct passcode for a password-protected portfolio.

Mirrors app/services/verification.py's token pattern exactly (same JWT
library, same SECRET_KEY/ALGORITHM, a `type` claim to disambiguate purpose).
Stateless by design: no DB-stored hash / single-use tracking needed since
this only gates read access, not an account-security-sensitive action.
"""
from __future__ import annotations
from datetime import datetime, timedelta
import logging

from jose import jwt, JWTError, ExpiredSignatureError

from app.core.config import settings

logger = logging.getLogger(__name__)


def create_portfolio_access_token(owner_user_id: str, expires_minutes: int = 1440) -> str:
    """Create a short-lived JWT proving access to one owner's password-protected portfolio."""
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    data = {"sub": owner_user_id, "exp": expire, "type": "portfolio_access"}
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_portfolio_access_token(token: str) -> str | None:
    """Validate a portfolio access token and return the owner_user_id (subject)
    if valid, or None if invalid/expired/wrong-purpose."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except ExpiredSignatureError:
        logger.info("Portfolio access token expired")
        return None
    except JWTError as exc:
        logger.warning("Invalid portfolio access token: %s", exc)
        return None

    if payload.get("type") != "portfolio_access":
        logger.warning("Token with unexpected type used for portfolio access")
        return None

    return payload.get("sub")
