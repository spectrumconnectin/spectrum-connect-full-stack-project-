from __future__ import annotations
"""
Skill Verification Challenges — Schemas
========================================
Request / response models for /skill-challenges endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime


# ── Shared ────────────────────────────────────────────────────────────────────

class EvaluationCriterionInput(BaseModel):
    criterion_name: str = Field(..., min_length=2, max_length=100)
    weight: float = Field(..., gt=0, le=1.0, description="0.0–1.0, all weights must sum to 1.0")
    max_score: float = Field(10.0, gt=0)
    description: Optional[str] = Field(None, max_length=300)


class EvaluationCriterionDetail(BaseModel):
    criterion_name: str
    weight: float
    max_score: float
    description: Optional[str] = None


class CriterionScoreInput(BaseModel):
    criterion_name: str
    score: float = Field(..., ge=0)
    feedback: Optional[str] = Field(None, max_length=500)


# ── Challenge schemas ─────────────────────────────────────────────────────────

class CreateChallengeRequest(BaseModel):
    """POST /skill-challenges/  [Admin]"""
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=1000)
    skill_category: str = Field(
        ...,
        description="Camera | Sound | Editing | VFX | Lighting | Directing | Producing | Writing | Design | Music"
    )
    difficulty: str = Field(
        "intermediate",
        description="beginner | intermediate | advanced | expert"
    )
    challenge_type: str = Field("task", description="task | quiz | project")
    instructions: str = Field(..., min_length=20, max_length=5000)
    evaluation_criteria: List[EvaluationCriterionInput] = Field(..., min_length=1)
    pass_threshold: float = Field(7.0, ge=1.0, le=10.0)
    badge_level: str = Field("verified", description="verified | advanced | expert | master")
    time_limit_minutes: Optional[int] = Field(None, ge=5, le=10080)


class UpdateChallengeRequest(BaseModel):
    """PATCH /skill-challenges/{challenge_id}  [Admin]"""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=1000)
    instructions: Optional[str] = Field(None, min_length=20, max_length=5000)
    pass_threshold: Optional[float] = Field(None, ge=1.0, le=10.0)
    badge_level: Optional[str] = None
    time_limit_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class ChallengeListItem(BaseModel):
    challenge_id: str
    title: str
    description: str
    skill_category: str
    difficulty: str
    challenge_type: str
    badge_level: str
    pass_threshold: float
    time_limit_minutes: Optional[int] = None
    submission_count: int
    average_score: float
    pass_rate: float
    criteria_count: int
    created_at: datetime


class ChallengeListResponse(BaseModel):
    challenges: List[ChallengeListItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class ChallengeDetailResponse(BaseModel):
    challenge_id: str
    title: str
    description: str
    skill_category: str
    difficulty: str
    challenge_type: str
    instructions: str
    badge_level: str
    pass_threshold: float
    time_limit_minutes: Optional[int] = None
    evaluation_criteria: List[EvaluationCriterionDetail]
    submission_count: int
    average_score: float
    pass_rate: float
    created_at: datetime


# ── Submission schemas ────────────────────────────────────────────────────────

class SubmitChallengeRequest(BaseModel):
    """POST /skill-challenges/{challenge_id}/submit"""
    content_type: str = Field(
        ...,
        description="file_url | text | link"
    )
    value: str = Field(..., min_length=1, description="URL, text content, or external link")
    notes: Optional[str] = Field(None, max_length=1000)


class EvaluateSubmissionRequest(BaseModel):
    """PATCH /skill-challenges/submissions/{submission_id}/evaluate  [Admin]"""
    criterion_scores: List[CriterionScoreInput] = Field(..., min_length=1)
    evaluator_notes: Optional[str] = Field(None, max_length=2000)


class SubmissionListItem(BaseModel):
    submission_id: str
    challenge_id: str
    challenge_title: str
    skill_category: Optional[str] = None
    difficulty: Optional[str] = None
    evaluation_status: str
    overall_score: Optional[float] = None
    pass_threshold: float
    badge_awarded: bool
    attempt_number: int
    submitted_at: datetime
    evaluated_at: Optional[datetime] = None


class SubmissionListResponse(BaseModel):
    submissions: List[SubmissionListItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class PendingSubmissionItem(BaseModel):
    submission_id: str
    challenge_id: str
    challenge_title: str
    skill_category: Optional[str] = None
    difficulty: Optional[str] = None
    user_id: str
    username: str
    content_type: str
    submission_url: str
    submission_notes: Optional[str] = None
    attempt_number: int
    submitted_at: datetime


class PendingSubmissionsResponse(BaseModel):
    submissions: List[PendingSubmissionItem]
    total: int
    limit: int
    offset: int
    has_more: bool


# ── Badge schemas ─────────────────────────────────────────────────────────────

class BadgeListItem(BaseModel):
    badge_id: str
    skill_name: str
    badge_level: str
    challenge_title: str
    challenge_difficulty: Optional[str] = None
    awarded_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool


class BadgeListResponse(BaseModel):
    badges: List[BadgeListItem]
    total: int


class RevokeBadgeRequest(BaseModel):
    """PATCH /skill-challenges/badges/{badge_id}/revoke  [Admin]"""
    reason: str = Field(..., min_length=5, max_length=500)


# ── Generic action responses ──────────────────────────────────────────────────

class ChallengeActionResponse(BaseModel):
    success: bool
    message: str
    challenge_id: Optional[str] = None


class SubmissionActionResponse(BaseModel):
    success: bool
    submission_id: Optional[str] = None
    evaluation_status: Optional[str] = None
    overall_score: Optional[float] = None
    pass_threshold: Optional[float] = None
    passed: Optional[bool] = None
    badge_awarded: Optional[bool] = None
    badge_info: Optional[Any] = None
    message: str


class BadgeActionResponse(BaseModel):
    success: bool
    badge_id: Optional[str] = None
    message: str