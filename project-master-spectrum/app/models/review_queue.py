"""
Review Queue Models
===================
Freelancer Quality Review Team — MongoDB documents.

Collections
-----------
review_queue  — one document per review submission (creator → admin pipeline).

Review lifecycle
----------------
  creator submits → pending
  admin picks up  → in_review
  admin decides   → approved | rejected
  creator fixes   → resubmitted  (max 3 times)
  if 3 rejections → permanently_rejected
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from beanie import Document, PydanticObjectId


# ── Embedded sub-models ───────────────────────────────────────────────────────

class RejectionReason(BaseModel):
    """Structured reason used when an admin rejects a submission."""
    code: str           # e.g. "incomplete_portfolio", "invalid_id", "low_quality_work"
    description: str    # human-readable explanation


class ScoreBreakdown(BaseModel):
    """Per-category scores assigned by the reviewer (each 1-10)."""
    portfolio_score: Optional[int] = None       # Quality of portfolio/work samples
    credential_score: Optional[int] = None      # ID, certifications, qualifications
    communication_score: Optional[int] = None   # Profile completeness, bio clarity


# ── Main Document ─────────────────────────────────────────────────────────────

class ReviewQueue(Document):
    """
    One review submission per creator.

    A creator can resubmit up to ``max_resubmissions`` times after rejection.
    Each resubmission increments ``resubmission_count`` and resets status to
    ``resubmitted`` (treated as ``pending`` by the queue).
    """

    # Parties
    user_id: PydanticObjectId                       # Creator being reviewed
    reviewer_id: Optional[PydanticObjectId] = None  # Admin who picks it up

    # Status machine
    # pending → in_review → approved | rejected → resubmitted → ...
    status: str = "pending"   # pending | in_review | approved | rejected
                              # | resubmitted | permanently_rejected

    # Timestamps
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    picked_up_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    resubmitted_at: Optional[datetime] = None

    # Reviewer notes (internal, not shown to creator)
    review_notes: Optional[str] = None

    # Rejection detail (shared with creator on rejection)
    rejection_reasons: List[RejectionReason] = Field(default_factory=list)
    rejection_feedback: Optional[str] = None   # Structured text sent to creator

    # Fee tracking
    verification_fee_paid: bool = False
    verification_fee_amount: Optional[float] = None
    verification_fee_transaction_id: Optional[str] = None

    # Scores (filled by reviewer)
    scores: Optional[ScoreBreakdown] = None

    # Decision
    overall_decision: Optional[str] = None    # "approved" | "rejected"

    # Resubmission control
    resubmission_count: int = 0
    max_resubmissions: int = 3

    # Submission content snapshot
    # Stores URLs / notes the creator provided at submission time
    submitted_portfolio_urls: List[str] = Field(default_factory=list)
    submitted_notes: Optional[str] = None      # Any message from creator

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "review_queue"
        indexes = [
            "user_id",
            "reviewer_id",
            "status",
            "submitted_at",
            [("status", 1), ("submitted_at", 1)],   # queue listing
            [("user_id", 1), ("status", 1)],         # creator status lookup
        ]