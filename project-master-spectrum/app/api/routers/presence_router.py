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

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.schema import User
from app.services.presence_service import PresenceService


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


@router.get("/{user_id}")
async def get_presence(user_id: str, current_user: User = Depends(get_current_user)):
    """Get presence info for a specific user"""
    presence = await PresenceService.get_presence(user_id)
    return presence
