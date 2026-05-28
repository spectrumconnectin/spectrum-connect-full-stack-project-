"""
Spectrum Guarantee — Escrow & Dispute Schemas
=============================================
Request / response models for /escrow and /disputes endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime


# ── Shared ────────────────────────────────────────────────────────────────────

class MilestoneInput(BaseModel):
    """One milestone definition when creating an escrow."""
    title: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0, description="Amount in USD")
    deadline_id: Optional[str] = Field(None, description="Optional ProjectDeadline ID")


class MilestoneDetail(BaseModel):
    """Milestone as returned in escrow detail."""
    milestone_id: str
    title: str
    amount: float
    status: str
    funded_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    release_transaction_id: Optional[str] = None
    deadline_id: Optional[str] = None


class UserBrief(BaseModel):
    user_id: str
    username: str
    profile_picture: Optional[str] = None


# ── Escrow schemas ────────────────────────────────────────────────────────────

class CreateEscrowRequest(BaseModel):
    """POST /escrow/"""
    creator_id: str = Field(..., description="User ID of the creator/freelancer")
    milestones: List[MilestoneInput] = Field(..., min_length=1)
    project_id: Optional[str] = None
    job_post_id: Optional[str] = None
    description: Optional[str] = Field(None, max_length=500)
    currency: str = Field("USD", description="ISO 4217 currency code")


class FundMilestoneRequest(BaseModel):
    """POST /escrow/{escrow_id}/fund-milestone"""
    milestone_id: str


class ReleaseMilestoneRequest(BaseModel):
    """POST /escrow/{escrow_id}/release-milestone"""
    milestone_id: str


class RefundEscrowRequest(BaseModel):
    """POST /escrow/{escrow_id}/refund"""
    reason: Optional[str] = Field(None, max_length=500)


class EscrowDetailResponse(BaseModel):
    """GET /escrow/{escrow_id}"""
    escrow_id: str
    status: str
    total_amount: float
    funded_amount: float
    released_amount: float
    refunded_amount: float
    currency: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    client: Optional[UserBrief] = None
    creator: Optional[UserBrief] = None
    milestones: List[MilestoneDetail] = []
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class EscrowListItem(BaseModel):
    """One row in GET /escrow/my-escrows"""
    escrow_id: str
    status: str
    total_amount: float
    funded_amount: float
    released_amount: float
    currency: str
    project_id: Optional[str] = None
    client_id: str
    creator_id: str
    milestone_count: int
    funded_milestones: int
    released_milestones: int
    created_at: datetime


class EscrowListResponse(BaseModel):
    """GET /escrow/my-escrows"""
    escrows: List[EscrowListItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class EscrowActionResponse(BaseModel):
    """Generic success response for escrow actions."""
    success: bool
    escrow_id: str
    message: str


# ── Dispute schemas ───────────────────────────────────────────────────────────

class CreateDisputeRequest(BaseModel):
    """POST /disputes/"""
    escrow_id: str
    reason: str = Field(..., min_length=5, max_length=500)
    details: Optional[str] = Field(None, max_length=2000)
    milestone_id: Optional[str] = None


class SubmitEvidenceRequest(BaseModel):
    """POST /disputes/{dispute_id}/evidence"""
    evidence_type: str = Field(
        ...,
        description="screenshot | document | video | message_log | other",
    )
    url: str = Field(..., description="URL to the uploaded evidence file")
    description: str = Field(..., min_length=5, max_length=500)


class ResolveDisputeRequest(BaseModel):
    """PATCH /disputes/{dispute_id}/resolve  [Admin only]"""
    resolution_type: str = Field(
        ...,
        description="full_refund | partial_refund | release_to_creator | split",
    )
    resolution_notes: str = Field(..., min_length=10, max_length=2000)
    resolution_amount: Optional[float] = Field(
        None,
        description="Required for partial_refund and split — amount going to client",
    )


class EvidenceDetail(BaseModel):
    submitted_by: str
    evidence_type: str
    url: str
    description: str
    uploaded_at: datetime


class DisputeDetailResponse(BaseModel):
    """GET /disputes/{dispute_id}"""
    dispute_id: str
    escrow_id: str
    project_id: Optional[str] = None
    milestone_id: Optional[str] = None
    status: str
    reason: str
    details: Optional[str] = None
    raised_by: Optional[Any] = None
    raised_against: Optional[Any] = None
    assigned_reviewer: Optional[Any] = None
    evidence: List[EvidenceDetail] = []
    resolution_type: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolution_amount: Optional[float] = None
    guarantee_fund_used: bool = False
    created_at: datetime
    resolved_at: Optional[datetime] = None


class DisputeListItem(BaseModel):
    dispute_id: str
    escrow_id: str
    status: str
    reason: str
    raised_by: str
    raised_against: str
    resolution_type: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    evidence_count: int


class DisputeListResponse(BaseModel):
    disputes: List[DisputeListItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class DisputeActionResponse(BaseModel):
    success: bool
    dispute_id: str
    message: str


# ── Admin dispute list (extra field) ─────────────────────────────────────────

class AdminDisputeListItem(BaseModel):
    dispute_id: str
    escrow_id: str
    status: str
    reason: str
    raised_by_username: str
    is_assigned: bool
    evidence_count: int
    created_at: datetime
    resolved_at: Optional[datetime] = None


class AdminDisputeListResponse(BaseModel):
    disputes: List[AdminDisputeListItem]
    total: int
    limit: int
    offset: int
    has_more: bool