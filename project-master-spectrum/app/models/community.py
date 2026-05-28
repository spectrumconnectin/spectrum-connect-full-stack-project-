"""
Community Models

Models for community features: projects, events, forums, collab calls
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from beanie import Document, PydanticObjectId


# ============================================================================
# COMMUNITY MODELS
# ============================================================================

class ProjectRole(BaseModel):
    """Role needed for a community project"""
    title: str  # e.g., "Sound Engineer", "Video Editor"
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    count: int = 1  # Number of people needed
    filled: int = 0  # Number of people who joined


class ProjectMember(BaseModel):
    """Member of a community project"""
    user_id: PydanticObjectId
    role: str
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class CommunityProject(Document):
    """
    Community Project Model

    Projects posted in the community for collaboration
    """
    # Core fields
    title: str
    description: str
    project_type: str  # doc, app, music, film, game, mag, etc.

    # Creator info
    creator_id: PydanticObjectId
    creator_name: str
    creator_role: Optional[str] = None
    creator_avatar: Optional[str] = None

    # Roles
    roles: List[ProjectRole] = []
    members: Optional[List[ProjectMember]] = None
    roles_open: int = 0  # Total open roles

    # Categorization
    category: Optional[str] = None  # Film, Design, Music, Gaming, etc.
    tags: Optional[List[str]] = None
    skills_needed: Optional[List[str]] = None

    # Status
    status: str = "active"  # active, in_progress, completed, cancelled
    is_featured: bool = False
    is_remote: bool = False

    # Engagement
    views: int = 0
    interested_count: int = 0  # Number of users who expressed interest
    interested_users: Optional[List[PydanticObjectId]] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

    class Settings:
        name = "community_projects"
        indexes = [
            "creator_id",
            "project_type",
            "category",
            "tags",
            "status",
            "is_featured",
            "created_at"
        ]


class CommunityEvent(Document):
    """
    Community Event Model

    Events, workshops, meetups, and community gatherings
    """
    # Core fields
    title: str
    description: str
    event_type: str  # live, workshop, meetup, roundtable, showcase

    # Host info
    host_id: PydanticObjectId
    host_name: str
    host_avatar: Optional[str] = None
    co_hosts: Optional[List[PydanticObjectId]] = None

    # Event details
    start_time: datetime
    end_time: Optional[datetime] = None
    timezone: str = "UTC"
    location_type: str = "online"  # online, in_person, hybrid
    location: Optional[str] = None  # URL for online, address for in_person
    max_attendees: Optional[int] = None

    # Categorization
    category: Optional[str] = None
    tags: Optional[List[str]] = None

    # Registration
    requires_registration: bool = True
    registration_deadline: Optional[datetime] = None
    attendees: Optional[List[PydanticObjectId]] = None
    attendee_count: int = 0
    waitlist: Optional[List[PydanticObjectId]] = None

    # Status
    status: str = "upcoming"  # upcoming, ongoing, completed, cancelled
    is_featured: bool = False
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None

    # Engagement
    views: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "community_events"
        indexes = [
            "host_id",
            "event_type",
            "start_time",
            "status",
            "is_featured",
            "attendees"
        ]


class ForumThread(Document):
    """
    Forum Thread Model

    Discussion threads in the community forum
    """
    # Core fields
    title: str
    content: str  # First post content

    # Author info
    author_id: PydanticObjectId
    author_name: str
    author_avatar: Optional[str] = None
    author_role: Optional[str] = None

    # Categorization
    category: Optional[str] = None  # General, Help, Showcase, Feedback
    tags: Optional[List[str]] = None

    # Status
    status: str = "active"  # active, closed, pinned, locked
    is_pinned: bool = False
    is_locked: bool = False
    is_featured: bool = False

    # Engagement
    views: int = 0
    replies_count: int = 0
    likes: int = 0
    liked_by: Optional[List[PydanticObjectId]] = None

    # Last activity
    last_reply_at: Optional[datetime] = None
    last_reply_by: Optional[PydanticObjectId] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "forum_threads"
        indexes = [
            "author_id",
            "category",
            "tags",
            "status",
            "is_pinned",
            "is_featured",
            "created_at",
            "last_reply_at"
        ]


class ForumPost(Document):
    """
    Forum Post Model

    Replies to forum threads
    """
    thread_id: PydanticObjectId
    content: str

    # Author info
    author_id: PydanticObjectId
    author_name: str
    author_avatar: Optional[str] = None

    # Threading
    parent_post_id: Optional[PydanticObjectId] = None  # For nested replies

    # Moderation
    status: str = "approved"  # approved, pending, spam, deleted
    is_edited: bool = False
    edited_at: Optional[datetime] = None

    # Engagement
    likes: int = 0
    liked_by: Optional[List[PydanticObjectId]] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "forum_posts"
        indexes = [
            "thread_id",
            "author_id",
            "status",
            "created_at"
        ]


class CollabCall(Document):
    """
    Collaboration Call Model

    Open collaboration opportunities for creators
    """
    # Core fields
    title: str
    description: str
    collab_type: str  # video, design, music, writing, etc.

    # Creator info
    creator_id: PydanticObjectId
    creator_name: str
    creator_avatar: Optional[str] = None
    creator_role: Optional[str] = None

    # Requirements
    roles_needed: List[str] = []  # e.g., ["Colorist", "Sound Designer"]
    skills_needed: Optional[List[str]] = None
    experience_level: Optional[str] = None  # beginner, intermediate, expert

    # Project details
    is_paid: bool = False
    budget: Optional[str] = None
    timeline: Optional[str] = None
    is_remote: bool = True

    # Categorization
    category: Optional[str] = None
    tags: Optional[List[str]] = None

    # Status
    status: str = "open"  # open, in_progress, filled, closed
    is_featured: bool = False

    # Applications
    applications: Optional[List[PydanticObjectId]] = None  # User IDs who applied
    application_count: int = 0

    # Engagement
    views: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Settings:
        name = "collab_calls"
        indexes = [
            "creator_id",
            "collab_type",
            "category",
            "tags",
            "status",
            "is_featured",
            "created_at"
        ]


class CommunityGuideline(Document):
    """
    Community Guidelines Model

    Community rules and guidelines
    """
    title: str
    description: str
    icon: Optional[str] = None  # Icon name from lucide-react
    color: Optional[str] = None  # Gradient class for styling
    order: int = 0
    is_active: bool = True

    class Settings:
        name = "community_guidelines"
        indexes = ["order", "is_active"]


class FeaturedCreator(Document):
    """
    Featured Creator Model

    Highlighted community members
    """
    user_id: PydanticObjectId
    name: str
    role: str
    avatar: str
    bio: str
    tags: List[str] = []

    # Social links
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None

    # Featured period
    featured_start: datetime
    featured_end: Optional[datetime] = None
    is_active: bool = True
    order: int = 0

    class Settings:
        name = "featured_creators"
        indexes = ["user_id", "is_active", "order", "featured_start"]
