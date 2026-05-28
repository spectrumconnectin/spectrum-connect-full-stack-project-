"""
Crew Profile Service Layer - Business Logic for Crew Profile Management
"""
from typing import Optional, List
from fastapi import HTTPException, status
from beanie import PydanticObjectId

from app.models.schema import (
    User,
    CrewProfile,
    Availability,
    Skill,
    Experience,
    Education,
    Certification,
    ProductionPreferences,
    Portfolio,
)
from app.api.schemas.crew_profile_schemas import (
    CrewProfileCreate,
    CrewProfileUpdate,
    ExperienceCreate,
    ExperienceUpdate,
    EducationCreate,
    EducationUpdate,
    CertificationCreate,
    CertificationUpdate,
)


class CrewProfileService:
    """Service class for crew profile operations"""

    @staticmethod
    async def get_crew_profile_by_user_id(user_id: PydanticObjectId) -> Optional[CrewProfile]:
        """Get crew profile by user ID"""
        crew_profile = await CrewProfile.find_one(CrewProfile.user_id == user_id)
        return crew_profile

    @staticmethod
    async def get_crew_profile_by_id(profile_id: str) -> CrewProfile:
        """Get crew profile by profile ID"""
        try:
            obj_id = PydanticObjectId(profile_id)
            crew_profile = await CrewProfile.get(obj_id)
            if not crew_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Crew profile not found"
                )
            return crew_profile
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid profile ID or crew profile not found"
            )

    @staticmethod
    async def create_crew_profile(user: User, profile_data: CrewProfileCreate) -> CrewProfile:
        """Create a new crew profile for a user"""

        # Check if user already has a crew profile
        existing = await CrewProfile.find_one(CrewProfile.user_id == user.id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Crew profile already exists for this user"
            )

        # Check if user account type allows crew profile
        if user.account_type not in ["crew", "both"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account type must be 'crew' or 'both' to create a crew profile"
            )

        # Create crew profile
        crew_profile_data = profile_data.model_dump(exclude_unset=True)

        # Handle nested objects
        if "availability" in crew_profile_data and crew_profile_data["availability"]:
            crew_profile_data["availability"] = Availability(**crew_profile_data["availability"])

        if "skills" in crew_profile_data and crew_profile_data["skills"]:
            crew_profile_data["skills"] = [Skill(**skill) for skill in crew_profile_data["skills"]]

        if "production_preferences" in crew_profile_data and crew_profile_data["production_preferences"]:
            crew_profile_data["production_preferences"] = ProductionPreferences(
                **crew_profile_data["production_preferences"]
            )

        crew_profile = CrewProfile(
            user_id=user.id,
            **crew_profile_data
        )

        await crew_profile.insert()
        return crew_profile

    @staticmethod
    async def update_crew_profile(crew_profile: CrewProfile, profile_data: CrewProfileUpdate) -> CrewProfile:
        """Update crew profile"""

        profile_dict = profile_data.model_dump(exclude_unset=True)

        # Handle nested objects
        if "availability" in profile_dict and profile_dict["availability"]:
            crew_profile.availability = Availability(**profile_dict["availability"])
            del profile_dict["availability"]

        if "skills" in profile_dict and profile_dict["skills"]:
            crew_profile.skills = [Skill(**skill) for skill in profile_dict["skills"]]
            del profile_dict["skills"]

        if "production_preferences" in profile_dict and profile_dict["production_preferences"]:
            crew_profile.production_preferences = ProductionPreferences(
                **profile_dict["production_preferences"]
            )
            del profile_dict["production_preferences"]

        # Update remaining fields
        for key, value in profile_dict.items():
            if value is not None:
                setattr(crew_profile, key, value)

        await crew_profile.save()
        return crew_profile

    @staticmethod
    async def delete_crew_profile(crew_profile: CrewProfile) -> bool:
        """Delete crew profile"""
        await crew_profile.delete()
        return True

    # ============================================================================
    # EXPERIENCE MANAGEMENT
    # ============================================================================

    @staticmethod
    async def add_experience(crew_profile: CrewProfile, experience_data: ExperienceCreate) -> CrewProfile:
        """Add experience to crew profile"""

        if not crew_profile.experience:
            crew_profile.experience = []

        new_experience = Experience(**experience_data.model_dump())
        crew_profile.experience.append(new_experience)

        await crew_profile.save()
        return crew_profile

    @staticmethod
    async def update_experience(
        crew_profile: CrewProfile,
        experience_index: int,
        experience_data: ExperienceUpdate
    ) -> CrewProfile:
        """Update a specific experience entry"""

        if not crew_profile.experience or experience_index >= len(crew_profile.experience):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Experience entry not found"
            )

        experience_dict = experience_data.model_dump(exclude_unset=True)

        for key, value in experience_dict.items():
            if value is not None:
                setattr(crew_profile.experience[experience_index], key, value)

        await crew_profile.save()
        return crew_profile

    @staticmethod
    async def delete_experience(crew_profile: CrewProfile, experience_index: int) -> CrewProfile:
        """Delete a specific experience entry"""

        if not crew_profile.experience or experience_index >= len(crew_profile.experience):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Experience entry not found"
            )

        crew_profile.experience.pop(experience_index)
        await crew_profile.save()
        return crew_profile

    # ============================================================================
    # EDUCATION MANAGEMENT
    # ============================================================================

    @staticmethod
    async def add_education(crew_profile: CrewProfile, education_data: EducationCreate) -> CrewProfile:
        """Add education to crew profile"""

        if not crew_profile.education:
            crew_profile.education = []

        new_education = Education(**education_data.model_dump())
        crew_profile.education.append(new_education)

        await crew_profile.save()
        return crew_profile

    @staticmethod
    async def update_education(
        crew_profile: CrewProfile,
        education_index: int,
        education_data: EducationUpdate
    ) -> CrewProfile:
        """Update a specific education entry"""

        if not crew_profile.education or education_index >= len(crew_profile.education):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Education entry not found"
            )

        education_dict = education_data.model_dump(exclude_unset=True)

        for key, value in education_dict.items():
            if value is not None:
                setattr(crew_profile.education[education_index], key, value)

        await crew_profile.save()
        return crew_profile

    @staticmethod
    async def delete_education(crew_profile: CrewProfile, education_index: int) -> CrewProfile:
        """Delete a specific education entry"""

        if not crew_profile.education or education_index >= len(crew_profile.education):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Education entry not found"
            )

        crew_profile.education.pop(education_index)
        await crew_profile.save()
        return crew_profile

    # ============================================================================
    # CERTIFICATION MANAGEMENT
    # ============================================================================

    @staticmethod
    async def add_certification(crew_profile: CrewProfile, certification_data: CertificationCreate) -> CrewProfile:
        """Add certification to crew profile"""

        if not crew_profile.certifications:
            crew_profile.certifications = []

        new_certification = Certification(**certification_data.model_dump())
        crew_profile.certifications.append(new_certification)

        await crew_profile.save()
        return crew_profile

    @staticmethod
    async def update_certification(
        crew_profile: CrewProfile,
        certification_index: int,
        certification_data: CertificationUpdate
    ) -> CrewProfile:
        """Update a specific certification entry"""

        if not crew_profile.certifications or certification_index >= len(crew_profile.certifications):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Certification entry not found"
            )

        certification_dict = certification_data.model_dump(exclude_unset=True)

        for key, value in certification_dict.items():
            if value is not None:
                setattr(crew_profile.certifications[certification_index], key, value)

        await crew_profile.save()
        return crew_profile

    @staticmethod
    async def delete_certification(crew_profile: CrewProfile, certification_index: int) -> CrewProfile:
        """Delete a specific certification entry"""

        if not crew_profile.certifications or certification_index >= len(crew_profile.certifications):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Certification entry not found"
            )

        crew_profile.certifications.pop(certification_index)
        await crew_profile.save()
        return crew_profile

    # ============================================================================
    # SKILLS MANAGEMENT
    # ============================================================================

    @staticmethod
    async def endorse_skill(crew_profile: CrewProfile, skill_name: str, endorser_id: PydanticObjectId) -> CrewProfile:
        """Endorse a skill on crew profile"""

        if not crew_profile.skills:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No skills found on this profile"
            )

        skill_found = False
        for skill in crew_profile.skills:
            if skill.name.lower() == skill_name.lower():
                skill_found = True
                if not skill.endorsements:
                    skill.endorsements = []

                if endorser_id not in skill.endorsements:
                    skill.endorsements.append(endorser_id)
                    skill.endorsed = True
                break

        if not skill_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Skill '{skill_name}' not found on this profile"
            )

        await crew_profile.save()
        return crew_profile
