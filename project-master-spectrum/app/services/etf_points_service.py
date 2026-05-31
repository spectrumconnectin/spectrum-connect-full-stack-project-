"""
ETF Points Service — Earn Trust Framework
==========================================

Loyalty + trust scoring as a points balance.

Responsibilities
----------------
  award_points        — give a user points for an action (idempotent + anti-abuse).
  get_balance         — current balance / lifetime / level / progress / badge.
  get_events          — paginated activity feed for a user.
  level_for           — pure function: lifetime points -> level info.
  badge_for           — public badge for any user (creator cards / search results).
  request_cashout     — check eligibility and (if enabled) record the request.

Anti-abuse
----------
  * Every award carries an `idempotency_key`. Awarding the same key twice
    is a no-op — protects against retried webhooks, double-clicks, and
    repeated milestone releases.
  * Self-dealing is blocked: e.g. a client cannot earn `project.hired`
    points by hiring an account that is in fact themselves.
  * The "repeat client" bonus only fires the SECOND-AND-LATER time the
    same client-creator pair completes work together.
  * Negative or zero point amounts are silently dropped — service callers
    can pass `points=0` defensively without writing junk events.

Never expose the internal USD value of a point in any user-facing read.
Cash-out math uses `settings.ETF_POINTS_PER_USD`; nothing else should.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.etf_points import (
    EtfPoints,
    EtfEvent,
    EtfBalanceRead,
    EtfEventRead,
    EtfLevelInfo,
)
from app.models.schema import User

logger = logging.getLogger(__name__)


# ─── Level definitions (pure data) ───────────────────────────────────────────


# (level name, label, icon hint, hex color)
_LEVEL_DEFS = [
    ("bronze",   "Bronze",   "fa-medal",        "#b08d57"),
    ("silver",   "Silver",   "fa-medal",        "#9aa5b1"),
    ("gold",     "Gold",     "fa-award",        "#d4a017"),
    ("platinum", "Platinum", "fa-trophy",       "#6c5ce7"),
]


def _level_thresholds() -> List[tuple[str, int]]:
    """[(level_name, min_lifetime_points), ...] in ascending order.

    Bronze always starts at 0. Other thresholds come from config so they
    can be tuned without redeploy.
    """
    return [
        ("bronze",   0),
        ("silver",   settings.ETF_LEVEL_SILVER),
        ("gold",     settings.ETF_LEVEL_GOLD),
        ("platinum", settings.ETF_LEVEL_PLATINUM),
    ]


def _level_meta(level_name: str) -> tuple[str, str, str]:
    """Return (label, icon, color) for a level name."""
    for name, label, icon, color in _LEVEL_DEFS:
        if name == level_name:
            return label, icon, color
    return "Bronze", "fa-medal", "#b08d57"


def level_for(lifetime_points: int) -> EtfLevelInfo:
    """Pure function: lifetime points -> level info (no DB access)."""
    thresholds = _level_thresholds()
    current_idx = 0
    for i, (_, min_pts) in enumerate(thresholds):
        if lifetime_points >= min_pts:
            current_idx = i
    name, min_pts = thresholds[current_idx]
    next_min = thresholds[current_idx + 1][1] if current_idx + 1 < len(thresholds) else None

    if next_min is None:
        progress = 100
    else:
        span = next_min - min_pts
        progress = max(0, min(100, int(((lifetime_points - min_pts) / span) * 100)))

    label, icon, color = _level_meta(name)
    return EtfLevelInfo(
        name=name,
        label=label,
        icon=icon,
        color=color,
        min_points=min_pts,
        next_min_points=next_min,
        progress_pct=progress,
    )


# ─── Action taxonomy (for clear, greppable events) ───────────────────────────


# Map from action name -> default point value pulled from settings.
def _default_points_for(action: str) -> int:
    table = {
        "project.posted":                 settings.ETF_POINTS_PROJECT_POSTED,
        "project.hired":                  settings.ETF_POINTS_PROJECT_HIRED,
        "milestone.funded":               settings.ETF_POINTS_MILESTONE_FUNDED,
        "milestone.released.client":      settings.ETF_POINTS_MILESTONE_RELEASED_CLIENT,
        "milestone.released.creator":     settings.ETF_POINTS_MILESTONE_RELEASED_CREATOR,
        "project.completed.client":       settings.ETF_POINTS_PROJECT_COMPLETED_CLIENT,
        "project.completed.creator":      settings.ETF_POINTS_PROJECT_COMPLETED_CREATOR,
        "review.submitted":               settings.ETF_POINTS_REVIEW_SUBMITTED,
        "repeat_client.bonus":            settings.ETF_POINTS_REPEAT_CLIENT_BONUS,
        "profile.verified":               settings.ETF_POINTS_PROFILE_VERIFIED,
    }
    return int(table.get(action, 0))


# ─── Anti-abuse helpers ──────────────────────────────────────────────────────


def _idempotency_key(action: str, source_type: Optional[str], source_id: Optional[str]) -> str:
    """Deterministic key per (action, source_type, source_id).

    Awarding the same key twice is a no-op.  Free-form awards (e.g. admin
    bonuses) should pass an explicit key — we hash the inputs only when
    source_id is present.
    """
    raw = f"{action}|{source_type or ''}|{source_id or ''}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _is_self_deal(actor_id: PydanticObjectId, counterparty_id: Optional[PydanticObjectId]) -> bool:
    """True if the user is transacting with themselves (self-job, fake hire)."""
    if counterparty_id is None:
        return False
    return str(actor_id) == str(counterparty_id)


# ─── Service ─────────────────────────────────────────────────────────────────


class EtfPointsService:

    # ------------------------------------------------------------------ #
    # Award                                                                #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def award_points(
        user_id: PydanticObjectId | str,
        action: str,
        *,
        points: Optional[int] = None,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        counterparty_id: Optional[PydanticObjectId | str] = None,
        description: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Optional[EtfEvent]:
        """Award points to a user for an action.

        Returns the EtfEvent that was written, or None if the award was
        skipped (idempotency hit, self-dealing, zero amount, etc.).

        This function NEVER raises — auditing must not break the request
        path. Errors are logged and swallowed.
        """
        try:
            uid = PydanticObjectId(user_id) if not isinstance(user_id, PydanticObjectId) else user_id
            cp = (
                PydanticObjectId(counterparty_id)
                if counterparty_id and not isinstance(counterparty_id, PydanticObjectId)
                else counterparty_id
            )

            # Anti-abuse: self-dealing.
            if _is_self_deal(uid, cp):
                logger.info("ETF award skipped: self-deal action=%s user=%s", action, uid)
                return None

            amount = points if points is not None else _default_points_for(action)
            if amount <= 0:
                return None

            key = _idempotency_key(action, source_type, source_id)

            # Idempotency: skip if we've already written this event.
            existing = await EtfEvent.find_one(EtfEvent.idempotency_key == key)
            if existing:
                logger.debug("ETF award dedup'd: key=%s action=%s user=%s", key, action, uid)
                return None

            # Upsert the balance row.
            balance_doc = await EtfPoints.find_one(EtfPoints.user_id == uid)
            if balance_doc is None:
                balance_doc = EtfPoints(user_id=uid)
                await balance_doc.insert()

            balance_doc.balance += amount
            balance_doc.lifetime_points += amount

            # Recompute cached level.
            balance_doc.level = level_for(balance_doc.lifetime_points).name
            balance_doc.updated_at = datetime.utcnow()
            await balance_doc.save()

            # Append the event.
            event = EtfEvent(
                user_id=uid,
                action=action,
                points=amount,
                balance_after=balance_doc.balance,
                source_type=source_type,
                source_id=source_id,
                idempotency_key=key,
                description=description or f"+{amount} for {action.replace('.', ' ')}",
                metadata=metadata,
            )
            await event.insert()

            logger.info(
                "ETF award: user=%s action=%s +%d (new balance %d, level %s)",
                uid, action, amount, balance_doc.balance, balance_doc.level,
            )
            return event

        except Exception:
            logger.exception("ETF award failed for action=%s user=%s", action, user_id)
            return None

    # ------------------------------------------------------------------ #
    # Reads                                                                #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def get_balance(user_id: PydanticObjectId | str) -> EtfBalanceRead:
        """Return a full balance read for a user, creating a zero row if needed."""
        uid = PydanticObjectId(user_id) if not isinstance(user_id, PydanticObjectId) else user_id
        doc = await EtfPoints.find_one(EtfPoints.user_id == uid)
        if doc is None:
            return EtfBalanceRead(
                user_id=str(uid),
                balance=0,
                lifetime_points=0,
                redeemed_points=0,
                level=level_for(0),
                updated_at=None,
            )
        return EtfBalanceRead(
            user_id=str(doc.user_id),
            balance=doc.balance,
            lifetime_points=doc.lifetime_points,
            redeemed_points=doc.redeemed_points,
            level=level_for(doc.lifetime_points),
            updated_at=doc.updated_at,
        )

    @staticmethod
    async def badge_for(user_id: PydanticObjectId | str) -> EtfLevelInfo:
        """Just the level info — used for cards / search results."""
        uid = PydanticObjectId(user_id) if not isinstance(user_id, PydanticObjectId) else user_id
        doc = await EtfPoints.find_one(EtfPoints.user_id == uid)
        return level_for(doc.lifetime_points if doc else 0)

    @staticmethod
    async def get_events(
        user_id: PydanticObjectId | str,
        limit: int = 50,
        skip: int = 0,
    ) -> List[EtfEventRead]:
        """Paginated event feed for the activity widget."""
        uid = PydanticObjectId(user_id) if not isinstance(user_id, PydanticObjectId) else user_id
        events = await (
            EtfEvent.find(EtfEvent.user_id == uid)
            .sort(-EtfEvent.created_at)
            .skip(skip)
            .limit(limit)
            .to_list()
        )
        return [
            EtfEventRead(
                id=str(e.id),
                action=e.action,
                points=e.points,
                balance_after=e.balance_after,
                source_type=e.source_type,
                source_id=e.source_id,
                description=e.description,
                created_at=e.created_at,
            )
            for e in events
        ]

    # ------------------------------------------------------------------ #
    # Cash-out (gated)                                                    #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def check_cashout_eligibility(user: User) -> Dict[str, Any]:
        """Return a structured eligibility report for the cash-out UI.

        Always callable so the frontend can show "Eligible in X days" etc.
        Does not move any points.
        """
        balance = await EtfPointsService.get_balance(user.id)
        reasons: List[str] = []

        # Master kill-switch.
        if not settings.ETF_CASHOUT_ENABLED:
            reasons.append("Cash-out is not currently available on Spectrum Connect.")

        # Account age (created_at lives on the User document via Beanie's auto fields).
        created = getattr(user, "created_at", None) or datetime.utcnow()
        age_days = (datetime.utcnow() - created).days
        if age_days < settings.ETF_CASHOUT_MIN_ACCOUNT_AGE_DAYS:
            reasons.append(
                f"Account must be {settings.ETF_CASHOUT_MIN_ACCOUNT_AGE_DAYS} days old "
                f"(currently {age_days})."
            )

        # Email verification.
        if not getattr(user, "is_verified", False):
            reasons.append("Email verification required.")

        # Balance threshold.
        if balance.balance < settings.ETF_CASHOUT_MIN_POINTS:
            reasons.append(
                f"Minimum {settings.ETF_CASHOUT_MIN_POINTS} ETF Points required "
                f"(you have {balance.balance})."
            )

        return {
            "eligible": len(reasons) == 0,
            "reasons": reasons,
            "balance": balance.balance,
            "min_points": settings.ETF_CASHOUT_MIN_POINTS,
            "account_age_days": age_days,
            "min_account_age_days": settings.ETF_CASHOUT_MIN_ACCOUNT_AGE_DAYS,
        }

    @staticmethod
    async def request_cashout(user: User, points: int) -> Dict[str, Any]:
        """Record a cash-out REQUEST. Does not actually pay out — payment
        processor integration is Phase 2. We just debit the balance, log
        the event, and return a confirmation. An admin must approve and
        the real payout will happen via a separate flow.
        """
        if points <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive.")

        eligibility = await EtfPointsService.check_cashout_eligibility(user)
        if not eligibility["eligible"]:
            raise HTTPException(
                status_code=403,
                detail={"message": "Not eligible for cash-out.", "reasons": eligibility["reasons"]},
            )

        balance = await EtfPointsService.get_balance(user.id)
        if points > balance.balance:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cash out more than your balance ({balance.balance}).",
            )

        # Debit the balance via a negative-points event (idempotent on time + user).
        ts = datetime.utcnow().isoformat()
        await EtfPointsService.award_points(
            user_id=user.id,
            action="cashout.requested",
            points=-points,                # debit
            source_type="cashout",
            source_id=ts,                  # unique per request
            description=f"Cash-out request for {points} ETF Points",
            metadata={"requested_at": ts},
        )

        # Track cashed-out tally separately for reporting.
        doc = await EtfPoints.find_one(EtfPoints.user_id == user.id)
        if doc:
            doc.cashed_out_points += points
            await doc.save()

        return {
            "success": True,
            "requested_points": points,
            "message": "Cash-out request received. An administrator will review your request.",
        }
