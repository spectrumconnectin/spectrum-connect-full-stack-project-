"""
Pydantic schemas for Project API endpoints
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ==================== Team Member Schemas ====================

class TeamMemberBase(BaseModel):
    """Base schema for team member"""
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    role: str
    permissions: List[str] = []


class TeamMemberResponse(TeamMemberBase):
    """Response schema for team member"""
    joined_at: datetime
    invitation_status: str


class TeamMemberAdd(BaseModel):
    """Schema for adding team member"""
    user_id: str
    role: str
    permissions: List[str] = []


class TeamMemberUpdate(BaseModel):
    """Schema for updating team member"""
    role: Optional[str] = None
    permissions: Optional[List[str]] = None


# ==================== Project Schemas ====================

class ProjectCreate(BaseModel):
    """Schema for creating a new project"""
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    category: str  # film, app, music, design, documentary
    tags: List[str] = []
    total_roles: int = 1
    icon_type: str = "film"
    is_public: bool = False

    # Optional job posting fields
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    """Schema for updating project"""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10)
    status: Optional[str] = None  # draft, active, in_progress, review, completed, on_hold
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    total_roles: Optional[int] = None
    icon_type: Optional[str] = None
    is_public: Optional[bool] = None
    is_featured: Optional[bool] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ProjectProgressUpdate(BaseModel):
    """Schema for updating project progress"""
    progress_percentage: int = Field(..., ge=0, le=100)


class ProjectResponse(BaseModel):
    """Response schema for a project"""
    id: str
    title: str
    description: str
    client_id: str
    status: str
    progress_percentage: int
    team_members: List[TeamMemberResponse]
    total_roles: int
    filled_roles: int
    tags: List[str]
    category: str
    icon_type: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    is_featured: bool
    is_public: bool
    job_post_id: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    location: Optional[str] = None


class ProjectListResponse(BaseModel):
    """Paginated list of projects"""
    projects: List[ProjectResponse]
    total: int
    page: int
    page_size: int


# ==================== Activity Log Schemas ====================

class ActivityLogCreate(BaseModel):
    """Schema for creating activity log (internal use)"""
    activity_type: str
    project_id: str
    project_title: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_avatar: Optional[str] = None
    message: str
    metadata: dict = {}


class ActivityLogResponse(BaseModel):
    """Response schema for activity log"""
    id: str
    activity_type: str
    project_id: str
    project_title: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_avatar: Optional[str] = None
    message: str
    metadata: dict
    created_at: datetime


class ActivityFeedResponse(BaseModel):
    """Paginated activity feed"""
    activities: List[ActivityLogResponse]
    total: int
    has_more: bool


# ==================== Deadline Schemas ====================

class DeadlineCreate(BaseModel):
    """Schema for creating a deadline"""
    project_id: str
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    due_date: datetime
    priority: str = "medium"  # high, medium, low
    assigned_to: List[str] = []


class DeadlineUpdate(BaseModel):
    """Schema for updating a deadline"""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None  # pending, completed, missed
    assigned_to: Optional[List[str]] = None


class DeadlineResponse(BaseModel):
    """Response schema for a deadline"""
    id: str
    project_id: str
    project_title: str
    title: str
    description: Optional[str] = None
    due_date: datetime
    priority: str
    status: str
    assigned_to: List[str]
    created_by: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    days_remaining: Optional[int] = None


class DeadlineListResponse(BaseModel):
    """Paginated list of deadlines"""
    deadlines: List[DeadlineResponse]
    total: int


# ==================== Dashboard Summary Schemas ====================

class ProjectStats(BaseModel):
    """Project statistics for dashboard"""
    total_projects: int
    active_projects: int
    completed_projects: int
    team_members_count: int
    completed_milestones: int


class CommunityProjectResponse(BaseModel):
    """Community spotlight project"""
    id: str
    title: str
    creator_id: str
    creator_name: str
    creator_avatar: Optional[str] = None
    category: str
    tags: List[str]
    created_at: datetime


class DashboardSummaryResponse(BaseModel):
    """Complete dashboard data"""
    active_projects: List[ProjectResponse]
    activity_feed: List[ActivityLogResponse]
    upcoming_deadlines: List[DeadlineResponse]
    community_spotlight: List[CommunityProjectResponse]
    stats: ProjectStats
