"""
Project Models for Spectrum Connect

Enhanced project management models for client dashboard:
- Project: Main project/job tracking with team members
- ProjectTeamMember: Embedded team member info
- ActivityLog: Project activity feed
- ProjectDeadline: Milestones and deadlines
"""

from datetime import datetime
from typing import Optional, List
from beanie import Document, Indexed
from pydantic import BaseModel, Field


# Note: User model is imported at runtime in service layer to avoid circular imports


class ProjectTeamMember(BaseModel):
    """
    Embedded model for team members in a project
    """
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    role: str  # Editor, Designer, Developer, etc.
    permissions: List[str] = []
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    invitation_status: str = "accepted"  # pending, accepted, declined


class Project(Document):
    """
    Enhanced project model for client dashboard

    Replaces/extends JobPost with additional tracking features:
    - Team management
    - Progress tracking
    - Status management
    - Activity logging
    """
    # Core fields
    title: Indexed(str)
    description: str
    client_id: Indexed(str)  # User who created the project

    # Status & Progress
    status: str = "draft"  # draft, active, in_progress, review, completed, on_hold, archived
    progress_percentage: int = 0

    # Team
    team_members: List[ProjectTeamMember] = []
    total_roles: int = 0
    filled_roles: int = 0

    # Metadata
    tags: List[str] = []
    category: str  # film, app, music, design, documentary, etc.
    icon_type: str = "film"  # For UI icon badge

    # Timeline
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Settings
    is_featured: bool = False  # For community spotlight
    is_public: bool = False

    # Job posting fields (if this was created from a job post)
    job_post_id: Optional[str] = None  # Link to original JobPost
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    location: Optional[str] = None

    class Settings:
        name = "projects"
        indexes = [
            "client_id",
            "status",
            "category",
            "is_featured",
            "created_at",
            [("client_id", 1), ("status", 1)],  # Compound index
            [("client_id", 1), ("created_at", -1)],  # For sorting
        ]

    def add_team_member(
        self,
        user_id: str,
        username: str,
        role: str,
        avatar_url: Optional[str] = None,
        permissions: List[str] = None
    ):
        """Add a team member to the project"""
        member = ProjectTeamMember(
            user_id=user_id,
            username=username,
            avatar_url=avatar_url,
            role=role,
            permissions=permissions or []
        )
        self.team_members.append(member)
        self.filled_roles = len(self.team_members)

    def remove_team_member(self, user_id: str):
        """Remove a team member from the project"""
        self.team_members = [m for m in self.team_members if m.user_id != user_id]
        self.filled_roles = len(self.team_members)

    def is_team_member(self, user_id: str) -> bool:
        """Check if user is a team member"""
        return any(m.user_id == user_id for m in self.team_members)

    def is_owner(self, user_id: str) -> bool:
        """Check if user is the project owner"""
        return self.client_id == user_id


class ActivityLog(Document):
    """
    Activity log for project timeline and team activity feed

    Tracks all important events:
    - User joined project
    - Deadlines approaching
    - Files uploaded
    - Milestones completed
    - Status changes
    """
    # Activity type
    activity_type: Indexed(str)  # user_joined, deadline_approaching, file_uploaded, milestone_completed, status_changed

    # Project reference
    project_id: Indexed(str)
    project_title: str

    # Actor (who did the action)
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_avatar: Optional[str] = None

    # Details
    message: str  # Human-readable message for display
    metadata: dict = {}  # Extra structured data

    # Timestamp
    created_at: Indexed(datetime) = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "activity_logs"
        indexes = [
            "project_id",
            "activity_type",
            "created_at",
            [("project_id", 1), ("created_at", -1)],  # For project timeline
            "actor_id",
        ]


class ProjectDeadline(Document):
    """
    Deadlines and milestones for projects

    Supports:
    - Task deadlines
    - Project milestones
    - Priority levels
    - Assignment to team members
    """
    # Project reference
    project_id: Indexed(str)
    project_title: str

    # Deadline details
    title: str
    description: Optional[str] = None
    due_date: Indexed(datetime)

    # Priority & Status
    priority: str = "medium"  # high, medium, low
    status: str = "pending"  # pending, completed, missed

    # Assignment
    assigned_to: List[str] = []  # User IDs

    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None

    class Settings:
        name = "project_deadlines"
        indexes = [
            "project_id",
            "due_date",
            "status",
            "priority",
            [("project_id", 1), ("due_date", 1)],  # For project deadlines list
            [("due_date", 1), ("status", 1)],  # For upcoming deadlines query
        ]

    def mark_completed(self, user_id: str):
        """Mark deadline as completed"""
        self.status = "completed"
        self.completed_at = datetime.utcnow()
        self.completed_by = user_id

    def days_remaining(self) -> int:
        """Calculate days until deadline"""
        delta = self.due_date - datetime.utcnow()
        return max(0, delta.days)
