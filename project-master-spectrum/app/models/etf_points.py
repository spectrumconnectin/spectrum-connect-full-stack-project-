"""
ETF Points Models — Earn Trust Framework
=========================================
Points-based trust and loyalty layer.

This is a separate concept from `app/models/etf.py` (the ETF vault, which
stores a USD-denominated trust reserve). The vault remains untouched and
continues to back any future cash-out — but it is internal-only and never
surfaced to end users. Everything users see is expressed in ETF Points.

  EtfPoints  — one document per user holding the live balance.
  EtfEvent   — append-only log of every points change with idempotency key
               so the same action can never be awarded twice.

Levels are computed from `lifetime_points` (not the current spendable balance)
so spending on rewards never demotes a user. Thresholds live in config.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field


# ─── Per-user balance ────────────────────────────────────────────────────────


class EtfPoints(Document):
    """Current ETF Points balance for one user.

    Two counters:
      - balance         : spendable points (can be redeemed or cashed out)
      - lifetime_points : total ever earned (drives level — never decreases)
    """

    user_id: PydanticObjectId

    balance: int = 0                 # current spendable points
    lifetime_points: int = 0         # total ever earned (drives level)
    redeemed_points: int = 0         # total ever spent on rewards
    cashed_out_points: int = 0       # total ever cashed out

    # Cached level so reads don't recompute on every dashboard hit.
    # Source of truth is still lifetime_points + config thresholds.
    level: str = "bronze"            # bronze | silver | gold | platinum

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "etf_points"
        indexes = ["user_id", "level"]


# ─── Append-only event log ───────────────────────────────────────────────────


class EtfEvent(Document):
    """Single ETF Points event — earn, spend, cash-out, or adjustment.

    Every event carries an `idempotency_key` so re-running the same source
    action (e.g. milestone release retried) can never double-award points.
    The key is a deterministic string built from (action, source_type, source_id).
    """

    user_id: PydanticObjectId

    # The action that triggered the event (taxonomy in EtfPointsService).
    action: str                      # e.g. "milestone.released", "project.completed"

    # Positive = earned, negative = spent / cashed out / clawback.
    points: int

    # Snapshot of balance AFTER this event for audit reconstruction.
    balance_after: int

    # What the event was associated with (project, milestone, review, etc.).
    source_type: Optional[str] = None
    source_id: Optional[str] = None  # opaque ID — stored as string for flexibility

    # Deterministic key to enforce one-event-per-source. Built by the service
    # from (action, source_type, source_id) when applicable. Free-form
    # awards (e.g. admin bonus) can use a generated UUID.
    idempotency_key: str

    # Human-readable description for the activity feed.
    description: str

    # Free-form payload — keep small. Useful for "Repeat client x3" kind of context.
    metadata: Optional[dict] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "etf_events"
        indexes = [
            "user_id",
            "action",
            "idempotency_key",
            [("user_id", 1), ("created_at", -1)],
        ]


# ─── Public read schemas (for API responses) ─────────────────────────────────


class EtfLevelInfo(BaseModel):
    """The level + progress info shown on dashboards and badges."""
    name: str                        # "bronze" | "silver" | "gold" | "platinum"
    label: str                       # "Bronze" | "Silver" | "Gold" | "Platinum"
    icon: str                        # Font Awesome icon hint, e.g. "fa-medal"
    color: str                       # Hex color hint for the UI
    min_points: int                  # lifetime points required for this level
    next_min_points: Optional[int]   # threshold for the next level (None at top)
    progress_pct: int                # 0–100 — distance to next level


class EtfBalanceRead(BaseModel):
    """Compact public read for /etf/me and /etf/badge."""
    user_id: str
    balance: int
    lifetime_points: int
    redeemed_points: int
    level: EtfLevelInfo
    updated_at: Optional[datetime] = None


class EtfEventRead(BaseModel):
    """Single event for the activity feed."""
    id: str
    action: str
    points: int
    balance_after: int
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    description: str
    created_at: datetime
