"""
Blog Models

Blog post, comment, and category models for the blog CMS
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from beanie import Document, PydanticObjectId


# ============================================================================
# BLOG MODELS
# ============================================================================

class BlogAuthor(BaseModel):
    """Author information for blog posts"""
    user_id: Optional[PydanticObjectId] = None  # Link to User, or None for admin/staff
    name: str  # Display name
    avatar: Optional[str] = None  # Avatar URL
    bio: Optional[str] = None  # Short bio


class BlogSEO(BaseModel):
    """SEO metadata for blog posts"""
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    keywords: Optional[List[str]] = None
    og_image: Optional[str] = None


class BlogStats(BaseModel):
    """Statistics for blog posts"""
    views: int = 0
    likes: int = 0
    shares: int = 0
    comments_count: int = 0
    read_time_minutes: Optional[int] = None  # Auto-calculated


class BlogPost(Document):
    """
    Blog Post Model

    Represents a blog post with full content, metadata, and engagement tracking
    """
    # Core fields
    title: str
    slug: str  # URL-friendly unique identifier
    excerpt: str  # Short summary for cards/previews
    content: str  # Full HTML/Markdown content
    cover_image: str  # URL to cover image

    # Author info
    author: BlogAuthor

    # Categorization
    category: Optional[str] = None  # "Case study", "Product", "Tutorial"
    tags: Optional[List[str]] = None  # ["Film", "AI", "Workflow"]

    # Status & visibility
    status: str = "draft"  # draft, published, archived
    is_featured: bool = False

    # SEO
    seo: Optional[BlogSEO] = None

    # Stats
    stats: BlogStats = Field(default_factory=BlogStats)

    # Timestamps
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "blog_posts"
        indexes = [
            "slug",  # Unique index for fast lookups
            "status",
            "category",
            "tags",
            "published_at",
            "is_featured"
        ]


class BlogComment(Document):
    """
    Blog Comment Model

    Supports both authenticated and guest comments with moderation
    """
    post_id: PydanticObjectId  # Reference to BlogPost
    user_id: Optional[PydanticObjectId] = None  # None for guest comments

    # Guest user fields (if user_id is None)
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None

    # Comment content
    content: str

    # Moderation
    status: str = "pending"  # pending, approved, spam, deleted
    is_pinned: bool = False  # Pin important comments

    # Engagement
    likes: int = 0
    liked_by: Optional[List[PydanticObjectId]] = None

    # Threading (for nested replies)
    parent_comment_id: Optional[PydanticObjectId] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None

    class Settings:
        name = "blog_comments"
        indexes = [
            "post_id",
            "user_id",
            "status",
            "created_at"
        ]


class BlogCategory(Document):
    """
    Blog Category Model

    Structured categories for organizing blog posts
    """
    name: str  # "Case Studies", "Product Updates"
    slug: str  # "case-studies"
    description: Optional[str] = None
    icon: Optional[str] = None  # Icon name from lucide-react
    color: Optional[str] = None  # Hex color for UI
    post_count: int = 0  # Denormalized count
    is_active: bool = True
    order: int = 0  # Display order

    class Settings:
        name = "blog_categories"
        indexes = ["slug", "is_active"]
