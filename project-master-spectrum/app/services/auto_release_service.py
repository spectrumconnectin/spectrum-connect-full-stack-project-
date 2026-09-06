"""
Auto-Release Service
====================
Background job that automatically releases escrow payments when:
  - A milestone has been in 'delivered' status for ≥ 48 hours
  - The milestone has a valid Google Drive link
  - No dispute has been raised on the escrow
  - No active revision request exists

Also sends reminder notifications at 24h and 6h remaining.

Run schedule: every 30 minutes via asyncio loop started at app startup.
"""
import logging
import asyncio
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# How long a client has to review before auto-release
AUTO_RELEASE_HOURS = 48

# Reminder thresholds (hours remaining before auto-release)
REMIND_24H = 24
REMIND_6H = 6


async def _release_milestone(esc, milestone, reason: str = "auto_release"):
    """Perform a single milestone release and record the auto-release event."""
    from app.services.escrow_service import EscrowService
    from app.services.notification_service import NotificationService
    from app.models.schema import JobPost
    from beanie import PydanticObjectId

    try:
        # release_milestone performs the release atomically AND sets
        # milestone.auto_released=True via a targeted update. We must NOT save
        # the stale `esc` doc here — doing so would clobber the release that
        # release_milestone just persisted (re-reverting the milestone status
        # and re-opening it to a second release / double-payment).
        await EscrowService.release_milestone(
            escrow_id=str(esc.id),
            milestone_id=milestone.milestone_id,
            client_id=str(esc.client_id),
            is_auto_release=True,
        )
        # Keep the in-memory copy consistent for the notifications below.
        milestone.auto_released = True
        milestone.status = "released"
        logger.info(
            "Auto-released milestone %s on escrow %s (reason: %s)",
            milestone.milestone_id, esc.id, reason,
        )

        # Notify creator
        await NotificationService.send(
            user_id=str(esc.creator_id),
            type="escrow",
            category="success",
            title="✅ Payment automatically released",
            message=(
                f"The 48-hour review window passed without action on '{milestone.title}'. "
                f"Payment has been automatically released to your account."
            ),
            actor_id=str(esc.client_id),
        )

        # Notify client
        await NotificationService.send(
            user_id=str(esc.client_id),
            type="escrow",
            category="info",
            title="Payment auto-released",
            message=(
                f"The review window for '{milestone.title}' expired. "
                f"Payment has been automatically released to the creator."
            ),
            actor_id=str(esc.creator_id),
        )

        # Move job to approved if all milestones done
        try:
            if esc.job_post_id:
                job = await JobPost.get(esc.job_post_id)
                if job and job.status == "delivered":
                    job.status = "approved"
                    await job.save()
        except Exception:
            pass

    except Exception as e:
        logger.error("Auto-release failed for milestone %s: %s", milestone.milestone_id, e)


async def _send_reminder(esc, milestone, hours_remaining: int):
    """Send a reminder notification to the client."""
    from app.services.notification_service import NotificationService
    try:
        if hours_remaining == REMIND_24H:
            title = "⏰ 24 hours left to review delivery"
            msg = (
                f"You have 24 hours remaining to review the delivery for '{milestone.title}'. "
                f"Release payment or request a revision — otherwise it will be auto-released."
            )
        else:
            title = "⚠️ Review period ending soon (6 hours left)"
            msg = (
                f"Only 6 hours remaining to review '{milestone.title}'. "
                f"Please review the Google Drive link and take action."
            )
        await NotificationService.send(
            user_id=str(esc.client_id),
            type="escrow",
            category="warning",
            title=title,
            message=msg,
            actor_id=str(esc.creator_id),
        )
    except Exception as e:
        logger.error("Reminder notification failed: %s", e)


async def run_auto_release_check():
    """
    Check all delivered milestones and:
    1. Send 24h reminder if within 24–25h window
    2. Send 6h reminder if within 6–7h window
    3. Auto-release if past deadline
    """
    from app.models.escrow import Escrow as EscrowDoc
    from app.core.config import settings

    now = datetime.utcnow()
    processed = released = reminders = 0

    if settings.ESCROW_RELEASES_PAUSED:
        logger.warning("Auto-release skipped this cycle — ESCROW_RELEASES_PAUSED is set.")
        return {"checked": 0, "released": 0, "reminders_sent": 0, "paused": True}

    try:
        # Find all active escrows that have at least one delivered milestone.
        # NOTE: use a plain equality match — `EscrowDoc.status.in_([...])` raises
        # `TypeError: 'ExpressionField' object is not callable` under Beanie 2.x,
        # which previously aborted the entire scan (auto-release never fired).
        escrows = await EscrowDoc.find(
            EscrowDoc.status == "active"
        ).to_list()

        for esc in escrows:
            if esc.status == "disputed":
                continue  # Never auto-release disputed escrows

            for milestone in esc.milestones:
                if milestone.status != "delivered":
                    continue
                if milestone.auto_released:
                    continue
                if not milestone.google_drive_link:
                    continue
                if not milestone.auto_release_at:
                    # Legacy milestone without auto_release_at — compute from delivered_at
                    if not milestone.delivered_at:
                        continue
                    milestone.auto_release_at = milestone.delivered_at + timedelta(hours=AUTO_RELEASE_HOURS)

                processed += 1
                remaining = (milestone.auto_release_at - now).total_seconds() / 3600

                if remaining <= 0:
                    # Deadline passed — auto-release
                    await _release_milestone(esc, milestone)
                    released += 1
                elif REMIND_24H <= remaining < REMIND_24H + 0.5:
                    # In the 24h–24.5h window → send 24h reminder (0.5h window avoids dupes)
                    await _send_reminder(esc, milestone, REMIND_24H)
                    reminders += 1
                elif REMIND_6H <= remaining < REMIND_6H + 0.5:
                    # In the 6h–6.5h window → send 6h reminder
                    await _send_reminder(esc, milestone, REMIND_6H)
                    reminders += 1

    except Exception as e:
        logger.error("Auto-release check failed: %s", e)

    if processed > 0:
        logger.info(
            "Auto-release check: %d delivered milestones checked, %d released, %d reminders sent",
            processed, released, reminders,
        )

    return {"checked": processed, "released": released, "reminders_sent": reminders}


async def _scheduler_loop():
    """Run the auto-release check every 30 minutes indefinitely."""
    # Wait 60 seconds after startup before first run (let DB initialize)
    await asyncio.sleep(60)
    while True:
        try:
            await run_auto_release_check()
        except Exception as e:
            logger.error("Scheduler loop error: %s", e)
        # Run every 30 minutes
        await asyncio.sleep(30 * 60)


def start_scheduler(app):
    """Hook into FastAPI startup to begin the background scheduler."""
    import asyncio

    @app.on_event("startup")
    async def _start():
        asyncio.create_task(_scheduler_loop())
        logger.info("Auto-release scheduler started (runs every 30 min)")
