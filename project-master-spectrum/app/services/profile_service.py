"""
Profile Service Layer - Business Logic for User Profile Management
"""
from typing import Optional
from datetime import datetime
from fastapi import HTTPException, status
from beanie import PydanticObjectId

from app.models.schema import User, Profile, Location, Language, SocialLinks, UserSettings, Skill, Experience, Education, Certification
from app.api.schemas.profile_schemas import (
    ProfileUpdate,
    UserSettingsUpdate,
    UserAccountTypeUpdate,
    SkillCreate,
    ExperienceCreate,
    ExperienceUpdate,
    EducationCreate,
    EducationUpdate,
    CertificationCreate,
    CertificationUpdate
)


class ProfileService:
    """Service class for user profile operations"""

    @staticmethod
    async def get_user_by_id(user_id: str) -> User:
        """Get user by ID"""
        try:
            obj_id = PydanticObjectId(user_id)
            user = await User.get(obj_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            return user
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid user ID or user not found"
            )

    @staticmethod
    async def get_user_by_username(username: str) -> User:
        """Get user by username"""
        user = await User.find_one(User.username == username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user

    @staticmethod
    async def update_profile(user: User, profile_data: ProfileUpdate) -> User:
        """Update user profile information"""

        # Update username if provided
        if profile_data.username:
            # Check if username is already taken
            existing = await User.find_one(User.username == profile_data.username)
            if existing and str(existing.id) != str(user.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
            user.username = profile_data.username

        # Update profile fields
        if profile_data.profile:
            if not user.profile:
                user.profile = Profile()

            profile_dict = profile_data.profile.model_dump(exclude_unset=True)

            # Handle nested objects
            if "location" in profile_dict and profile_dict["location"]:
                user.profile.location = Location(**profile_dict["location"])
                del profile_dict["location"]

            if "languages" in profile_dict and profile_dict["languages"]:
                user.profile.languages = [Language(**lang) for lang in profile_dict["languages"]]
                del profile_dict["languages"]

            if "social_links" in profile_dict and profile_dict["social_links"]:
                user.profile.social_links = SocialLinks(**profile_dict["social_links"])
                del profile_dict["social_links"]

            # Update remaining fields
            for key, value in profile_dict.items():
                if value is not None:
                    setattr(user.profile, key, value)

        # Update last_active timestamp
        user.last_active = datetime.utcnow()

        await user.save()
        return user

    @staticmethod
    async def update_settings(user: User, settings_data: UserSettingsUpdate) -> User:
        """Update user settings"""

        if not user.settings:
            user.settings = UserSettings()

        settings_dict = settings_data.model_dump(exclude_unset=True)

        for key, value in settings_dict.items():
            if value is not None:
                setattr(user.settings, key, value)

        await user.save()
        return user

    @staticmethod
    async def update_account_type(user: User, account_type_data: UserAccountTypeUpdate) -> User:
        """Update user account type"""

        valid_types = ["crew", "producer", "both"]
        if account_type_data.account_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid account type. Must be one of: {', '.join(valid_types)}"
            )

        user.account_type = account_type_data.account_type
        await user.save()
        return user

    @staticmethod
    async def update_profile_picture(user: User, picture_url: str) -> User:
        """Update user profile picture"""

        if not user.profile:
            user.profile = Profile()

        user.profile.profile_picture = picture_url
        await user.save()
        return user

    @staticmethod
    async def update_cover_image(user: User, cover_url: str) -> User:
        """Update user cover image"""

        if not user.profile:
            user.profile = Profile()

        user.profile.cover_image = cover_url
        await user.save()
        return user

    @staticmethod
    async def delete_user_account(user: User) -> bool:
        """Soft delete user account"""

        user.deleted_at = datetime.utcnow()
        await user.save()
        return True

    @staticmethod
    async def get_public_profile(user: User) -> dict:
        """Get public profile data (respecting privacy settings)"""

        public_data = {
            "id": str(user.id),
            "username": user.username,
            "account_type": user.account_type,
            "is_verified": user.is_verified,
            "verification_badge": user.verification_badge,
        }

        # Check privacy settings
        if user.settings and user.settings.profile_visibility == "private":
            # Return minimal info for private profiles
            return {
                "id": str(user.id),
                "username": user.username,
                "profile": {
                    "display_name": user.profile.display_name if user.profile else None
                },
                "is_verified": user.is_verified,
            }

        # Add profile information
        if user.profile:
            profile_data = {
                "first_name": user.profile.first_name,
                "last_name": user.profile.last_name,
                "display_name": user.profile.display_name,
                "profile_picture": user.profile.profile_picture,
                "cover_image": user.profile.cover_image,
                "bio": user.profile.bio,
                "tagline": user.profile.tagline,
                "website": user.profile.website,
                "social_links": user.profile.social_links,
                "languages": user.profile.languages,
            }

            # Handle location privacy
            if user.settings and user.settings.show_location:
                profile_data["location"] = user.profile.location

            public_data["profile"] = profile_data

        # Add stats (respecting privacy)
        if user.stats:
            stats_data = {
                "total_credits": user.stats.total_credits,
                "completed_credits": user.stats.completed_credits,
                "success_rate": user.stats.success_rate,
                "response_time": user.stats.response_time,
                "profile_views": user.stats.profile_views,
                "total_connections": user.stats.total_connections,
            }

            # Show earnings only if user allows
            if user.settings and user.settings.show_earnings:
                stats_data["total_earnings"] = user.stats.total_earnings

            public_data["stats"] = stats_data

        return public_data

    @staticmethod
    async def increment_profile_views(user: User) -> None:
        """Increment profile view count"""

        if not user.stats:
            from app.models.schema import UserStats
            user.stats = UserStats()

        user.stats.profile_views = (user.stats.profile_views or 0) + 1
        await user.save()

    # ============================================================================
    # SKILLS MANAGEMENT
    # ============================================================================

    @staticmethod
    async def add_skill(user: User, skill_data: SkillCreate) -> User:
        if not user.profile:
            user.profile = Profile()
        if not user.profile.skills:
            user.profile.skills = []
        user.profile.skills.append(Skill(**skill_data.model_dump()))
        await user.save()
        return user

    @staticmethod
    async def update_skill(user: User, index: int, skill_data: SkillCreate) -> User:
        if not user.profile or not user.profile.skills or index >= len(user.profile.skills):
            raise HTTPException(status_code=404, detail="Skill not found")
        user.profile.skills[index] = Skill(**skill_data.model_dump())
        await user.save()
        return user

    @staticmethod
    async def delete_skill(user: User, index: int) -> User:
        if not user.profile or not user.profile.skills or index >= len(user.profile.skills):
            raise HTTPException(status_code=404, detail="Skill not found")
        user.profile.skills.pop(index)
        await user.save()
        return user

    # ============================================================================
    # EXPERIENCE MANAGEMENT
    # ============================================================================

    @staticmethod
    async def add_experience(user: User, exp_data: ExperienceCreate) -> User:
        if not user.profile:
            user.profile = Profile()
        if not user.profile.experience:
            user.profile.experience = []
        user.profile.experience.append(Experience(**exp_data.model_dump()))
        await user.save()
        return user

    @staticmethod
    async def update_experience(user: User, index: int, exp_data: ExperienceUpdate) -> User:
        if not user.profile or not user.profile.experience or index >= len(user.profile.experience):
            raise HTTPException(status_code=404, detail="Experience not found")
        exp_dict = exp_data.model_dump(exclude_unset=True)
        for key, value in exp_dict.items():
            setattr(user.profile.experience[index], key, value)
        await user.save()
        return user

    @staticmethod
    async def delete_experience(user: User, index: int) -> User:
        if not user.profile or not user.profile.experience or index >= len(user.profile.experience):
            raise HTTPException(status_code=404, detail="Experience not found")
        user.profile.experience.pop(index)
        await user.save()
        return user

    # ============================================================================
    # EDUCATION MANAGEMENT
    # ============================================================================

    @staticmethod
    async def add_education(user: User, edu_data: EducationCreate) -> User:
        if not user.profile:
            user.profile = Profile()
        if not user.profile.education:
            user.profile.education = []
        user.profile.education.append(Education(**edu_data.model_dump()))
        await user.save()
        return user

    @staticmethod
    async def update_education(user: User, index: int, edu_data: EducationUpdate) -> User:
        if not user.profile or not user.profile.education or index >= len(user.profile.education):
            raise HTTPException(status_code=404, detail="Education not found")
        edu_dict = edu_data.model_dump(exclude_unset=True)
        for key, value in edu_dict.items():
            setattr(user.profile.education[index], key, value)
        await user.save()
        return user

    @staticmethod
    async def delete_education(user: User, index: int) -> User:
        if not user.profile or not user.profile.education or index >= len(user.profile.education):
            raise HTTPException(status_code=404, detail="Education not found")
        user.profile.education.pop(index)
        await user.save()
        return user

    # ============================================================================
    # CERTIFICATION MANAGEMENT
    # ============================================================================

    @staticmethod
    async def add_certification(user: User, cert_data: CertificationCreate) -> User:
        if not user.profile:
            user.profile = Profile()
        if not user.profile.certifications:
            user.profile.certifications = []
        user.profile.certifications.append(Certification(**cert_data.model_dump()))
        await user.save()
        return user

    @staticmethod
    async def update_certification(user: User, index: int, cert_data: CertificationUpdate) -> User:
        if not user.profile or not user.profile.certifications or index >= len(user.profile.certifications):
            raise HTTPException(status_code=404, detail="Certification not found")
        cert_dict = cert_data.model_dump(exclude_unset=True)
        for key, value in cert_dict.items():
            setattr(user.profile.certifications[index], key, value)
        await user.save()
        return user

    @staticmethod
    async def delete_certification(user: User, index: int) -> User:
        if not user.profile or not user.profile.certifications or index >= len(user.profile.certifications):
            raise HTTPException(status_code=404, detail="Certification not found")
        user.profile.certifications.pop(index)
        await user.save()
        return user
