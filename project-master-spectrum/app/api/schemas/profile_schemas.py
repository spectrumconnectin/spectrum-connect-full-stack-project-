"""
Profile Schemas for User Profile Management
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime


# ============================================================================
# LOCATION & LANGUAGE SCHEMAS
# ============================================================================

class LocationCreate(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    timezone: Optional[str] = None

class LocationRead(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    timezone: Optional[str] = None
    coordinates: Optional[dict] = None

class LanguageCreate(BaseModel):
    language: str
    proficiency: str = Field(..., description="native, fluent, conversational, basic")

class LanguageRead(BaseModel):
    language: str
    proficiency: str


# ============================================================================
# SOCIAL LINKS SCHEMAS
# ============================================================================

class SocialLinksCreate(BaseModel):
    linkedin: Optional[str] = None
    imdb: Optional[str] = None
    vimeo: Optional[str] = None
    portfolio: Optional[str] = None

class SocialLinksRead(BaseModel):
    linkedin: Optional[str] = None
    imdb: Optional[str] = None
    vimeo: Optional[str] = None
    portfolio: Optional[str] = None


# ============================================================================
# PROFESSIONAL INFO SCHEMAS (Fiverr-style)
# ============================================================================

class SkillCreate(BaseModel):
    name: str
    level: Optional[str] = Field(None, description="beginner, intermediate, expert, master")
    years_of_experience: Optional[int] = None

class SkillRead(BaseModel):
    name: str
    level: Optional[str] = None
    years_of_experience: Optional[int] = None

class ExperienceCreate(BaseModel):
    title: str
    project_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    current: bool = False
    description: Optional[str] = None
    achievements: Optional[List[str]] = None

class ExperienceUpdate(BaseModel):
    title: Optional[str] = None
    project_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    current: Optional[bool] = None
    description: Optional[str] = None
    achievements: Optional[List[str]] = None

class ExperienceRead(BaseModel):
    title: str
    project_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    current: bool = False
    description: Optional[str] = None
    achievements: Optional[List[str]] = None

class EducationCreate(BaseModel):
    degree: str
    institution: str
    field_of_study: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    description: Optional[str] = None

class EducationUpdate(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = None

class EducationRead(BaseModel):
    degree: str
    institution: str
    field_of_study: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    description: Optional[str] = None

class CertificationCreate(BaseModel):
    name: str
    issuing_organization: str
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None

class CertificationUpdate(BaseModel):
    name: Optional[str] = None
    issuing_organization: Optional[str] = None
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None

class CertificationRead(BaseModel):
    name: str
    issuing_organization: str
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None


# ============================================================================
# PROFILE SCHEMAS
# ============================================================================

class ProfileCreate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    tagline: Optional[str] = Field(None, max_length=100)
    location: Optional[LocationCreate] = None
    languages: Optional[List[LanguageCreate]] = None
    website: Optional[str] = None
    social_links: Optional[SocialLinksCreate] = None

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    tagline: Optional[str] = Field(None, max_length=100)
    headline: Optional[str] = Field(None, max_length=150)
    location: Optional[LocationCreate] = None
    languages: Optional[List[LanguageCreate]] = None
    website: Optional[str] = None
    social_links: Optional[SocialLinksCreate] = None
    hourly_rate_min: Optional[float] = None
    hourly_rate_max: Optional[float] = None

class ProfileRead(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    bio: Optional[str] = None
    tagline: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[LocationRead] = None
    languages: Optional[List[LanguageRead]] = None
    website: Optional[str] = None
    social_links: Optional[SocialLinksRead] = None
    hourly_rate_min: Optional[float] = None
    hourly_rate_max: Optional[float] = None
    # Professional info (Fiverr-style)
    intro_video: Optional[str] = None
    skills: Optional[List[SkillRead]] = None
    experience: Optional[List[ExperienceRead]] = None
    education: Optional[List[EducationRead]] = None
    certifications: Optional[List[CertificationRead]] = None


# ============================================================================
# USER SETTINGS SCHEMAS
# ============================================================================

class UserSettingsUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    marketing_emails: Optional[bool] = None
    profile_visibility: Optional[str] = Field(None, description="public, connections, private")
    availability_status: Optional[str] = Field(None, description="available, busy, not_available")
    show_location: Optional[bool] = None
    show_earnings: Optional[bool] = None
    two_factor_auth: Optional[bool] = None

class UserSettingsRead(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    sms_notifications: bool = False
    marketing_emails: bool = False
    profile_visibility: str = "public"
    availability_status: str = "available"
    show_location: bool = True
    show_earnings: bool = False
    two_factor_auth: bool = False


# ============================================================================
# USER STATS SCHEMAS
# ============================================================================

class UserStatsRead(BaseModel):
    total_earnings: float = 0
    total_spent: float = 0
    total_credits: int = 0
    completed_credits: int = 0
    active_projects: int = 0
    success_rate: float = 0
    response_time: int = 0
    profile_views: int = 0
    total_connections: int = 0


# ============================================================================
# COMPLETE USER PROFILE SCHEMAS
# ============================================================================

class UserProfileRead(BaseModel):
    id: str
    email: str
    username: str
    account_type: str
    user_role: str = "user"
    profile: Optional[ProfileRead] = None
    stats: Optional[UserStatsRead] = None
    settings: Optional[UserSettingsRead] = None
    is_verified: bool = False
    verification_badge: Optional[dict] = None
    last_active: Optional[datetime] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    profile: Optional[ProfileUpdate] = None

class UserAccountTypeUpdate(BaseModel):
    account_type: str = Field(..., description="crew, producer, both")


# ============================================================================
# PUBLIC PROFILE SCHEMAS (for viewing other users)
# ============================================================================

class PublicProfileRead(BaseModel):
    id: str
    username: str
    account_type: str
    profile: Optional[ProfileRead] = None
    stats: Optional[UserStatsRead] = None
    is_verified: bool = False
    verification_badge: Optional[dict] = None


# ============================================================================
# SPECTRUM ID SCHEMAS  ── NEW
# ============================================================================

class TrustScoreEntryRead(BaseModel):
    """Single historical trust score snapshot."""
    score: float
    calculated_at: datetime
    factors: Optional[dict] = None


class SpectrumBadgeRead(BaseModel):
    """A single badge earned by the user."""
    badge_type: str
    earned_at: datetime
    expires_at: Optional[datetime] = None


class SpectrumIDResponse(BaseModel):
    """
    Full Spectrum ID details returned to the authenticated user.
    Served by GET /profiles/me/spectrum-id
    """
    # Identity tier
    tier: str                                        # bronze | silver | gold | platinum | diamond
    tier_updated_at: Optional[datetime] = None

    # Trust scoring
    trust_score: float                               # 0–100
    trust_score_history: List[TrustScoreEntryRead] = []

    # Verification
    verification_level: str                          # basic | standard | premium | elite
    verification_checks_passed: List[str] = []

    # Profile completeness
    profile_completeness_percentage: float = 0.0

    # Recalculation metadata
    last_trust_recalculation: Optional[datetime] = None

    # Badges
    badges: List[SpectrumBadgeRead] = []

    # Derived display helpers (computed by service, not stored)
    tier_progress_percentage: float = 0.0            # how far to next tier (0–100)
    next_tier: Optional[str] = None                  # e.g. "silver" if currently bronze
    score_breakdown: Optional[dict] = None           # last calculation factor breakdown


class TrustSummaryResponse(BaseModel):
    """
    Public-facing trust summary shown to other users
    (e.g. next to a name in a conversation or job application).
    Served by GET /profiles/{user_id}/trust-summary

    Intentionally minimal — only what a client or collaborator needs to see.
    """
    user_id: str
    username: str
    tier: str                                        # bronze | silver | gold | platinum | diamond
    trust_score: float                               # 0–100
    verification_level: str                          # basic | standard | premium | elite
    is_verified: bool
    verification_checks_passed: List[str] = []
    active_badges: List[SpectrumBadgeRead] = []      # only non-expired badges
    profile_completeness_percentage: float = 0.0