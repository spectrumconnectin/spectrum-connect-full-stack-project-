"""
Account Service

Handles user account settings and preferences
"""

from typing import Dict, Any, Optional
from beanie import PydanticObjectId
from passlib.context import CryptContext

from app.models.schema import User, UserSettings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AccountService:
    """Service for user account settings"""

    @staticmethod
    async def get_account_settings(user_id: str) -> Dict[str, Any]:
        """
        Get user account settings including profile, notifications, privacy

        Returns:
        - profile: Basic profile info (name, email, avatar)
        - notifications: Notification preferences
        - privacy: Privacy and security settings
        """
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return {
                    "profile": None,
                    "notifications": {},
                    "privacy": {}
                }

            # Profile data
            display_name = None
            if user.profile:
                if user.profile.display_name:
                    display_name = user.profile.display_name
                elif user.profile.first_name or user.profile.last_name:
                    first = user.profile.first_name or ""
                    last = user.profile.last_name or ""
                    display_name = f"{first} {last}".strip()

            profile_data = {
                "id": str(user.id),
                "full_name": display_name or user.username,
                "first_name": user.profile.first_name if user.profile else None,
                "last_name": user.profile.last_name if user.profile else None,
                "email": user.email,
                "username": user.username,
                "avatar": user.profile.profile_picture if user.profile else None,
                "account_type": user.account_type,
            }

            # Notification preferences
            settings = user.settings or UserSettings()
            notification_data = {
                "email_notifications": settings.email_notifications,
                "push_notifications": settings.push_notifications,
                "sms_notifications": settings.sms_notifications,
                "marketing_emails": settings.marketing_emails,
            }

            # Privacy & Security
            privacy_data = {
                "profile_visibility": settings.profile_visibility,
                "two_factor_auth": settings.two_factor_auth,
                "show_location": settings.show_location,
                "show_earnings": settings.show_earnings,
            }

            return {
                "profile": profile_data,
                "notifications": notification_data,
                "privacy": privacy_data,
            }

        except Exception as e:
            print(f"Error in AccountService.get_account_settings: {e}")
            return {
                "profile": None,
                "notifications": {},
                "privacy": {}
            }

    @staticmethod
    async def update_profile(user_id: str, data: Dict[str, Any]) -> bool:
        """
        Update user profile information

        Args:
        - first_name, last_name, display_name, avatar
        """
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return False

            # Initialize profile if it doesn't exist
            if not user.profile:
                from app.models.schema import Profile
                user.profile = Profile()

            # Update profile fields
            if "first_name" in data:
                user.profile.first_name = data["first_name"]
            if "last_name" in data:
                user.profile.last_name = data["last_name"]
            if "display_name" in data:
                user.profile.display_name = data["display_name"]
            if "avatar" in data:
                user.profile.profile_picture = data["avatar"]

            await user.save()
            return True

        except Exception as e:
            print(f"Error in AccountService.update_profile: {e}")
            return False

    @staticmethod
    async def update_email(user_id: str, new_email: str) -> bool:
        """Update user email address"""
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return False

            # Check if email already exists
            existing = await User.find_one(User.email == new_email)
            if existing and str(existing.id) != user_id:
                raise ValueError("Email already in use")

            user.email = new_email
            await user.save()
            return True

        except Exception as e:
            print(f"Error in AccountService.update_email: {e}")
            return False

    @staticmethod
    async def update_password(user_id: str, current_password: str, new_password: str) -> bool:
        """Update user password"""
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return False

            # Verify current password
            if not pwd_context.verify(current_password, user.password_hash):
                raise ValueError("Current password is incorrect")

            # Hash and save new password
            user.password_hash = pwd_context.hash(new_password)
            await user.save()
            return True

        except Exception as e:
            print(f"Error in AccountService.update_password: {e}")
            return False

    @staticmethod
    async def update_notification_settings(user_id: str, settings: Dict[str, bool]) -> bool:
        """Update notification preferences"""
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return False

            # Initialize settings if it doesn't exist
            if not user.settings:
                user.settings = UserSettings()

            # Update notification settings
            if "email_notifications" in settings:
                user.settings.email_notifications = settings["email_notifications"]
            if "push_notifications" in settings:
                user.settings.push_notifications = settings["push_notifications"]
            if "sms_notifications" in settings:
                user.settings.sms_notifications = settings["sms_notifications"]
            if "marketing_emails" in settings:
                user.settings.marketing_emails = settings["marketing_emails"]

            await user.save()
            return True

        except Exception as e:
            print(f"Error in AccountService.update_notification_settings: {e}")
            return False

    @staticmethod
    async def update_privacy_settings(user_id: str, settings: Dict[str, Any]) -> bool:
        """Update privacy and security settings"""
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return False

            # Initialize settings if it doesn't exist
            if not user.settings:
                user.settings = UserSettings()

            # Update privacy settings
            if "profile_visibility" in settings:
                user.settings.profile_visibility = settings["profile_visibility"]
            if "two_factor_auth" in settings:
                user.settings.two_factor_auth = settings["two_factor_auth"]
            if "show_location" in settings:
                user.settings.show_location = settings["show_location"]
            if "show_earnings" in settings:
                user.settings.show_earnings = settings["show_earnings"]

            await user.save()
            return True

        except Exception as e:
            print(f"Error in AccountService.update_privacy_settings: {e}")
            return False

    @staticmethod
    async def deactivate_account(user_id: str) -> bool:
        """Soft delete user account"""
        try:
            from datetime import datetime
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return False

            user.deleted_at = datetime.utcnow()
            await user.save()
            return True

        except Exception as e:
            print(f"Error in AccountService.deactivate_account: {e}")
            return False
