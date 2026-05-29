"""
Header API Routes

Endpoints for authenticated header/navigation data
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime

from beanie import PydanticObjectId
from app.models.schema import User, Notification
from app.services.header_service import HeaderService
from app.auth.auth import get_current_user

router = APIRouter(prefix="/header", tags=["Header"])


@router.get("/")
async def get_header_data(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get header data for authenticated user

    Returns:
    - user: User profile info (name, avatar, role, online status)
    - notifications: Unread notification count
    """
    try:
        header_data = await HeaderService.get_header_data(str(current_user.id))
        return header_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load header data: {str(e)}"
        )


@router.get("/notifications")
async def get_notifications(
    limit: int = 20,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get recent notifications for the current user."""
    try:
        notifications = await Notification.find(
            Notification.user_id == current_user.id
        ).sort(-Notification.id).limit(limit).to_list()

        unread_count = sum(1 for n in notifications if not n.is_read)

        items = []
        for n in notifications:
            items.append({
                "id": str(n.id),
                "type": n.type,
                "category": n.category,
                "title": n.title,
                "message": n.message,
                "action_url": n.action_url,
                "action_text": n.action_text,
                "actor_name": n.actor_name,
                "actor_image": n.actor_image,
                "is_read": n.is_read,
                "created_at": n.id.generation_time.isoformat() if hasattr(n.id, 'generation_time') else None,
            })

        return {"notifications": items, "unread_count": unread_count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load notifications: {str(e)}"
        )


@router.post("/notifications/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Mark all notifications as read for the current user."""
    try:
        await Notification.find(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        ).update({"$set": {"is_read": True, "read_at": datetime.utcnow()}})
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notifications as read: {str(e)}"
        )


@router.post("/notifications/{notification_id}/read")
async def mark_one_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Mark a single notification as read."""
    try:
        notif = await Notification.get(PydanticObjectId(notification_id))
        if not notif or str(notif.user_id) != str(current_user.id):
            raise HTTPException(status_code=404, detail="Notification not found")
        if not notif.is_read:
            notif.is_read = True
            notif.read_at = datetime.utcnow()
            await notif.save()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notification as read: {str(e)}"
        )
