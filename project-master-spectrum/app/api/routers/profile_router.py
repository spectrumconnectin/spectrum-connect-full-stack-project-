"""
Profile Router - User Profile Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Optional

from app.models.schema import User
from app.auth.auth import get_current_user
from app.services.profile_service import ProfileService
from app.api.schemas.profile_schemas import (
    UserProfileRead,
    UserProfileUpdate,
    UserSettingsUpdate,
    UserSettingsRead,
    UserAccountTypeUpdate,
    PublicProfileRead,
    SkillCreate,
    SkillRead,
    ExperienceCreate,
    ExperienceUpdate,
    ExperienceRead,
    EducationCreate,
    EducationUpdate,
    EducationRead,
    CertificationCreate,
    CertificationUpdate,
    CertificationRead,
    # ── NEW ──────────────────────────────
    SpectrumIDResponse,
    TrustSummaryResponse,
    # ─────────────────────────────────────
)


router = APIRouter()


# ============================================================================
# CURRENT USER PROFILE ENDPOINTS
# ============================================================================

@router.get("/me", response_model=UserProfileRead, summary="Get current user profile")
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Get the complete profile of the currently authenticated user.

    Returns:
        - Full user profile including settings, stats, and all personal information
    """
    user_dict = current_user.model_dump()
    user_dict['id'] = str(current_user.id)
    return user_dict


@router.put("/me", response_model=UserProfileRead, summary="Update current user profile")
async def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update the current user's profile information.

    Updates can include:
        - Username
        - Profile details (name, bio, tagline, etc.)
        - Location
        - Languages
        - Social links
        - Website

    Returns:
        - Updated user profile
    """
    updated_user = await ProfileService.update_profile(current_user, profile_data)
    user_dict = updated_user.model_dump()
    user_dict['id'] = str(updated_user.id)
    return user_dict


@router.delete("/me", summary="Delete current user account")
async def delete_my_account(current_user: User = Depends(get_current_user)):
    """
    Soft delete the current user's account.

    Returns:
        - Success message
    """
    await ProfileService.delete_user_account(current_user)
    return {"message": "Account deleted successfully"}


# ============================================================================
# USER SETTINGS ENDPOINTS
# ============================================================================

@router.get("/me/settings", response_model=UserSettingsRead, summary="Get user settings")
async def get_my_settings(current_user: User = Depends(get_current_user)):
    """Get the current user's settings."""
    if not current_user.settings:
        from app.models.schema import UserSettings
        current_user.settings = UserSettings()
    return current_user.settings


@router.put("/me/settings", response_model=UserSettingsRead, summary="Update user settings")
async def update_my_settings(
    settings_data: UserSettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update the current user's settings."""
    updated_user = await ProfileService.update_settings(current_user, settings_data)
    return updated_user.settings


# ============================================================================
# ACCOUNT TYPE ENDPOINT
# ============================================================================

@router.put("/me/account-type", response_model=UserProfileRead, summary="Update account type")
async def update_account_type(
    account_type_data: UserAccountTypeUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update the user's account type.

    Valid account types:
        - crew: Film crew member offering services
        - producer: Producer looking for crew
        - both: Both crew and producer
    """
    updated_user = await ProfileService.update_account_type(current_user, account_type_data)
    user_dict = updated_user.model_dump()
    user_dict['id'] = str(updated_user.id)
    return user_dict


# ============================================================================
# PROFILE MEDIA ENDPOINTS
# ============================================================================

@router.put("/me/profile-picture", summary="Update profile picture")
async def update_profile_picture(
    picture_url: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """Update the user's profile picture."""
    updated_user = await ProfileService.update_profile_picture(current_user, picture_url)
    return {
        "message": "Profile picture updated successfully",
        "profile_picture": updated_user.profile.profile_picture
    }


@router.put("/me/cover-image", summary="Update cover image")
async def update_cover_image(
    cover_url: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """Update the user's cover image."""
    updated_user = await ProfileService.update_cover_image(current_user, cover_url)
    return {
        "message": "Cover image updated successfully",
        "cover_image": updated_user.profile.cover_image
    }


# ============================================================================
# SPECTRUM ID ENDPOINTS  ── NEW
# ============================================================================

@router.get(
    "/me/spectrum-id",
    response_model=SpectrumIDResponse,
    summary="Get my Spectrum ID",
    tags=["Spectrum ID"],
)
async def get_my_spectrum_id(current_user: User = Depends(get_current_user)):
    """
    Returns the full Spectrum ID details for the authenticated user.

    Includes:
    - **tier** — bronze / silver / gold / platinum / diamond
    - **trust_score** — current 0–100 score
    - **trust_score_history** — last 50 score snapshots with factor breakdowns
    - **verification_level** — basic / standard / premium / elite
    - **verification_checks_passed** — list of completed checks
    - **profile_completeness_percentage** — how complete the profile is
    - **badges** — active earned badges (non-expired)
    - **tier_progress_percentage** — how far to the next tier
    - **next_tier** — name of the next tier to unlock
    - **score_breakdown** — last calculation factor breakdown

    **Tier thresholds:**
    | Tier     | Score range |
    |----------|-------------|
    | Bronze   | 0 – 20      |
    | Silver   | 21 – 40     |
    | Gold     | 41 – 60     |
    | Platinum | 61 – 80     |
    | Diamond  | 81 – 100    |
    """
    return await ProfileService.get_spectrum_id(current_user)


@router.get(
    "/{user_id}/trust-summary",
    response_model=TrustSummaryResponse,
    summary="Get public trust summary for a user",
    tags=["Spectrum ID"],
)
async def get_user_trust_summary(user_id: str):
    """
    Returns a lightweight, public-facing trust summary for any user.

    Used by:
    - Job applications — client sees applicant's trust tier before hiring
    - Conversation threads — trust tier badge shown next to username
    - Smart Connect results — trust data shown alongside match score

    Includes:
    - **tier** — current Spectrum ID tier
    - **trust_score** — 0–100 (always public)
    - **verification_level** — basic / standard / premium / elite
    - **is_verified** — email/platform verification status
    - **verification_checks_passed** — list of completed checks
    - **active_badges** — non-expired earned badges
    - **profile_completeness_percentage** — profile fill %

    No auth required — this endpoint is intentionally public so clients and
    collaborators can review trust standing before engaging.
    """
    return await ProfileService.get_trust_summary(user_id)


# ============================================================================
# PUBLIC PROFILE ENDPOINTS (View Other Users)
# ============================================================================

@router.get("/{user_id}", summary="Get user profile by ID")
async def get_user_profile(
    user_id: str,
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Get a user's public profile by their ID.

    Respects privacy settings:
        - Public profiles: Full information
        - Connections only: Full info if connected
        - Private: Minimal information
    """
    user = await ProfileService.get_user_by_id(user_id)

    if current_user and str(current_user.id) != str(user.id):
        await ProfileService.increment_profile_views(user)

    return await ProfileService.get_public_profile(user)


@router.get("/username/{username}", summary="Get user profile by username")
async def get_user_profile_by_username(
    username: str,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get a user's public profile by their username."""
    user = await ProfileService.get_user_by_username(username)

    if current_user and str(current_user.id) != str(user.id):
        await ProfileService.increment_profile_views(user)

    return await ProfileService.get_public_profile(user)


# ============================================================================
# PROFILE STATISTICS ENDPOINT
# ============================================================================

@router.get("/me/stats", summary="Get user statistics")
async def get_my_stats(current_user: User = Depends(get_current_user)):
    """Get detailed statistics for the current user."""
    if not current_user.stats:
        from app.models.schema import UserStats
        current_user.stats = UserStats()
    return current_user.stats


# ============================================================================
# SKILLS ENDPOINTS
# ============================================================================

@router.post("/me/skills", response_model=SkillRead, summary="Add skill to profile")
async def add_skill(skill_data: SkillCreate, current_user: User = Depends(get_current_user)):
    updated_user = await ProfileService.add_skill(current_user, skill_data)
    return updated_user.profile.skills[-1]

@router.put("/me/skills/{index}", response_model=SkillRead, summary="Update skill")
async def update_skill(index: int, skill_data: SkillCreate, current_user: User = Depends(get_current_user)):
    updated_user = await ProfileService.update_skill(current_user, index, skill_data)
    return updated_user.profile.skills[index]

@router.delete("/me/skills/{index}", summary="Delete skill")
async def delete_skill(index: int, current_user: User = Depends(get_current_user)):
    await ProfileService.delete_skill(current_user, index)
    return {"message": "Skill deleted"}


# ============================================================================
# EXPERIENCE ENDPOINTS
# ============================================================================

@router.post("/me/experience", response_model=ExperienceRead, summary="Add work experience")
async def add_experience(exp_data: ExperienceCreate, current_user: User = Depends(get_current_user)):
    updated_user = await ProfileService.add_experience(current_user, exp_data)
    return updated_user.profile.experience[-1]

@router.put("/me/experience/{index}", response_model=ExperienceRead, summary="Update experience")
async def update_experience(index: int, exp_data: ExperienceUpdate, current_user: User = Depends(get_current_user)):
    updated_user = await ProfileService.update_experience(current_user, index, exp_data)
    return updated_user.profile.experience[index]

@router.delete("/me/experience/{index}", summary="Delete experience")
async def delete_experience(index: int, current_user: User = Depends(get_current_user)):
    await ProfileService.delete_experience(current_user, index)
    return {"message": "Experience deleted"}


# ============================================================================
# EDUCATION ENDPOINTS
# ============================================================================

@router.post("/me/education", response_model=EducationRead, summary="Add education")
async def add_education(edu_data: EducationCreate, current_user: User = Depends(get_current_user)):
    updated_user = await ProfileService.add_education(current_user, edu_data)
    return updated_user.profile.education[-1]

@router.put("/me/education/{index}", response_model=EducationRead, summary="Update education")
async def update_education(index: int, edu_data: EducationUpdate, current_user: User = Depends(get_current_user)):
    updated_user = await ProfileService.update_education(current_user, index, edu_data)
    return updated_user.profile.education[index]

@router.delete("/me/education/{index}", summary="Delete education")
async def delete_education(index: int, current_user: User = Depends(get_current_user)):
    await ProfileService.delete_education(current_user, index)
    return {"message": "Education deleted"}


# ============================================================================
# CERTIFICATION ENDPOINTS
# ============================================================================

@router.post("/me/certifications", response_model=CertificationRead, summary="Add certification")
async def add_certification(cert_data: CertificationCreate, current_user: User = Depends(get_current_user)):
    updated_user = await ProfileService.add_certification(current_user, cert_data)
    return updated_user.profile.certifications[-1]

@router.put("/me/certifications/{index}", response_model=CertificationRead, summary="Update certification")
async def update_certification(index: int, cert_data: CertificationUpdate, current_user: User = Depends(get_current_user)):
    updated_user = await ProfileService.update_certification(current_user, index, cert_data)
    return updated_user.profile.certifications[index]

@router.delete("/me/certifications/{index}", summary="Delete certification")
async def delete_certification(index: int, current_user: User = Depends(get_current_user)):
    await ProfileService.delete_certification(current_user, index)
    return {"message": "Certification deleted"}