"""
Spectrum Guarantee — Escrow & Dispute Models
=============================================

Collections
-----------
Escrow        — Holds client funds locked per project/milestone until
                released, refunded, or disputed.
Dispute       — Raised by either party when work or payment is contested.
GuaranteeFund — Platform-level safety fund that backs disputed payouts.

Escrow lifecycle
----------------
  create_escrow   → active
  fund_milestone  → milestone.status = funded
  release_milestone → milestone.status = released  → Transaction created
  raise_dispute   → disputed
  resolve_dispute → resolved (admin)
  refund_escrow   → refunded (full cancel)
  all released    → completed

Dispute lifecycle
-----------------
  raise_dispute   → open
  assign_reviewer → under_review
  resolve         → resolved_creator_favor | resolved_client_favor | escalated
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from beanie import Document, PydanticObjectId
import uuid


# ── Escrow sub-models ─────────────────────────────────────────────────────────

class EscrowMilestone(BaseModel):
    """
    A single funded milestone within an escrow.
    Milestones map 1-to-1 with ProjectDeadlines when linked.
    """
    milestone_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    amount: float
    currency: str = "USD"

    # Status machine: funded → released | disputed | refunded
    status: str = "pending"
    # pending   – defined but not yet funded by client
    # funded    – client has deposited funds
    # released  – client approved, funds sent to creator
    # disputed  – dispute raised on this milestone
    # refunded  – funds returned to client

    funded_at:   Optional[datetime] = None
    released_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None

    # Optional link to a ProjectDeadline document
    deadline_id: Optional[str] = None

    # Transaction ID created when released
    release_transaction_id: Optional[str] = None


# ── Escrow Document ───────────────────────────────────────────────────────────

class Escrow(Document):
    """
    Project escrow — one per project (or per job post if no project yet).

    The client deposits funds per milestone. Funds stay locked until
    the client explicitly releases them after approving delivered work,
    or until an admin resolves a dispute.
    """

    # Parties
    client_id:  PydanticObjectId
    creator_id: PydanticObjectId

    # Optional links
    project_id:  Optional[PydanticObjectId] = None
    job_post_id: Optional[PydanticObjectId] = None

    # Financials
    total_amount:  float         # Sum of all milestone amounts
    funded_amount: float = 0.0   # How much has actually been deposited
    released_amount: float = 0.0 # How much has been released to creator
    refunded_amount: float = 0.0 # How much has been refunded to client
    currency: str = "USD"

    # Milestones
    milestones: List[EscrowMilestone] = Field(default_factory=list)

    # Status
    # active → completed | disputed | refunded | cancelled
    status: str = "active"

    # Timestamps
    created_at:   datetime = Field(default_factory=datetime.utcnow)
    updated_at:   datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    # Notes
    description: Optional[str] = None  # What this escrow covers

    class Settings:
        name = "escrows"
        indexes = [
            "client_id",
            "creator_id",
            "project_id",
            "job_post_id",
            "status",
            "created_at",
            [("client_id",  1), ("status", 1)],
            [("creator_id", 1), ("status", 1)],
        ]


# ── Dispute sub-models ────────────────────────────────────────────────────────

class DisputeEvidence(BaseModel):
    """A single piece of evidence submitted by either party."""
    submitted_by: PydanticObjectId
    evidence_type: str          # "screenshot", "document", "video", "message_log", "other"
    url: str                    # Storage URL
    description: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


# ── Dispute Document ──────────────────────────────────────────────────────────

class Dispute(Document):
    """
    A dispute raised by client or creator over an escrow milestone.

    Either party can raise a dispute. An admin (reviewer) is assigned
    to investigate, review evidence, and issue a resolution.
    """

    # Links
    escrow_id:     PydanticObjectId
    project_id:    Optional[PydanticObjectId] = None
    milestone_id:  Optional[str] = None          # EscrowMilestone.milestone_id

    # Parties
    raised_by:      PydanticObjectId  # User who raised the dispute
    raised_against: PydanticObjectId  # Other party

    # Dispute details
    reason: str                       # Short reason code or description
    details: Optional[str] = None     # Longer explanation from raiser

    # Evidence
    evidence: List[DisputeEvidence] = Field(default_factory=list)

    # Status machine
    # open → under_review → resolved_creator_favor | resolved_client_favor | escalated
    status: str = "open"

    # Resolution
    assigned_reviewer_id: Optional[PydanticObjectId] = None
    resolution_notes:     Optional[str] = None
    resolution_amount:    Optional[float] = None  # Actual amount paid out
    resolution_type: Optional[str] = None
    # full_refund | partial_refund | release_to_creator | split

    # Guarantee fund payout (if platform covered the gap)
    guarantee_fund_used:   bool = False
    guarantee_fund_amount: float = 0.0

    # Timestamps
    created_at:  datetime = Field(default_factory=datetime.utcnow)
    updated_at:  datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

    class Settings:
        name = "disputes"
        indexes = [
            "escrow_id",
            "project_id",
            "raised_by",
            "raised_against",
            "status",
            "assigned_reviewer_id",
            "created_at",
        ]


# ── GuaranteeFund Document ────────────────────────────────────────────────────

class FundContribution(BaseModel):
    """A single inflow into the guarantee fund."""
    amount:         float
    source:         str               # "commission_margin", "penalty", "manual"
    reference_id:   Optional[str] = None
    contributed_at: datetime = Field(default_factory=datetime.utcnow)


class FundPayout(BaseModel):
    """A single outflow from the guarantee fund."""
    amount:     float
    dispute_id: PydanticObjectId
    paid_to:    PydanticObjectId      # User who received the payout
    paid_at:    datetime = Field(default_factory=datetime.utcnow)
    notes:      Optional[str] = None


class GuaranteeFund(Document):
    """
    Platform-level safety fund — single document (singleton).

    Funded from a portion of each platform commission.
    Pays out when a dispute is resolved in a user's favour but the
    other party's funds are insufficient.
    """
    balance:  float = 0.0
    currency: str = "USD"

    contributions: List[FundContribution] = Field(default_factory=list)
    payouts:       List[FundPayout]       = Field(default_factory=list)

    total_contributed: float = 0.0
    total_paid_out:    float = 0.0

    last_updated: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "guarantee_fund"