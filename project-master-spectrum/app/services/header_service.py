"""
Header Service

Provides data for authenticated user header/navigation components
"""

from typing import Dict, Any, Optional
from beanie import PydanticObjectId

from app.models.schema import User, Notification


class HeaderService:
    """Service for header/navigation data"""

    @staticmethod
    async def get_header_data(user_id: str) -> Dict[str, Any]:
        """
        Get all data needed for the authenticated header component

        Returns:
        - user: Basic user profile info (name, avatar, role, online status)
        - notifications: Unread notification count and indicator
        """
        try:
            # Get user with profile
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return {
                    "user": None,
                    "notifications": {"unread_count": 0, "has_unread": False}
                }

            # Extract user display name (priority: display_name > first+last > username)
            display_name = None
            if user.profile:
                if user.profile.display_name:
                    display_name = user.profile.display_name
                elif user.profile.first_name or user.profile.last_name:
                    first = user.profile.first_name or ""
                    last = user.profile.last_name or ""
                    display_name = f"{first} {last}".strip()

            if not display_name:
                display_name = user.username

            # Get avatar URL
            avatar_url = None
            if user.profile and user.profile.profile_picture:
                avatar_url = user.profile.profile_picture

            # Determine online status based on last_active
            # Consider user online if active in last 5 minutes
            is_online = False
            if user.last_active:
                from datetime import datetime, timedelta
                five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
                is_online = user.last_active >= five_minutes_ago

            # Get unread notifications count
            unread_count = await Notification.find(
                Notification.user_id == user.id,
                Notification.is_read == False
            ).count()

            return {
                "user": {
                    "id": str(user.id),
                    "name": display_name,
                    "avatar": avatar_url,
                    "role": user.account_type,  # "crew", "producer", "both"
                    "is_online": is_online,
                    "username": user.username,
                    "email": user.email,
                },
                "notifications": {
                    "unread_count": unread_count,
                    "has_unread": unread_count > 0
                }
            }

        except Exception as e:
            print(f"Error in HeaderService.get_header_data: {e}")
            return {
                "user": None,
                "notifications": {"unread_count": 0, "has_unread": False}
            }
