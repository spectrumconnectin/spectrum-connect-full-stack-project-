"""
Crew Profile Router - Crew Member Professional Profile Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Path, Body
from typing import Optional

from app.models.schema import User
from app.auth.auth import get_current_user
from app.services.crew_profile_service import CrewProfileService
from app.api.schemas.crew_profile_schemas import (
    CrewProfileCreate,
    CrewProfileUpdate,
    CrewProfileRead,
    PublicCrewProfileRead,
    ExperienceCreate,
    ExperienceUpdate,
    EducationCreate,
    EducationUpdate,
    CertificationCreate,
    CertificationUpdate,
)


router = APIRouter()


# Helper functions to convert Beanie models to dict
def crew_profile_to_dict(crew_profile):
    """Convert CrewProfile Beanie model to dict for Pydantic response"""
    profile_dict = crew_profile.model_dump()
    profile_dict['id'] = str(crew_profile.id)
    profile_dict['user_id'] = str(crew_profile.user_id)
    return profile_dict


def public_crew_profile_to_dict(crew_profile):
    """Convert CrewProfile Beanie model to dict for PublicCrewProfileRead response"""
    profile_dict = crew_profile.model_dump()
    profile_dict['id'] = str(crew_profile.id)
    profile_dict['user_id'] = str(crew_profile.user_id)
    return profile_dict


# ============================================================================
# CREW PROFILE CRUD ENDPOINTS
# ============================================================================

@router.post("/", response_model=CrewProfileRead, status_code=status.HTTP_201_CREATED, summary="Create crew profile")
async def create_crew_profile(
    profile_data: CrewProfileCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new crew profile for the current user.

    Requirements:
        - User account type must be 'crew' or 'both'
        - User must not already have a crew profile

    Includes:
        - Title (e.g., "Cinematographer", "Sound Designer")
        - Rates (daily, weekly, hourly)
        - Availability
        - Skills and expertise levels
        - Departments and specializations
        - Production preferences

    Returns:
        - Created crew profile
    """
    crew_profile = await CrewProfileService.create_crew_profile(current_user, profile_data)
    return crew_profile_to_dict(crew_profile)


@router.get("/me", response_model=CrewProfileRead, summary="Get my crew profile")
async def get_my_crew_profile(current_user: User = Depends(get_current_user)):
    """
    Get the current user's crew profile.

    Returns:
        - Complete crew profile with all details

    Raises:
        - 404 if crew profile doesn't exist
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found. Please create one first."
        )

    return crew_profile_to_dict(crew_profile)


@router.put("/me", response_model=CrewProfileRead, summary="Update my crew profile")
async def update_my_crew_profile(
    profile_data: CrewProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update the current user's crew profile.

    Allows updating:
        - Title and rates
        - Availability and working hours
        - Skills and skill levels
        - Departments and specializations
        - Production preferences

    Returns:
        - Updated crew profile
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found. Please create one first."
        )

    updated_profile = await CrewProfileService.update_crew_profile(crew_profile, profile_data)

    return crew_profile_to_dict(updated_profile)


@router.delete("/me", summary="Delete my crew profile")
async def delete_my_crew_profile(current_user: User = Depends(get_current_user)):
    """
    Delete the current user's crew profile.

    This is a permanent action.

    Returns:
        - Success message
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    await CrewProfileService.delete_crew_profile(crew_profile)
    return {"message": "Crew profile deleted successfully"}


# ============================================================================
# EXPERIENCE MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/me/experience", response_model=CrewProfileRead, summary="Add experience")
async def add_experience(
    experience_data: ExperienceCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Add a work experience entry to the crew profile.

    Includes:
        - Job title and project name
        - Company/production name
        - Start and end dates
        - Description and achievements
        - Location

    Returns:
        - Updated crew profile
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    updated_profile = await CrewProfileService.add_experience(crew_profile, experience_data)

    return crew_profile_to_dict(updated_profile)


@router.put("/me/experience/{index}", response_model=CrewProfileRead, summary="Update experience")
async def update_experience(
    index: int = Path(..., ge=0, description="Index of the experience entry to update"),
    experience_data: ExperienceUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Update a specific experience entry by index.

    Args:
        - index: The index of the experience entry (0-based)
        - experience_data: Updated experience information

    Returns:
        - Updated crew profile
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    updated_profile = await CrewProfileService.update_experience(crew_profile, index, experience_data)

    return crew_profile_to_dict(updated_profile)


@router.delete("/me/experience/{index}", summary="Delete experience")
async def delete_experience(
    index: int = Path(..., ge=0, description="Index of the experience entry to delete"),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific experience entry by index.

    Args:
        - index: The index of the experience entry to delete (0-based)

    Returns:
        - Success message
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    await CrewProfileService.delete_experience(crew_profile, index)
    return {"message": "Experience entry deleted successfully"}


# ============================================================================
# EDUCATION MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/me/education", response_model=CrewProfileRead, summary="Add education")
async def add_education(
    education_data: EducationCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Add an education entry to the crew profile.

    Includes:
        - Degree and field of study
        - Institution name
        - Start and end dates
        - Description

    Returns:
        - Updated crew profile
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    updated_profile = await CrewProfileService.add_education(crew_profile, education_data)

    return crew_profile_to_dict(updated_profile)


@router.put("/me/education/{index}", response_model=CrewProfileRead, summary="Update education")
async def update_education(
    index: int = Path(..., ge=0, description="Index of the education entry to update"),
    education_data: EducationUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Update a specific education entry by index.

    Args:
        - index: The index of the education entry (0-based)
        - education_data: Updated education information

    Returns:
        - Updated crew profile
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    updated_profile = await CrewProfileService.update_education(crew_profile, index, education_data)

    return crew_profile_to_dict(updated_profile)


@router.delete("/me/education/{index}", summary="Delete education")
async def delete_education(
    index: int = Path(..., ge=0, description="Index of the education entry to delete"),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific education entry by index.

    Args:
        - index: The index of the education entry to delete (0-based)

    Returns:
        - Success message
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    await CrewProfileService.delete_education(crew_profile, index)
    return {"message": "Education entry deleted successfully"}


# ============================================================================
# CERTIFICATION MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/me/certifications", response_model=CrewProfileRead, summary="Add certification")
async def add_certification(
    certification_data: CertificationCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Add a certification to the crew profile.

    Includes:
        - Certification name
        - Issuing organization
        - Issue and expiry dates
        - Credential ID and URL

    Returns:
        - Updated crew profile
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    updated_profile = await CrewProfileService.add_certification(crew_profile, certification_data)

    return crew_profile_to_dict(updated_profile)


@router.put("/me/certifications/{index}", response_model=CrewProfileRead, summary="Update certification")
async def update_certification(
    index: int = Path(..., ge=0, description="Index of the certification entry to update"),
    certification_data: CertificationUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Update a specific certification entry by index.

    Args:
        - index: The index of the certification entry (0-based)
        - certification_data: Updated certification information

    Returns:
        - Updated crew profile
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    updated_profile = await CrewProfileService.update_certification(crew_profile, index, certification_data)

    return crew_profile_to_dict(updated_profile)


@router.delete("/me/certifications/{index}", summary="Delete certification")
async def delete_certification(
    index: int = Path(..., ge=0, description="Index of the certification entry to delete"),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific certification entry by index.

    Args:
        - index: The index of the certification entry to delete (0-based)

    Returns:
        - Success message
    """
    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(current_user.id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    await CrewProfileService.delete_certification(crew_profile, index)
    return {"message": "Certification entry deleted successfully"}


# ============================================================================
# SKILL ENDORSEMENT ENDPOINT
# ============================================================================

@router.post("/{user_id}/endorse/{skill_name}", summary="Endorse a skill")
async def endorse_skill(
    user_id: str,
    skill_name: str,
    current_user: User = Depends(get_current_user)
):
    """
    Endorse a specific skill on another user's crew profile.

    Args:
        - user_id: The user ID whose skill to endorse
        - skill_name: The name of the skill to endorse

    Returns:
        - Success message

    Note: Cannot endorse your own skills
    """
    from beanie import PydanticObjectId

    # Prevent self-endorsement
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot endorse your own skills"
        )

    # Get the crew profile
    try:
        target_user_id = PydanticObjectId(user_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )

    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(target_user_id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    await CrewProfileService.endorse_skill(crew_profile, skill_name, current_user.id)

    return {"message": f"Successfully endorsed skill: {skill_name}"}


# ============================================================================
# PUBLIC CREW PROFILE ENDPOINT
# ============================================================================

@router.get("/user/{user_id}", summary="Get crew profile by user ID")
async def get_crew_profile_by_user(user_id: str):
    """
    Get a user's crew profile by their user ID.

    This returns the public view of the crew profile.

    Args:
        - user_id: The user's ID

    Returns:
        - Crew profile data
    """
    from beanie import PydanticObjectId

    try:
        target_user_id = PydanticObjectId(user_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )

    crew_profile = await CrewProfileService.get_crew_profile_by_user_id(target_user_id)

    if not crew_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crew profile not found"
        )

    return public_crew_profile_to_dict(crew_profile)
