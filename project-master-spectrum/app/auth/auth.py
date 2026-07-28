from datetime import datetime, timedelta
from typing import Optional
import bcrypt

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.models.schema import User
from .schemas import TokenData

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# Name of the httpOnly cookie the web app authenticates with (set at /auth/login
# and /auth/oauth-token). Kept in sync with app/auth/router.py.
AUTH_COOKIE_NAME = "auth_token"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


async def _resolve_token(
    request: Request,
    header_token: Optional[str] = Depends(oauth2_scheme_optional),
) -> Optional[str]:
    """Prefer the Authorization header (API clients, mobile, scripts); fall back
    to the httpOnly auth cookie the browser sends automatically. This lets the
    web frontend stop keeping the JWT in JS-readable storage (localStorage /
    non-HttpOnly cookie) without breaking any existing header-based caller."""
    if header_token:
        return header_token
    return request.cookies.get(AUTH_COOKIE_NAME)

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def _is_account_active(user: User) -> bool:
    """Return False if the account is soft-deleted or suspended."""
    if user.deleted_at is not None:
        return False
    if not getattr(user, "is_active", True):  # is_active defaults True (field may not exist yet)
        return False
    return True


async def get_current_user(token: Optional[str] = Depends(_resolve_token)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        # Hardcode HS256 — never accept "none" or RS algorithms even if config changes.
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = await User.find_one(User.username == token_data.username)
    if user is None:
        raise credentials_exception
    # Reject tokens for suspended or soft-deleted accounts immediately.
    if not _is_account_active(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended or deleted.",
        )
    return user


async def get_current_user_optional(token: Optional[str] = Depends(_resolve_token)):
    """
    Same as get_current_user but returns None instead of raising when token is missing/invalid.
    Useful for optional auth flows (e.g., public profile views).
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            return None
        user = await User.find_one(User.username == username)
        if user is None or not _is_account_active(user):
            return None
        return user
    except JWTError:
        return None

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Allows both admin and moderator roles.
    Used for read and standard moderation endpoints.
    """
    if current_user.user_role not in {"admin", "moderator"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


async def get_superadmin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Allows admin role only — moderators are blocked.
    Used for sensitive actions: role changes, bulk deletes, refunds.
    """
    if current_user.user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires full admin privileges.",
        )
    return current_user