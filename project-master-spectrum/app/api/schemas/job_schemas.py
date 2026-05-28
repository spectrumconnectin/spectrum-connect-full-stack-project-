"""
Job Post Schemas for Upwork-style Job Marketplace
Film Industry specific job postings
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


# ============================================================================
# BUDGET & RATE SCHEMAS
# ============================================================================

class BudgetCreate(BaseModel):
    min: Optional[float] = Field(None, ge=0, description="Minimum budget")
    max: Optional[float] = Field(None, ge=0, description="Maximum budget")
    currency: str = Field("USD", description="Currency code")

    @validator('max')
    def max_greater_than_min(cls, v, values):
        if v is not None and 'min' in values and values['min'] is not None:
            if v < values['min']:
                raise ValueError('max must be greater than or equal to min')
        return v


class RateCreate(BaseModel):
    min: Optional[float] = Field(None, ge=0)
    max: Optional[float] = Field(None, ge=0)

    @validator('max')
    def max_greater_than_min(cls, v, values):
        if v is not None and 'min' in values and values['min'] is not None:
            if v < values['min']:
                raise ValueError('max must be greater than or equal to min')
        return v


# ============================================================================
# CREW CALL SCHEMAS
# ============================================================================

class CrewCallCreate(BaseModel):
    role: str = Field(..., description="Role needed (e.g., Cinematographer, Gaffer)")
    skills: Optional[List[str]] = Field(None, description="Required skills")
    count: int = Field(1, ge=1, le=100, description="Number of crew members needed")
    description: Optional[str] = Field(None, max_length=500)


class CrewCallRead(BaseModel):
    role: str
    skills: Optional[List[str]] = None
    count: int
    description: Optional[str] = None


# ============================================================================
# ATTACHMENT SCHEMAS
# ============================================================================

class AttachmentCreate(BaseModel):
    file_name: str
    file_url: str
    file_size: Optional[int] = None


class AttachmentRead(BaseModel):
    file_name: str
    file_url: str
    file_size: Optional[int] = None
    uploaded_at: datetime


# ============================================================================
# PROPOSAL SETTINGS SCHEMAS
# ============================================================================

class ProposalSettingsCreate(BaseModel):
    allow_proposals: bool = True
    max_proposals: Optional[int] = Field(None, ge=1, le=1000)
    proposal_deadline: Optional[datetime] = None
    auto_reject_after_deadline: bool = False


class ProposalSettingsRead(BaseModel):
    allow_proposals: bool
    max_proposals: Optional[int] = None
    proposal_deadline: Optional[datetime] = None
    auto_reject_after_deadline: bool


# ============================================================================
# SCREENING QUESTION SCHEMAS
# ============================================================================

class ScreeningQuestionCreate(BaseModel):
    question: str = Field(..., min_length=10, max_length=500)
    type: str = Field(..., description="text or multiple_choice")
    required: bool = True
    options: Optional[List[str]] = Field(None, description="Options for multiple_choice type")

    @validator('type')
    def validate_type(cls, v):
        if v not in ['text', 'multiple_choice']:
            raise ValueError('type must be either "text" or "multiple_choice"')
        return v

    @validator('options')
    def validate_options(cls, v, values):
        if 'type' in values and values['type'] == 'multiple_choice':
            if not v or len(v) < 2:
                raise ValueError('multiple_choice must have at least 2 options')
        return v


class ScreeningQuestionRead(BaseModel):
    question: str
    type: str
    required: bool
    options: Optional[List[str]] = None


# ============================================================================
# MAIN JOB POST SCHEMAS
# ============================================================================

class JobPostCreate(BaseModel):
    """Create a new job post"""
    title: str = Field(..., min_length=10, max_length=100, description="Job title")
    description: str = Field(..., min_length=50, max_length=10000, description="Detailed job description")
    department: str = Field(..., description="Film department (Camera, Sound, Lighting, etc.)")
    role: Optional[str] = Field(None, description="Specific role (Cinematographer, Gaffer, etc.)")
    tags: List[str] = Field(..., min_items=1, max_items=20, description="Job tags for search")

    # Project scope
    crew_size: str = Field(..., description="individual, small_crew, or full_crew")
    complexity: str = Field(..., description="simple, intermediate, or complex")

    # Budget & Rates
    budget_type: str = Field(..., description="fixed, hourly, daily, or weekly")
    budget: Optional[BudgetCreate] = Field(None, description="For fixed budget")
    hourly_rate: Optional[RateCreate] = Field(None, description="For hourly budget")
    daily_rate: Optional[RateCreate] = Field(None, description="For daily budget")
    weekly_rate: Optional[RateCreate] = Field(None, description="For weekly budget")

    # Timeline
    duration: Optional[str] = Field(None, description="Project duration description")
    estimated_duration: Optional[int] = Field(None, ge=1, le=365, description="Estimated days")
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None

    # Requirements
    skills: List[str] = Field(..., min_items=1, max_items=30, description="Required skills")
    experience_level: str = Field(..., description="student, entry, intermediate, or expert")

    # Crew calls
    crew_call: Optional[List[CrewCallCreate]] = Field(None, max_items=20)

    # Visibility
    visibility: str = Field("public", description="public, private, or invited_only")
    invited_crew: Optional[List[str]] = Field(None, description="User IDs to invite")

    # Proposal settings
    proposal_settings: Optional[ProposalSettingsCreate] = None
    questions: Optional[List[ScreeningQuestionCreate]] = Field(None, max_items=10)
    status: Optional[str] = Field("draft", description="draft or open")

    @validator('department')
    def validate_department(cls, v):
        allowed = [
            'Camera', 'Sound', 'Lighting', 'Grip', 'Electric',
            'Art Department', 'Costume', 'Makeup & Hair', 'VFX',
            'Post-Production', 'Editing', 'Color Grading', 'Sound Design',
            'Music Composition', 'Production Management', 'Directing',
            'Producing', 'Cinematography', 'Scripting', 'Storyboarding',
            'Animation', '3D Modeling', 'Motion Graphics', 'Other'
        ]
        if v not in allowed:
            raise ValueError(f'Department must be one of: {", ".join(allowed)}')
        return v

    @validator('crew_size')
    def validate_crew_size(cls, v):
        if v not in ['individual', 'small_crew', 'full_crew']:
            raise ValueError('crew_size must be: individual, small_crew, or full_crew')
        return v

    @validator('complexity')
    def validate_complexity(cls, v):
        if v not in ['simple', 'intermediate', 'complex']:
            raise ValueError('complexity must be: simple, intermediate, or complex')
        return v

    @validator('budget_type')
    def validate_budget_type(cls, v):
        if v not in ['fixed', 'hourly', 'daily', 'weekly']:
            raise ValueError('budget_type must be: fixed, hourly, daily, or weekly')
        return v

    @validator('experience_level')
    def validate_experience_level(cls, v):
        if v not in ['student', 'entry', 'intermediate', 'expert']:
            raise ValueError('experience_level must be: student, entry, intermediate, or expert')
        return v

    @validator('visibility')
    def validate_visibility(cls, v):
        if v not in ['public', 'private', 'invited_only']:
            raise ValueError('visibility must be: public, private, or invited_only')
        return v

    @validator('status')
    def validate_status(cls, v):
        if v and v not in ['draft', 'open']:
            raise ValueError('status must be: draft or open')
        return v


class JobPostUpdate(BaseModel):
    """Update an existing job post"""
    title: Optional[str] = Field(None, min_length=10, max_length=100)
    description: Optional[str] = Field(None, min_length=50, max_length=10000)
    department: Optional[str] = None
    role: Optional[str] = None
    tags: Optional[List[str]] = Field(None, min_items=1, max_items=20)

    crew_size: Optional[str] = None
    complexity: Optional[str] = None

    budget_type: Optional[str] = None
    budget: Optional[BudgetCreate] = None
    hourly_rate: Optional[RateCreate] = None
    daily_rate: Optional[RateCreate] = None
    weekly_rate: Optional[RateCreate] = None

    duration: Optional[str] = None
    estimated_duration: Optional[int] = Field(None, ge=1, le=365)
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None

    skills: Optional[List[str]] = Field(None, min_items=1, max_items=30)
    experience_level: Optional[str] = None

    crew_call: Optional[List[CrewCallCreate]] = Field(None, max_items=20)

    visibility: Optional[str] = None
    invited_crew: Optional[List[str]] = None

    proposal_settings: Optional[ProposalSettingsCreate] = None
    questions: Optional[List[ScreeningQuestionCreate]] = Field(None, max_items=10)


class JobPostStatusUpdate(BaseModel):
    """Update job post status"""
    status: str = Field(..., description="draft, open, in_progress, completed, cancelled, closed")

    @validator('status')
    def validate_status(cls, v):
        allowed = ['draft', 'open', 'in_progress', 'completed', 'cancelled', 'closed']
        if v not in allowed:
            raise ValueError(f'Status must be one of: {", ".join(allowed)}')
        return v


class JobPostRead(BaseModel):
    """Complete job post details"""
    id: str
    client_id: str
    title: str
    description: str
    department: str
    role: Optional[str] = None
    tags: List[str]

    crew_size: str
    complexity: str

    budget_type: str
    budget: Optional[dict] = None
    hourly_rate: Optional[dict] = None
    daily_rate: Optional[dict] = None
    weekly_rate: Optional[dict] = None

    duration: Optional[str] = None
    estimated_duration: Optional[int] = None
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None

    skills: List[str]
    experience_level: str

    crew_call: Optional[List[CrewCallRead]] = None
    attachments: Optional[List[AttachmentRead]] = None

    visibility: str
    invited_crew: Optional[List[str]] = None

    proposal_settings: Optional[ProposalSettingsRead] = None
    questions: Optional[List[ScreeningQuestionRead]] = None

    status: str
    proposal_count: int
    view_count: int
    hired_crew: Optional[List[str]] = None
    cover_image: Optional[str] = None
    workspace: Optional[dict] = None  # includes progress, roles_filled/required

    published_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class JobPostListRead(BaseModel):
    """Job post summary for listings"""
    id: str
    client_id: str
    title: str
    department: str
    role: Optional[str] = None
    tags: List[str]

    crew_size: str
    complexity: str
    budget_type: str
    budget: Optional[dict] = None

    skills: List[str]
    experience_level: str

    status: str
    proposal_count: int
    view_count: int
    cover_image: Optional[str] = None
    workspace: Optional[dict] = None  # includes progress, roles_filled/required

    published_at: Optional[datetime] = None
    deadline: Optional[datetime] = None


class JobPostSearchFilters(BaseModel):
    """Search/filter parameters"""
    department: Optional[str] = None
    role: Optional[str] = None
    tags: Optional[List[str]] = None
    crew_size: Optional[str] = None
    complexity: Optional[str] = None
    budget_type: Optional[str] = None
    min_budget: Optional[float] = Field(None, ge=0)
    max_budget: Optional[float] = Field(None, ge=0)
    experience_level: Optional[str] = None
    skills: Optional[List[str]] = None
    status: Optional[str] = None
    search: Optional[str] = None
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)
    sort_by: str = Field("created_at", description="created_at, deadline, budget, proposals")
    sort_order: str = Field("desc", description="asc or desc")

    @validator('sort_by')
    def validate_sort_by(cls, v):
        allowed = ['created_at', 'deadline', 'budget', 'proposals', 'views']
        if v not in allowed:
            raise ValueError(f'sort_by must be one of: {", ".join(allowed)}')
        return v

    @validator('sort_order')
    def validate_sort_order(cls, v):
        if v not in ['asc', 'desc']:
            raise ValueError('sort_order must be: asc or desc')
        return v
