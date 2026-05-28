"""
ETF (Earn-Trust Fund) API Schemas

Request and response models for the ETF router endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============================================================================
# CONTRIBUTION SCHEMAS
# ============================================================================

class ContributionRead(BaseModel):
    """Single contribution entry returned to the client."""
    id: str
    amount: float
    currency: str = "USD"
    source_type: str
    source_id: Optional[str] = None
    description: Optional[str] = None
    trust_score_at_time: Optional[float] = None
    verification_level_at_time: Optional[str] = None
    created_at: datetime


class ContributionListResponse(BaseModel):
    """Paginated list of contributions."""
    contributions: List[ContributionRead]
    total: int
    page: int
    page_size: int
    has_more: bool


# ============================================================================
# VAULT SCHEMAS
# ============================================================================

class VaultSummaryResponse(BaseModel):
    """Dashboard-friendly vault overview."""
    vault_id: str
    status: str
    total_balance: float
    currency: str
    contribution_count: int
    claimed_amount: float
    forfeited_amount: float
    maturity_date: datetime
    days_until_maturity: int
    is_matured: bool
    created_at: datetime
    updated_at: datetime


class VaultProjectionResponse(BaseModel):
    """Estimated future vault value based on current trajectory."""
    current_balance: float
    currency: str
    avg_monthly_contribution: float
    projected_balance_at_maturity: float
    maturity_date: datetime
    months_remaining: int
    projection_basis: str  # e.g. "Based on last 6 months of activity"


# ============================================================================
# CLAIM / REINVEST SCHEMAS
# ============================================================================

class ClaimRequest(BaseModel):
    """Request to claim matured vault funds."""
    amount: Optional[float] = Field(
        None,
        gt=0,
        description="Amount to claim. If omitted, claims entire matured balance."
    )
    payout_method: str = Field(
        ...,
        description="Payout method: bank_transfer, paypal, stripe"
    )


class ClaimResponse(BaseModel):
    """Result of a claim operation."""
    success: bool
    claimed_amount: float
    remaining_balance: float
    currency: str
    payout_method: str
    transaction_id: Optional[str] = None
    message: str


class ReinvestRequest(BaseModel):
    """Request to reinvest matured funds into premium services."""
    amount: float = Field(..., gt=0, description="Amount to reinvest")
    target: str = Field(
        ...,
        description="What to reinvest into: profile_boost, service_boost, subscription_upgrade"
    )


class ReinvestResponse(BaseModel):
    """Result of a reinvestment operation."""
    success: bool
    reinvested_amount: float
    remaining_balance: float
    currency: str
    target: str
    message: str


# ============================================================================
# NO-VAULT RESPONSE
# ============================================================================

class NoVaultResponse(BaseModel):
    """Returned when a user has no ETF vault yet."""
    has_vault: bool = False
    message: str = "No ETF vault found. Complete your first project to start earning trust rewards."