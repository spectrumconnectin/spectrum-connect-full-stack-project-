"""
NotificationService
===================
Central helper for creating in-app Notification documents.

Usage (anywhere in the backend):
    from app.services.notification_service import NotificationService
    await NotificationService.send(user_id, type, title, message, ...)

All methods are fire-and-forget safe — they catch all exceptions so that
a notification failure never breaks the main business flow.
"""
from __future__ import annotations

import logging
from typing import Optional

from beanie import PydanticObjectId

logger = logging.getLogger(__name__)


async def _get_user_name(user_id: str) -> tuple[str, Optional[str]]:
    """Return (display_name, avatar_url) for a user ID."""
    try:
        from app.models.schema import User
        u = await User.get(PydanticObjectId(user_id))
        if not u:
            return "Someone", None
        name = "Someone"
        avatar = None
        if u.profile:
            name = (
                u.profile.display_name
                or f"{u.profile.first_name or ''} {u.profile.last_name or ''}".strip()
                or u.username
            )
            avatar = u.profile.profile_picture
        else:
            name = u.username
        return name, avatar
    except Exception:
        return "Someone", None


async def send(
    *,
    user_id: str,
    type: str,           # message | proposal | payment | review | system | order
    category: str,       # info | success | warning | alert
    title: str,
    message: str,
    action_url: Optional[str] = None,
    action_text: Optional[str] = None,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    actor_image: Optional[str] = None,
) -> None:
    """Create and insert a single Notification document. Never raises."""
    try:
        from app.models.schema import Notification, NotificationChannels
        notif = Notification(
            user_id=PydanticObjectId(user_id),
            type=type,
            category=category,
            title=title,
            message=message,
            action_url=action_url,
            action_text=action_text,
            actor_id=PydanticObjectId(actor_id) if actor_id else None,
            actor_name=actor_name,
            actor_image=actor_image,
            is_read=False,
            channels=NotificationChannels(in_app=True),
        )
        await notif.insert()
    except Exception as exc:
        logger.warning("Notification insert failed: %s", exc)


# ── High-level event helpers ───────────────────────────────────────────────────

class NotificationService:

    # ── Proposals ─────────────────────────────────────────────────────────────

    @staticmethod
    async def proposal_received(*, client_id: str, creator_id: str, job_title: str, job_id: str) -> None:
        """Notify client that a creator applied to their project."""
        creator_name, creator_avatar = await _get_user_name(creator_id)
        await send(
            user_id=client_id,
            type="proposal",
            category="info",
            title=f"New application for '{job_title}'",
            message=f"{creator_name} submitted a proposal for your project.",
            action_url=f"/client/projects/{job_id}/applicants",
            action_text="Review applicants",
            actor_id=creator_id,
            actor_name=creator_name,
            actor_image=creator_avatar,
        )

    @staticmethod
    async def proposal_accepted(*, creator_id: str, client_id: str, job_title: str, job_id: str) -> None:
        """Notify creator they were hired."""
        client_name, client_avatar = await _get_user_name(client_id)
        await send(
            user_id=creator_id,
            type="order",
            category="success",
            title=f"🎉 You've been hired for '{job_title}'!",
            message=f"{client_name} accepted your proposal. Head to the project to get started.",
            action_url=f"/creator/projects?tab=applications",
            action_text="View project",
            actor_id=client_id,
            actor_name=client_name,
            actor_image=client_avatar,
        )

    @staticmethod
    async def proposal_rejected(*, creator_id: str, client_id: str, job_title: str) -> None:
        """Notify creator their proposal was not selected."""
        client_name, _ = await _get_user_name(client_id)
        await send(
            user_id=creator_id,
            type="proposal",
            category="warning",
            title=f"Application update — '{job_title}'",
            message=f"Your proposal was not selected this time. Keep applying!",
            action_url="/creator/find-projects",
            action_text="Find more projects",
            actor_id=client_id,
            actor_name=client_name,
        )

    # ── Escrow / Payments ──────────────────────────────────────────────────────

    @staticmethod
    async def milestone_funded(*, creator_id: str, client_id: str, milestone_title: str, amount: float, escrow_id: str) -> None:
        """Notify creator that a milestone has been funded."""
        client_name, client_avatar = await _get_user_name(client_id)
        await send(
            user_id=creator_id,
            type="payment",
            category="success",
            title=f"Milestone funded — ${amount:.2f}",
            message=f"{client_name} funded '{milestone_title}'. Funds are held in escrow — start working!",
            action_url=f"/creator/projects",
            action_text="View project",
            actor_id=client_id,
            actor_name=client_name,
            actor_image=client_avatar,
        )

    @staticmethod
    async def milestone_released(*, creator_id: str, client_id: str, milestone_title: str, amount: float) -> None:
        """Notify creator that payment was released to them."""
        client_name, client_avatar = await _get_user_name(client_id)
        await send(
            user_id=creator_id,
            type="payment",
            category="success",
            title=f"💰 Payment released — ${amount:.2f}",
            message=f"{client_name} approved your work on '{milestone_title}'. Payment is on its way.",
            action_url="/creator/earnings",
            action_text="View earnings",
            actor_id=client_id,
            actor_name=client_name,
            actor_image=client_avatar,
        )

    @staticmethod
    async def payment_released_client(*, client_id: str, creator_id: str, milestone_title: str, amount: float) -> None:
        """Confirm to client that they released payment."""
        creator_name, creator_avatar = await _get_user_name(creator_id)
        await send(
            user_id=client_id,
            type="payment",
            category="info",
            title=f"Payment sent — ${amount:.2f}",
            message=f"You released payment for '{milestone_title}' to {creator_name}.",
            action_url="/client/payments",
            action_text="View payments",
            actor_id=creator_id,
            actor_name=creator_name,
            actor_image=creator_avatar,
        )

    # ── Disputes ───────────────────────────────────────────────────────────────

    @staticmethod
    async def dispute_opened(*, other_user_id: str, opener_id: str, reason: str, escrow_id: str) -> None:
        """Notify the other party that a dispute was opened against them."""
        opener_name, opener_avatar = await _get_user_name(opener_id)
        await send(
            user_id=other_user_id,
            type="system",
            category="alert",
            title="A dispute has been opened",
            message=f"{opener_name} opened a dispute: '{reason[:100]}'. Our team will review within 48 hours.",
            action_url=f"/client/disputes",
            action_text="View dispute",
            actor_id=opener_id,
            actor_name=opener_name,
            actor_image=opener_avatar,
        )

    @staticmethod
    async def dispute_resolved(*, user_id: str, outcome: str, escrow_id: str) -> None:
        """Notify both parties of the dispute resolution."""
        await send(
            user_id=user_id,
            type="system",
            category="success",
            title="Dispute resolved",
            message=f"Your dispute has been resolved. Outcome: {outcome}.",
            action_url="/client/disputes",
            action_text="View outcome",
        )

    # ── Projects ───────────────────────────────────────────────────────────────

    @staticmethod
    async def project_completed(*, creator_id: str, client_id: str, job_title: str, job_id: str) -> None:
        """Notify creator the project is marked complete."""
        client_name, client_avatar = await _get_user_name(client_id)
        await send(
            user_id=creator_id,
            type="order",
            category="success",
            title=f"Project completed — '{job_title}'",
            message=f"Great work! {client_name} marked the project as complete.",
            action_url=f"/creator/projects?tab=applications",
            action_text="View project",
            actor_id=client_id,
            actor_name=client_name,
            actor_image=client_avatar,
        )

    @staticmethod
    async def review_received(*, user_id: str, reviewer_id: str, rating: float, job_title: str) -> None:
        """Notify user they received a new review."""
        reviewer_name, reviewer_avatar = await _get_user_name(reviewer_id)
        stars = "⭐" * int(rating)
        await send(
            user_id=user_id,
            type="review",
            category="success",
            title=f"New review — {stars} {rating}/5",
            message=f"{reviewer_name} left you a review for '{job_title}'.",
            action_url="/creator/profile",
            action_text="View review",
            actor_id=reviewer_id,
            actor_name=reviewer_name,
            actor_image=reviewer_avatar,
        )

    # ── ETF ────────────────────────────────────────────────────────────────────

    @staticmethod
    async def etf_level_up(*, user_id: str, old_level: str, new_level: str) -> None:
        """Notify user they leveled up in ETF."""
        level_emoji = {"silver": "🥈", "gold": "🥇", "platinum": "💎"}.get(new_level, "🏅")
        await send(
            user_id=user_id,
            type="system",
            category="success",
            title=f"{level_emoji} ETF Level Up — {new_level.capitalize()}!",
            message=f"Congratulations! You've reached {new_level.capitalize()} level. Your ranking in Smart Connect just improved.",
            action_url="/creator/etf",
            action_text="View ETF points",
        )
