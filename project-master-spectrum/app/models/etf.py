"""
ETF (Earn-Trust Fund) Models

Locked financial vault system that rewards verified users with real-currency
deposits funded from Spectrum's commission margin. Vaults mature after 5 years.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from beanie import Document, PydanticObjectId


# ============================================================================
# EMBEDDED SUB-MODELS
# ============================================================================

class VaultContributionEntry(BaseModel):
    """
    Inline summary entry stored directly on the vault document.
    Provides a quick snapshot without querying the ETFContribution collection.
    """
    amount: float
    source_type: str  # project_completion, milestone, skill_challenge, bonus
    source_id: Optional[PydanticObjectId] = None
    earned_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# ETF VAULT — One per user
# ============================================================================

class ETFVault(Document):
    """
    The user's locked trust fund vault.

    - One vault per user (created on first qualifying contribution).
    - Balance grows with each completed project / milestone.
    - Funds are locked until ``maturity_date`` (5 years from creation).
    - Early departure triggers partial forfeiture.
    """
    user_id: PydanticObjectId
    total_balance: float = 0.0
    currency: str = "USD"
    contributions: List[VaultContributionEntry] = Field(default_factory=list)
    contribution_count: int = 0

    # Maturity
    maturity_date: datetime  # set to created_at + 5 years on creation
    status: str = "active"  # active, matured, forfeited, partially_claimed, fully_claimed

    # Claim / forfeiture tracking
    claimed_amount: float = 0.0
    forfeited_amount: float = 0.0

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "etf_vaults"
        indexes = [
            "user_id",
            "status",
            "maturity_date",
        ]


# ============================================================================
# ETF CONTRIBUTION — Immutable ledger of every deposit
# ============================================================================

class ETFContribution(Document):
    """
    Immutable record of a single contribution into a user's vault.

    Never updated after creation — serves as the auditable source of truth
    for how every dollar entered the vault.
    """
    user_id: PydanticObjectId
    vault_id: PydanticObjectId
    amount: float
    currency: str = "USD"

    source_type: str  # project_completion, milestone, skill_challenge, bonus
    source_id: Optional[PydanticObjectId] = None
    description: Optional[str] = None

    # Snapshot of user's trust metrics at contribution time
    trust_score_at_time: Optional[float] = None
    verification_level_at_time: Optional[str] = None  # none, email, identity, premium

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "etf_contributions"
        indexes = [
            "user_id",
            "vault_id",
            "source_type",
            "source_id",
            "created_at",
        ]


# ============================================================================
# ETF LEDGER — Double-entry-style accounting log
# ============================================================================

class ETFLedger(Document):
    """
    Internal accounting ledger entry.

    Every balance-changing event (contribution, forfeiture, claim,
    reinvestment) gets a ledger row so the vault's ``total_balance``
    can be reconstructed from scratch if needed.
    """
    vault_id: PydanticObjectId
    user_id: PydanticObjectId

    entry_type: str  # contribution, forfeiture, claim, reinvestment
    amount: float  # positive for inflows, negative for outflows
    balance_after: float  # vault balance after this entry
    description: Optional[str] = None

    # Optional link back to the contribution / transaction that caused this
    reference_id: Optional[PydanticObjectId] = None
    reference_type: Optional[str] = None  # etf_contribution, transaction, manual

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "etf_ledger"
        indexes = [
            "vault_id",
            "user_id",
            "entry_type",
            "created_at",
        ]