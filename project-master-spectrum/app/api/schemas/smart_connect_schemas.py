"""
Smart Connect API Schemas (v2 — Workforce Balance)
===================================================
All request/response schemas for smart matching and creative discovery.

Changes from v1
---------------
CreativeProfile     – added active_project_count, workload_capacity,
                      trust_tier, workload_score, trust_score.
MatchResult         – added score_breakdown, workload_info.
SmartMatchRequest   – added min_trust_tier, workload_aware.
CreativeSearchRequest – added min_trust_tier, max_workload, verified_skills_only.
WorkloadCapacityRequest – new schema for PATCH /smart-connect/workload-capacity.
WorkloadStatsResponse   – new schema for GET /smart-connect/workload-stats.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# ── Shared profile schema ─────────────────────────────────────────────────────

class CreativeProfile(BaseModel):
    """A single creator / crew member profile returned by any Smart Connect endpoint."""

    user_id: str
    name: str
    title: str
    role: Optional[str] = None
    avatar: Optional[str] = None
    location: Optional[Any] = None
    rating: float = 0.0
    total_reviews: int = 0
    skills: List[str] = []
    specializations: List[str] = []
    bio: Optional[str] = None
    daily_rate: Optional[float] = None
    availability: Optional[str] = None

    # ── Workforce Balance additions ──────────────────────────────────────
    active_project_count: int = 0
    """How many projects the creator is currently working on."""

    workload_capacity: int = 3
    """Creator's self-stated maximum concurrent project limit."""

    trust_tier: str = "Bronze"
    """Spectrum ID tier label (Bronze / Silver / Gold / Platinum / Diamond)."""

    workload_score: int = 0
    """Fairness score contribution (0, 4, 7, or 10) used in matching."""

    trust_score: float = 0.0
    """Raw Spectrum ID trust score (0-100)."""


# ── Match result ──────────────────────────────────────────────────────────────

class WorkloadInfo(BaseModel):
    """Workload snapshot attached to each match result."""
    active_projects: int
    capacity: int
    fairness_score: int
    fairness_label: str


class ScoreBreakdown(BaseModel):
    """Per-category score breakdown for transparency."""
    role: int = 0
    skills: int = 0
    specialization: int = 0
    location: int = 0
    rating: int = 0
    workload_fairness: int = 0
    trust_tier: int = 0


class MatchResult(BaseModel):
    """A single match result from the smart-match algorithm."""
    profile: CreativeProfile
    match_score: float                    # 0-100
    match_level: str                      # "Perfect Fit" | "Great Fit" | "Good Fit"
    match_reasons: List[str]              # Top reasons (max 4)
    score_breakdown: Optional[ScoreBreakdown] = None   # per-category points
    workload_info: Optional[WorkloadInfo] = None       # workload snapshot


# ── Smart Match ───────────────────────────────────────────────────────────────

class SmartMatchRequest(BaseModel):
    """Request body for POST /smart-connect/match."""

    project_description: str = Field(..., min_length=1)
    project_type: str = Field(..., min_length=1)   # "Short Film", "Documentary", etc.
    timeline: Optional[str] = None                 # "1-2 weeks", "1 month", etc.
    roles_needed: List[str] = []                   # ["Video Editor", "Sound Designer"]
    skills_required: Optional[List[str]] = None
    location: Optional[str] = None
    budget_range: Optional[str] = None
    is_remote: bool = False

    # Workforce Balance additions
    min_trust_tier: Optional[str] = Field(
        None,
        description="Filter out creators below this tier: bronze|silver|gold|platinum|diamond",
    )
    workload_aware: bool = Field(
        True,
        description="Apply workload-fairness and trust-tier scoring (default True).",
    )


class SmartMatchResponse(BaseModel):
    """Response for POST /smart-connect/match."""
    matches: List[MatchResult]
    total_matches: int
    search_criteria: dict


# ── Creative Search ───────────────────────────────────────────────────────────

class CreativeSearchRequest(BaseModel):
    """Request body for POST /smart-connect/search."""

    query: Optional[str] = None
    roles: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    location: Optional[str] = None
    min_rating: Optional[float] = None
    max_rate: Optional[float] = None
    availability: Optional[str] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)

    # Workforce Balance additions
    min_trust_tier: Optional[str] = Field(
        None,
        description="Minimum Spectrum ID tier: bronze|silver|gold|platinum|diamond",
    )
    max_workload: Optional[int] = Field(
        None,
        ge=0,
        description="Exclude creators with more than N active projects.",
    )
    verified_skills_only: bool = Field(
        False,
        description="Only return creators with at least one verified skill badge.",
    )


class CreativeSearchResponse(BaseModel):
    """Response for POST /smart-connect/search."""
    creatives: List[CreativeProfile]
    total: int
    limit: int
    offset: int
    has_more: bool


# ── Saved profiles ────────────────────────────────────────────────────────────

class SavedProfileRequest(BaseModel):
    """Request body for POST /smart-connect/save."""
    profile_user_id: str


class SavedProfilesResponse(BaseModel):
    """Response for GET /smart-connect/saved and GET /smart-connect/featured."""
    profiles: List[CreativeProfile]
    total: int


# ── Workforce Balance — capacity management ───────────────────────────────────

class WorkloadCapacityRequest(BaseModel):
    """Request body for PATCH /smart-connect/workload-capacity."""
    capacity: int = Field(
        ..., ge=1, le=10,
        description="Your maximum number of concurrent projects (1-10).",
    )


class WorkloadCapacityResponse(BaseModel):
    """Response for PATCH /smart-connect/workload-capacity."""
    success: bool
    capacity: int
    active_project_count: int
    message: str


# ── Workforce Balance — platform stats ────────────────────────────────────────

class WorkloadBreakdown(BaseModel):
    free: int         # 0 active projects
    light: int        # 1-2 active
    moderate: int     # 3-4 active
    at_capacity: int  # 5+ or >= their stated capacity


class ScoreDistribution(BaseModel):
    score_10: int
    score_7: int
    score_4: int
    score_0: int


class WorkloadStatsResponse(BaseModel):
    """Response for GET /smart-connect/workload-stats."""
    breakdown: WorkloadBreakdown
    total_crew: int
    avg_active_projects: float
    at_capacity_count: int
    score_distribution: ScoreDistribution