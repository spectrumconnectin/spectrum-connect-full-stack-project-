"""
Portfolio Builder — request/response schemas.

Covers rich portfolio projects (multi-media case studies), the public
aggregator payload, the quality score, and the smart-assist endpoints.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ── Media ─────────────────────────────────────────────────────────────────────

class ProjectMediaCreate(BaseModel):
    url: str
    caption: Optional[str] = Field(None, max_length=200)
    thumbnail: Optional[str] = None
    # type & media_type are derived server-side from the URL

    @field_validator("url")
    @classmethod
    def url_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("url must not be empty")
        if len(v) > 2000:
            raise ValueError("url too long")
        return v


class ProjectMediaRead(BaseModel):
    id: str
    type: str
    media_type: str
    url: str
    thumbnail: Optional[str] = None
    caption: Optional[str] = None
    order: int = 0
    created_at: datetime


class MediaReorderRequest(BaseModel):
    media_ids: List[str]


# ── Content blocks (rich case-study body) ──────────────────────────────────────

class ContentBlockCreate(BaseModel):
    type: str  # "text" | "image" | "video" | "before_after" | "quote"
    text: Optional[str] = Field(None, max_length=4000)
    attribution: Optional[str] = Field(None, max_length=120)
    media_id: Optional[str] = None
    before_media_id: Optional[str] = None
    after_media_id: Optional[str] = None

    @field_validator("type")
    @classmethod
    def type_valid(cls, v: str) -> str:
        allowed = {"text", "image", "video", "before_after", "quote"}
        if v not in allowed:
            raise ValueError(f"type must be one of {sorted(allowed)}")
        return v


class ContentBlockRead(BaseModel):
    id: str
    type: str
    text: Optional[str] = None
    attribution: Optional[str] = None
    media_id: Optional[str] = None
    before_media_id: Optional[str] = None
    after_media_id: Optional[str] = None
    order: int = 0


# ── Projects ──────────────────────────────────────────────────────────────────

class PortfolioProjectCreate(BaseModel):
    title: str
    slug: Optional[str] = Field(None, max_length=80)
    description: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, max_length=60)
    client: Optional[str] = Field(None, max_length=100)
    completion_date: Optional[datetime] = None
    external_link: Optional[str] = Field(None, max_length=2000)
    is_featured: Optional[bool] = False
    media: Optional[List[ProjectMediaCreate]] = None
    content_blocks: Optional[List[ContentBlockCreate]] = None

    @field_validator("title")
    @classmethod
    def title_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title must not be empty")
        if len(v) > 120:
            raise ValueError("title must be 120 characters or fewer")
        return v


class PortfolioProjectUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = Field(None, max_length=80)
    description: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, max_length=60)
    client: Optional[str] = Field(None, max_length=100)
    completion_date: Optional[datetime] = None
    external_link: Optional[str] = Field(None, max_length=2000)
    is_featured: Optional[bool] = None
    cover_media_id: Optional[str] = None
    content_blocks: Optional[List[ContentBlockCreate]] = None

    @field_validator("title")
    @classmethod
    def title_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("title must not be empty")
            if len(v) > 120:
                raise ValueError("title must be 120 characters or fewer")
        return v


class PortfolioProjectRead(BaseModel):
    id: str
    slug: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    client: Optional[str] = None
    completion_date: Optional[datetime] = None
    external_link: Optional[str] = None
    media: List[ProjectMediaRead] = []
    content_blocks: List[ContentBlockRead] = []
    cover_media_id: Optional[str] = None
    is_featured: bool = False
    order: int = 0
    view_count: int = 0
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    projects: List[PortfolioProjectRead]
    max_projects: int


class ProjectReorderRequest(BaseModel):
    project_ids: List[str]


# ── Quality score ─────────────────────────────────────────────────────────────

class QualityScoreResponse(BaseModel):
    score: int
    breakdown: Dict[str, int]
    suggestions: List[str]


# ── Public aggregator ─────────────────────────────────────────────────────────

class PublicPortfolioResponse(BaseModel):
    published: bool = True
    locked: Optional[bool] = None  # True when portfolio_access=="password" and no valid access token was presented
    user: Optional[Dict[str, Any]] = None
    profile: Optional[Dict[str, Any]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    education: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[PortfolioProjectRead]] = None
    reviews: Optional[Dict[str, Any]] = None
    quality_score: Optional[QualityScoreResponse] = None


class PublicProjectResponse(BaseModel):
    published: bool = True
    locked: Optional[bool] = None
    owner: Optional[Dict[str, Any]] = None  # minimal: id/username/handle/display_name/profile_picture/portfolio_template
    project: Optional[PortfolioProjectRead] = None


# ── Analytics ──────────────────────────────────────────────────────────────────

class ProjectViewSummary(BaseModel):
    title: str
    slug: Optional[str] = None
    view_count: int = 0


class AnalyticsResponse(BaseModel):
    total_views: int = 0
    this_week_views: int = 0
    top_projects: List[ProjectViewSummary] = []


class ViewRequest(BaseModel):
    project_slug: Optional[str] = None


# ── Sharing controls (passcode gate) ────────────────────────────────────────────

class PasscodeSetRequest(BaseModel):
    access: str  # "public" | "password"
    passcode: Optional[str] = Field(None, min_length=4, max_length=60)

    @field_validator("access")
    @classmethod
    def access_valid(cls, v: str) -> str:
        if v not in ("public", "password"):
            raise ValueError('access must be "public" or "password"')
        return v


class UnlockRequest(BaseModel):
    passcode: str = Field(..., min_length=1, max_length=60)


class UnlockResponse(BaseModel):
    token: str


# ── Smart assist ──────────────────────────────────────────────────────────────

class AssistBioRequest(BaseModel):
    current_text: Optional[str] = Field("", max_length=2000)
    role: Optional[str] = Field(None, max_length=80)
    years_experience: Optional[int] = Field(None, ge=0, le=60)
    skills: Optional[List[str]] = None


class AssistProjectDescriptionRequest(BaseModel):
    current_text: Optional[str] = Field("", max_length=3000)
    project_title: Optional[str] = Field(None, max_length=120)
    category: Optional[str] = Field(None, max_length=60)
    client: Optional[str] = Field(None, max_length=100)


class AssistProjectTitleRequest(BaseModel):
    current_text: Optional[str] = Field("", max_length=200)
    category: Optional[str] = Field(None, max_length=60)


class AssistSkillsSummaryRequest(BaseModel):
    skills: Optional[List[str]] = None
    role: Optional[str] = Field(None, max_length=80)


class AssistResponse(BaseModel):
    suggestions: List[str]
