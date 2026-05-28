"""
Service/Gig Schemas for Fiverr-style Service Offerings
Film Industry specific services
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


# ============================================================================
# PACKAGE SCHEMAS (Basic, Standard, Premium tiers)
# ============================================================================

class PackageCreate(BaseModel):
    name: str = Field(..., description="basic, standard, premium")
    description: str = Field(..., description="What's included in this package")
    price: float = Field(..., gt=0, description="Price in USD")
    delivery_time: int = Field(..., gt=0, description="Delivery time in days")
    revisions: int = Field(..., ge=-1, description="Number of revisions (-1 for unlimited)")
    features: List[str] = Field(..., min_items=1, description="List of features included")
    is_active: bool = True

    @validator('name')
    def validate_package_name(cls, v):
        allowed = ['basic', 'standard', 'premium']
        if v.lower() not in allowed:
            raise ValueError(f'Package name must be one of: {", ".join(allowed)}')
        return v.lower()


class PackageUpdate(BaseModel):
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    delivery_time: Optional[int] = Field(None, gt=0)
    revisions: Optional[int] = Field(None, ge=-1)
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None


class PackageRead(BaseModel):
    name: str
    description: str
    price: float
    delivery_time: int
    revisions: int
    features: List[str]
    is_active: bool


# ============================================================================
# EXTRA/ADD-ON SCHEMAS
# ============================================================================

class ExtraCreate(BaseModel):
    title: str = Field(..., description="Extra service title (e.g., 'Rush Delivery', 'Additional Footage')")
    description: Optional[str] = Field(None, description="Details about this extra")
    price: float = Field(..., gt=0, description="Additional price in USD")
    delivery_time: int = Field(..., ge=0, description="Additional days added to delivery")


class ExtraUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    delivery_time: Optional[int] = Field(None, ge=0)


class ExtraRead(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    delivery_time: int


# ============================================================================
# REQUIREMENT SCHEMAS (What seller needs from buyer)
# ============================================================================

class RequirementCreate(BaseModel):
    question: str = Field(..., description="Question to ask the buyer")
    type: str = Field(..., description="text, multiple_choice, file_upload")
    required: bool = True
    options: Optional[List[str]] = Field(None, description="Options for multiple_choice type")

    @validator('type')
    def validate_requirement_type(cls, v):
        allowed = ['text', 'multiple_choice', 'file_upload']
        if v not in allowed:
            raise ValueError(f'Requirement type must be one of: {", ".join(allowed)}')
        return v


class RequirementUpdate(BaseModel):
    question: Optional[str] = None
    type: Optional[str] = None
    required: Optional[bool] = None
    options: Optional[List[str]] = None


class RequirementRead(BaseModel):
    question: str
    type: str
    required: bool
    options: Optional[List[str]] = None


# ============================================================================
# SERVICE MEDIA SCHEMAS
# ============================================================================

class ServiceMediaCreate(BaseModel):
    images: Optional[List[str]] = Field(None, max_items=10, description="Image URLs (max 10)")
    videos: Optional[List[str]] = Field(None, max_items=3, description="Video URLs (max 3)")
    thumbnail: Optional[str] = Field(None, description="Main thumbnail URL")


class ServiceMediaRead(BaseModel):
    images: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    thumbnail: Optional[str] = None


# ============================================================================
# SERVICE SEO SCHEMAS
# ============================================================================

class ServiceSEOCreate(BaseModel):
    meta_title: Optional[str] = Field(None, max_length=60)
    meta_description: Optional[str] = Field(None, max_length=160)
    keywords: Optional[List[str]] = Field(None, max_items=10)


class ServiceSEORead(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    keywords: Optional[List[str]] = None


# ============================================================================
# SERVICE STATS SCHEMAS
# ============================================================================

class ServiceStatsRead(BaseModel):
    views: int = 0
    impressions: int = 0
    clicks: int = 0
    orders: int = 0
    in_queue: int = 0
    completed_orders: int = 0
    cancelled_orders: int = 0
    revenue: float = 0


# ============================================================================
# MAIN SERVICE SCHEMAS
# ============================================================================

class ServiceCreate(BaseModel):
    """Create a new service/gig"""
    title: str = Field(..., min_length=10, max_length=80, description="Service title (e.g., 'Professional Cinematography for Short Films')")
    description: str = Field(..., min_length=100, max_length=5000, description="Detailed service description")
    department: str = Field(..., description="Camera, Sound, Lighting, Post-Production, etc.")
    role: Optional[str] = Field(None, description="Cinematographer, Sound Designer, Editor, etc.")
    tags: List[str] = Field(..., min_items=1, max_items=10, description="Service tags for search")
    media: Optional[ServiceMediaCreate] = None
    packages: List[PackageCreate] = Field(..., min_items=1, max_items=3, description="At least 1 package required")
    extras: Optional[List[ExtraCreate]] = Field(None, max_items=10)
    requirements: Optional[List[RequirementCreate]] = Field(None, max_items=10)
    seo: Optional[ServiceSEOCreate] = None

    @validator('department')
    def validate_department(cls, v):
        """Film industry departments"""
        allowed_departments = [
            'Camera', 'Sound', 'Lighting', 'Grip', 'Electric',
            'Art Department', 'Costume', 'Makeup & Hair', 'VFX',
            'Post-Production', 'Editing', 'Color Grading', 'Sound Design',
            'Music Composition', 'Production Management', 'Directing',
            'Producing', 'Cinematography', 'Scripting', 'Storyboarding',
            'Animation', '3D Modeling', 'Motion Graphics', 'Other'
        ]
        if v not in allowed_departments:
            raise ValueError(f'Department must be one of: {", ".join(allowed_departments)}')
        return v

    @validator('packages')
    def validate_packages(cls, v):
        """Ensure package names are unique"""
        names = [p.name.lower() for p in v]
        if len(names) != len(set(names)):
            raise ValueError('Package names must be unique (basic, standard, premium)')
        return v


class ServiceUpdate(BaseModel):
    """Update an existing service"""
    title: Optional[str] = Field(None, min_length=10, max_length=80)
    description: Optional[str] = Field(None, min_length=100, max_length=5000)
    department: Optional[str] = None
    role: Optional[str] = None
    tags: Optional[List[str]] = Field(None, min_items=1, max_items=10)
    media: Optional[ServiceMediaCreate] = None
    packages: Optional[List[PackageCreate]] = Field(None, min_items=1, max_items=3)
    extras: Optional[List[ExtraCreate]] = Field(None, max_items=10)
    requirements: Optional[List[RequirementCreate]] = Field(None, max_items=10)
    seo: Optional[ServiceSEOCreate] = None


class ServiceStatusUpdate(BaseModel):
    """Update service status"""
    status: str = Field(..., description="draft, active, paused")

    @validator('status')
    def validate_status(cls, v):
        allowed = ['draft', 'active', 'paused']
        if v not in allowed:
            raise ValueError(f'Status must be one of: {", ".join(allowed)}')
        return v


class ServiceRead(BaseModel):
    """Complete service details"""
    id: str
    user_id: str
    title: str
    slug: str
    description: str
    department: str
    role: Optional[str] = None
    tags: List[str]
    media: Optional[dict] = None
    packages: List[PackageRead]
    extras: Optional[List[ExtraRead]] = None
    requirements: Optional[List[RequirementRead]] = None
    stats: ServiceStatsRead
    rating: dict  # Overall rating and breakdown
    status: str
    is_premium: bool = False
    boost_expires_at: Optional[datetime] = None
    seo: Optional[ServiceSEORead] = None
    paused_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ServiceListRead(BaseModel):
    """Service summary for listings (lighter version)"""
    id: str
    user_id: str
    title: str
    slug: str
    department: str
    role: Optional[str] = None
    tags: List[str]
    media: Optional[dict] = None
    packages: List[PackageRead]
    stats: ServiceStatsRead
    rating: dict
    status: str
    is_premium: bool = False


class ServiceSearchFilters(BaseModel):
    """Search/filter parameters"""
    department: Optional[str] = None
    role: Optional[str] = None
    tags: Optional[List[str]] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    delivery_time: Optional[int] = Field(None, gt=0, description="Max delivery days")
    search: Optional[str] = Field(None, description="Search in title and description")
    status: str = "active"  # Only show active by default
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)
    sort_by: str = Field("created_at", description="created_at, rating, price, popularity")
    sort_order: str = Field("desc", description="asc or desc")

    @validator('sort_by')
    def validate_sort_by(cls, v):
        allowed = ['created_at', 'rating', 'price', 'popularity', 'orders']
        if v not in allowed:
            raise ValueError(f'sort_by must be one of: {", ".join(allowed)}')
        return v

    @validator('sort_order')
    def validate_sort_order(cls, v):
        if v not in ['asc', 'desc']:
            raise ValueError('sort_order must be asc or desc')
        return v
