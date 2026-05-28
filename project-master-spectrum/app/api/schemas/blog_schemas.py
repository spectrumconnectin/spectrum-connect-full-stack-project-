"""
Blog API Schemas

Request and response schemas for blog endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class BlogPostCreate(BaseModel):
    """Schema for creating a blog post"""
    title: str = Field(..., min_length=1, max_length=200)
    excerpt: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    cover_image: str = Field(..., min_length=1)
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_featured: bool = False
    status: str = "draft"  # draft, published, archived
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    author_bio: Optional[str] = None


class BlogPostUpdate(BaseModel):
    """Schema for updating a blog post"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    excerpt: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = Field(None, min_length=1)
    cover_image: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None  # draft, published, archived
    is_featured: Optional[bool] = None


class CommentCreate(BaseModel):
    """Schema for creating a comment"""
    content: str = Field(..., min_length=1, max_length=1000)
    guest_name: Optional[str] = Field(None, min_length=1, max_length=100)
    guest_email: Optional[str] = Field(None, min_length=1, max_length=200)
    parent_comment_id: Optional[str] = None


class CommentModerate(BaseModel):
    """Schema for moderating a comment"""
    status: str = Field(..., pattern="^(approved|spam|deleted)$")


class BlogCategoryCreate(BaseModel):
    """Schema for creating a blog category"""
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    order: int = 0


class BlogCategoryUpdate(BaseModel):
    """Schema for updating a blog category"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None
