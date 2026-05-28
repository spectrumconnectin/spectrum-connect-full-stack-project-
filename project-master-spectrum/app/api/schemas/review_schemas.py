"""
Review Queue API Schemas
========================
Request / response models for the Freelancer Quality Review Team module.

Creator-facing  : SubmitForReviewRequest, ReviewStatusResponse
Admin-facing    : AssignReviewerRequest, ApproveReviewRequest,
                  RejectReviewRequest, QueueListResponse, QueueStatsResponse
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ── Shared sub-schemas ────────────────────────────────────────────────────────

class RejectionReasonSchema(BaseModel):
    code: str = Field(..., description="Machine-readable reason code")
    description: str = Field(..., description="Human-readable explanation")


class ScoreBreakdownSchema(BaseModel):
    portfolio_score: Optional[int] = Field(None, ge=1, le=10)
    credential_score: Optional[int] = Field(None, ge=1, le=10)
    communication_score: Optional[int] = Field(None, ge=1, le=10)


# ── Creator-facing schemas ────────────────────────────────────────────────────

class SubmitForReviewRequest(BaseModel):
    """POST /profiles/me/submit-for-review"""
    portfolio_urls: List[str] = Field(
        default_factory=list,
        description="URLs to work samples or portfolio pieces (max 10)",
        max_length=10,
    )
    notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional message to the review team",
    )


class ReviewStatusResponse(BaseModel):
    """GET /profiles/me/review-status"""
    has_submission: bool
    status: Optional[str] = None          # pending | in_review | approved | rejected | resubmitted
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    resubmitted_at: Optional[datetime] = None
    resubmission_count: int = 0
    max_resubmissions: int = 3
    resubmissions_remaining: int = 3
    rejection_feedback: Optional[str] = None
    rejection_reasons: List[RejectionReasonSchema] = []
    can_resubmit: bool = False
    review_id: Optional[str] = None


# ── Admin — single review detail ─────────────────────────────────────────────

class ReviewerSummary(BaseModel):
    reviewer_id: str
    username: str
    email: str


class CreatorSummary(BaseModel):
    user_id: str
    username: str
    email: str
    account_type: str
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = []
    is_verified: bool = False
    spectrum_tier: str = "bronze"


class ReviewDetailResponse(BaseModel):
    """GET /admin/reviews/{review_id}"""
    review_id: str
    status: str
    creator: CreatorSummary
    reviewer: Optional[ReviewerSummary] = None
    submitted_at: datetime
    picked_up_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    resubmitted_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    rejection_reasons: List[RejectionReasonSchema] = []
    rejection_feedback: Optional[str] = None
    scores: Optional[ScoreBreakdownSchema] = None
    overall_decision: Optional[str] = None
    resubmission_count: int = 0
    max_resubmissions: int = 3
    verification_fee_paid: bool = False
    verification_fee_amount: Optional[float] = None
    submitted_portfolio_urls: List[str] = []
    submitted_notes: Optional[str] = None


# ── Admin — queue list ────────────────────────────────────────────────────────

class ReviewQueueItem(BaseModel):
    """One row in the admin queue list."""
    review_id: str
    status: str
    creator_id: str
    creator_username: str
    creator_email: str
    creator_account_type: str
    submitted_at: datetime
    picked_up_at: Optional[datetime] = None
    resubmission_count: int = 0
    is_assigned: bool = False
    reviewer_username: Optional[str] = None


class QueueListResponse(BaseModel):
    """GET /admin/reviews/queue"""
    reviews: List[ReviewQueueItem]
    total: int
    pending_count: int
    in_review_count: int
    limit: int
    offset: int
    has_more: bool


# ── Admin — actions ───────────────────────────────────────────────────────────

class AssignReviewerRequest(BaseModel):
    """PATCH /admin/reviews/{review_id}/assign — admin self-assigns."""
    # No body needed — admin ID comes from JWT token.
    # Keeping schema for extensibility (e.g. assign to another admin later).
    pass


class ApproveReviewRequest(BaseModel):
    """PATCH /admin/reviews/{review_id}/approve"""
    review_notes: Optional[str] = Field(
        None, max_length=2000,
        description="Internal notes visible only to admins",
    )
    scores: Optional[ScoreBreakdownSchema] = None
    verification_type: str = Field(
        "standard",
        description="Verification level granted: basic | standard | premium | elite",
    )


class RejectReviewRequest(BaseModel):
    """PATCH /admin/reviews/{review_id}/reject"""
    rejection_reasons: List[RejectionReasonSchema] = Field(
        ..., min_length=1,
        description="At least one structured rejection reason required",
    )
    rejection_feedback: str = Field(
        ..., min_length=10, max_length=2000,
        description="Constructive feedback sent to the creator",
    )
    review_notes: Optional[str] = Field(
        None, max_length=2000,
        description="Internal notes (not shown to creator)",
    )
    scores: Optional[ScoreBreakdownSchema] = None


class ActionResponse(BaseModel):
    """Generic success response for admin actions."""
    success: bool
    message: str
    review_id: str
    new_status: str


# ── Admin — stats ─────────────────────────────────────────────────────────────

class QueueStatsResponse(BaseModel):
    """GET /admin/reviews/stats"""
    total_submissions: int
    pending: int
    in_review: int
    approved: int
    rejected: int
    resubmitted: int
    permanently_rejected: int
    approval_rate: float          # 0.0 – 1.0
    avg_review_time_hours: Optional[float] = None
    total_this_week: int
    total_this_month: int