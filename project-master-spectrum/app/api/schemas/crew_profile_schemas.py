"""
Crew Profile Schemas for Professional Crew Member Profiles
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============================================================================
# SKILL SCHEMAS
# ============================================================================

class SkillCreate(BaseModel):
    name: str
    level: str = Field(..., description="beginner, intermediate, expert, master")
    years_of_experience: Optional[int] = None

class SkillRead(BaseModel):
    name: str
    level: str
    years_of_experience: Optional[int] = None
    endorsed: bool = False
    endorsements: Optional[List[str]] = None


# ============================================================================
# EXPERIENCE SCHEMAS
# ============================================================================

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


# ============================================================================
# EDUCATION SCHEMAS
# ============================================================================

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


# ============================================================================
# CERTIFICATION SCHEMAS
# ============================================================================

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
# AVAILABILITY SCHEMAS
# ============================================================================

class AvailabilityCreate(BaseModel):
    hours_per_week: Optional[int] = None
    available_from: Optional[datetime] = None
    working_hours: Optional[dict] = None

class AvailabilityRead(BaseModel):
    hours_per_week: Optional[int] = None
    available_from: Optional[datetime] = None
    working_hours: Optional[dict] = None


# ============================================================================
# PRODUCTION PREFERENCES SCHEMAS
# ============================================================================

class ProductionPreferencesCreate(BaseModel):
    team_size: Optional[str] = Field(None, description="solo, small (2-5), medium (6-10), large (10+)")
    project_duration: Optional[str] = Field(None, description="short (< 1 month), medium (1-3 months), long (3+ months)")
    location_preference: Optional[List[str]] = Field(None, description="on-set, remote, hybrid")
    communication_style: Optional[str] = Field(None, description="frequent, moderate, minimal")
    willing_to_travel: Optional[bool] = None

class ProductionPreferencesRead(BaseModel):
    team_size: Optional[str] = None
    project_duration: Optional[str] = None
    location_preference: Optional[List[str]] = None
    communication_style: Optional[str] = None
    willing_to_travel: Optional[bool] = None


# ============================================================================
# RATING SCHEMAS
# ============================================================================

class RatingRead(BaseModel):
    overall: float = 0
    total_reviews: int = 0
    breakdown: Optional[dict] = None


# ============================================================================
# CREW PROFILE SCHEMAS
# ============================================================================

class CrewProfileCreate(BaseModel):
    """Crew-specific professional settings (NOT duplicate of User.profile)"""
    title: Optional[str] = None
    daily_rate: Optional[float] = None
    weekly_rate: Optional[float] = None
    hourly_rate: Optional[float] = None
    availability: Optional[AvailabilityCreate] = None
    departments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    production_preferences: Optional[ProductionPreferencesCreate] = None

class CrewProfileUpdate(BaseModel):
    """Update crew-specific professional settings"""
    title: Optional[str] = None
    daily_rate: Optional[float] = None
    weekly_rate: Optional[float] = None
    hourly_rate: Optional[float] = None
    availability: Optional[AvailabilityCreate] = None
    departments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    production_preferences: Optional[ProductionPreferencesCreate] = None

class CrewProfileRead(BaseModel):
    """Crew profile read model - crew-specific settings only.
    For skills/experience/education/certifications, use User.profile"""
    id: str
    user_id: str
    title: Optional[str] = None
    daily_rate: Optional[float] = None
    weekly_rate: Optional[float] = None
    hourly_rate: Optional[float] = None
    availability: Optional[AvailabilityRead] = None
    departments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    production_preferences: Optional[ProductionPreferencesRead] = None
    rating: Optional[RatingRead] = None
    portfolio: Optional[dict] = None


# ============================================================================
# PUBLIC CREW PROFILE SCHEMA
# ============================================================================

class PublicCrewProfileRead(BaseModel):
    """Public crew profile - crew-specific settings only.
    For skills/experience/education/certifications, use User.profile"""
    id: str
    user_id: str
    title: Optional[str] = None
    daily_rate: Optional[float] = None
    weekly_rate: Optional[float] = None
    hourly_rate: Optional[float] = None
    availability: Optional[AvailabilityRead] = None
    departments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    production_preferences: Optional[ProductionPreferencesRead] = None
    rating: Optional[RatingRead] = None
    portfolio: Optional[dict] = None
