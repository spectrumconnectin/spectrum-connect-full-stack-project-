"""
Presence Router
===============
Handles user online/offline status and activity tracking.

Endpoints:
- POST /presence/online — Mark current user as online
- POST /presence/offline — Mark current user as offline
- POST /presence/activity — Update last activity (keep user marked as online)
- GET /presence/{user_id} — Get presence info for a specific user
"""

from fastapi import APIRouter, Depends, Request
from jose import JWTError, jwt
from app.auth.auth import get_current_user
from app.models.schema import User
from app.services.presence_service import PresenceService
from app.core.config import settings


router = APIRouter(prefix="/presence", tags=["presence"])


@router.post("/online")
async def set_online(current_user: User = Depends(get_current_user)):
    """Mark current user as online"""
    await PresenceService.set_online(str(current_user.id))
    return {"status": "online", "user_id": str(current_user.id)}


@router.post("/offline")
async def set_offline(current_user: User = Depends(get_current_user)):
    """Mark current user as offline"""
    await PresenceService.set_offline(str(current_user.id))
    return {"status": "offline", "user_id": str(current_user.id)}


@router.post("/activity")
async def update_activity(current_user: User = Depends(get_current_user)):
    """Update user's last activity (keeps them marked as online)"""
    await PresenceService.update_activity(str(current_user.id))
    return {"status": "activity_updated", "user_id": str(current_user.id)}


@router.post("/offline-beacon")
async def offline_beacon(request: Request):
    """
    Beacon endpoint for navigator.sendBeacon() — called when the tab/browser closes.
    sendBeacon() sends a POST with Content-Type text/plain whose body is the JWT token.
    We extract and validate the token ourselves since the Depends pattern can't be used
    for beacon requests (they lack proper headers and fire after the JS context is gone).
    """
    try:
        body = await request.body()
        token = body.decode("utf-8").strip()
        if not token:
            return {"ok": False}
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            return {"ok": False}
        user = await User.find_one(User.username == username)
        if user:
            await PresenceService.set_offline(str(user.id))
    except Exception:
        pass  # Beacon is fire-and-forget; never return an error
    return {"ok": True}


@router.get("/{user_id}")
async def get_presence(user_id: str, current_user: User = Depends(get_current_user)):
    """Get presence info for a specific user"""
    presence = await PresenceService.get_presence(user_id)
    return presence
