"""
Community API Schemas

Request and response schemas for community endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ===== PROJECT SCHEMAS =====

class ProjectRoleSchema(BaseModel):
    """Schema for project role"""
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    count: int = Field(1, ge=1)
    filled: int = Field(0, ge=0)


class CommunityProjectCreate(BaseModel):
    """Schema for creating a community project"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    project_type: str = Field(..., min_length=1)  # doc, app, music, film, game, mag
    creator_role: Optional[str] = None
    roles: List[ProjectRoleSchema] = []
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    skills_needed: Optional[List[str]] = None
    is_remote: bool = False


class CommunityProjectUpdate(BaseModel):
    """Schema for updating a community project"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    roles: Optional[List[ProjectRoleSchema]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None  # active, in_progress, completed, cancelled


# ===== EVENT SCHEMAS =====

class CommunityEventCreate(BaseModel):
    """Schema for creating a community event"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    event_type: str = Field(..., min_length=1)  # live, workshop, meetup, roundtable, showcase
    start_time: datetime
    end_time: Optional[datetime] = None
    timezone: str = "UTC"
    location_type: str = "online"  # online, in_person, hybrid
    location: Optional[str] = None
    max_attendees: Optional[int] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    requires_registration: bool = True
    registration_deadline: Optional[datetime] = None


class CommunityEventUpdate(BaseModel):
    """Schema for updating a community event"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    max_attendees: Optional[int] = None
    status: Optional[str] = None  # upcoming, ongoing, completed, cancelled


class EventRegistration(BaseModel):
    """Schema for event registration"""
    user_id: Optional[str] = None  # Optional, will be filled from auth


# ===== FORUM SCHEMAS =====

class ForumThreadCreate(BaseModel):
    """Schema for creating a forum thread"""
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class ForumThreadUpdate(BaseModel):
    """Schema for updating a forum thread"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None  # active, closed, pinned, locked


class ForumPostCreate(BaseModel):
    """Schema for creating a forum post"""
    content: str = Field(..., min_length=1)
    parent_post_id: Optional[str] = None


# ===== COLLAB CALL SCHEMAS =====

class CollabCallCreate(BaseModel):
    """Schema for creating a collab call"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    collab_type: str = Field(..., min_length=1)  # video, design, music, writing
    roles_needed: List[str] = []
    skills_needed: Optional[List[str]] = None
    experience_level: Optional[str] = None  # beginner, intermediate, expert
    is_paid: bool = False
    budget: Optional[str] = None
    timeline: Optional[str] = None
    is_remote: bool = True
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class CollabCallUpdate(BaseModel):
    """Schema for updating a collab call"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = None  # open, in_progress, filled, closed


class CollabApplication(BaseModel):
    """Schema for applying to a collab call"""
    message: Optional[str] = None
    portfolio_url: Optional[str] = None
