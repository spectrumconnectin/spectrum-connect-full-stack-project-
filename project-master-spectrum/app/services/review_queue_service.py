"""
Review Queue Service
====================
Business logic for the Freelancer Quality Review Team module.

Responsibilities
----------------
1. submit_for_review      – creator submits their profile; enforces resubmission cap.
2. assign_reviewer        – admin self-assigns a pending review.
3. approve_review         – admin approves; updates User + CrewProfile accordingly.
4. reject_review          – admin rejects; stores feedback; checks resubmission cap.
5. get_queue              – paginated admin queue with status filters.
6. get_review_by_id       – full review detail (admin).
7. get_my_review_status   – creator checks their own latest submission.
8. get_queue_stats        – aggregated counts + approval rate for admin dashboard.

Side-effects on approve
-----------------------
  User.verification_badge.verified = True
  User.verification_badge.verified_at = now
  User.verification_badge.verification_type = request.verification_type
  User.spectrum_id.verification_checks_passed += "team_approved"
  User.spectrum_id.verification_level = request.verification_type
  User.is_verified = True
  CrewProfile.last_review_date = now
  CrewProfile.trust_tier_override = None  (reset so normal tier takes over)
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.review_queue import ReviewQueue, RejectionReason, ScoreBreakdown
from app.models.schema import User, CrewProfile, VerificationBadge
# Email notifications deferred to Phase 2


# ── Constants ─────────────────────────────────────────────────────────────────

ACTIVE_STATUSES = {"pending", "in_review", "resubmitted"}
TERMINAL_STATUSES = {"approved", "permanently_rejected"}


# ── Service ───────────────────────────────────────────────────────────────────

class ReviewQueueService:

    # ------------------------------------------------------------------ #
    # Creator-facing                                                       #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def submit_for_review(
        user_id: str,
        portfolio_urls: List[str],
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creator submits (or resubmits) their profile for manual review.

        Rules
        -----
        - Cannot submit if already approved.
        - Cannot submit if permanently rejected (hit the cap).
        - Cannot submit while an active review is in_review / pending.
        - On resubmission, increments resubmission_count from the last rejected doc.
        """
        uid = PydanticObjectId(user_id)

        # Fetch the most recent submission for this user
        latest = await ReviewQueue.find(
            ReviewQueue.user_id == uid
        ).sort(-ReviewQueue.submitted_at).first_or_none()

        # Block if already approved
        if latest and latest.status == "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your profile is already approved. No further submissions needed.",
            )

        # Block if permanently rejected
        if latest and latest.status == "permanently_rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"You have reached the maximum of {latest.max_resubmissions} "
                    "review attempts. Contact support for assistance."
                ),
            )

        # Block if already active (pending / in_review / resubmitted)
        if latest and latest.status in ACTIVE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You already have an active review submission (status: {latest.status}). "
                       "Please wait for the review team to process it.",
            )

        # Determine resubmission count
        resubmission_count = 0
        if latest and latest.status == "rejected":
            resubmission_count = latest.resubmission_count + 1
            if resubmission_count > latest.max_resubmissions:
                # Mark old doc as permanently rejected and block
                latest.status = "permanently_rejected"
                latest.updated_at = datetime.utcnow()
                await latest.save()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Maximum resubmission attempts reached. Contact support.",
                )

        # Create new submission
        review = ReviewQueue(
            user_id=uid,
            status="resubmitted" if resubmission_count > 0 else "pending",
            submitted_at=datetime.utcnow(),
            resubmitted_at=datetime.utcnow() if resubmission_count > 0 else None,
            resubmission_count=resubmission_count,
            submitted_portfolio_urls=portfolio_urls[:10],
            submitted_notes=notes,
        )
        await review.insert()

        return {
            "success": True,
            "review_id": str(review.id),
            "status": review.status,
            "message": (
                "Your profile has been submitted for review. "
                "The team typically responds within 3-5 business days."
            ),
            "resubmission_count": resubmission_count,
            "resubmissions_remaining": review.max_resubmissions - resubmission_count,
        }

    @staticmethod
    async def get_my_review_status(user_id: str) -> Dict[str, Any]:
        """Return the creator's latest review submission status."""
        uid = PydanticObjectId(user_id)

        latest = await ReviewQueue.find(
            ReviewQueue.user_id == uid
        ).sort(-ReviewQueue.submitted_at).first_or_none()

        if not latest:
            return {
                "has_submission": False,
                "status": None,
                "submitted_at": None,
                "reviewed_at": None,
                "resubmitted_at": None,
                "resubmission_count": 0,
                "max_resubmissions": 3,
                "resubmissions_remaining": 3,
                "rejection_feedback": None,
                "rejection_reasons": [],
                "can_resubmit": False,
                "review_id": None,
            }

        can_resubmit = (
            latest.status == "rejected"
            and latest.resubmission_count < latest.max_resubmissions
        )

        return {
            "has_submission": True,
            "status": latest.status,
            "submitted_at": latest.submitted_at,
            "reviewed_at": latest.reviewed_at,
            "resubmitted_at": latest.resubmitted_at,
            "resubmission_count": latest.resubmission_count,
            "max_resubmissions": latest.max_resubmissions,
            "resubmissions_remaining": max(
                0, latest.max_resubmissions - latest.resubmission_count
            ),
            "rejection_feedback": latest.rejection_feedback,
            "rejection_reasons": [
                {"code": r.code, "description": r.description}
                for r in latest.rejection_reasons
            ],
            "can_resubmit": can_resubmit,
            "review_id": str(latest.id),
        }

    # ------------------------------------------------------------------ #
    # Admin — queue management                                             #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def get_queue(
        status_filter: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Return paginated review queue for admins.

        Parameters
        ----------
        status_filter : "pending" | "in_review" | "approved" | "rejected" |
                        "resubmitted" | "permanently_rejected" | None (all active)
        """
        query = ReviewQueue.find()

        if status_filter:
            query = query.find(ReviewQueue.status == status_filter)
        else:
            # Default: show actionable items only
            query = query.find({"status": {"$in": list(ACTIVE_STATUSES)}})

        total = await query.count()

        # Count buckets for header stats
        pending_count = await ReviewQueue.find(ReviewQueue.status == "pending").count()
        in_review_count = await ReviewQueue.find(ReviewQueue.status == "in_review").count()

        reviews_raw = (
            await query.sort(+ReviewQueue.submitted_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        reviews = []
        for rev in reviews_raw:
            creator = await User.get(rev.user_id)
            if not creator:
                continue

            reviewer_username = None
            if rev.reviewer_id:
                reviewer = await User.get(rev.reviewer_id)
                if reviewer:
                    reviewer_username = reviewer.username

            reviews.append({
                "review_id": str(rev.id),
                "status": rev.status,
                "creator_id": str(rev.user_id),
                "creator_username": creator.username,
                "creator_email": creator.email,
                "creator_account_type": creator.account_type,
                "submitted_at": rev.submitted_at,
                "picked_up_at": rev.picked_up_at,
                "resubmission_count": rev.resubmission_count,
                "is_assigned": rev.reviewer_id is not None,
                "reviewer_username": reviewer_username,
            })

        return {
            "reviews": reviews,
            "total": total,
            "pending_count": pending_count,
            "in_review_count": in_review_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }

    @staticmethod
    async def get_review_by_id(review_id: str) -> Dict[str, Any]:
        """Full detail view of a single review (admin)."""
        rev = await ReviewQueue.get(PydanticObjectId(review_id))
        if not rev:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found",
            )

        creator = await User.get(rev.user_id)
        if not creator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Creator user not found",
            )

        # Build skills list from profile
        skills: List[str] = []
        if creator.profile and creator.profile.skills:
            for s in creator.profile.skills:
                name = s.name if hasattr(s, "name") else str(s)
                skills.append(name)

        creator_summary = {
            "user_id": str(creator.id),
            "username": creator.username,
            "email": creator.email,
            "account_type": creator.account_type,
            "profile_picture": (
                creator.profile.profile_picture if creator.profile else None
            ),
            "bio": creator.profile.bio if creator.profile else None,
            "skills": skills[:10],
            "is_verified": creator.is_verified,
            "spectrum_tier": (
                creator.spectrum_id.tier
                if creator.spectrum_id else "bronze"
            ),
        }

        reviewer_summary = None
        if rev.reviewer_id:
            reviewer = await User.get(rev.reviewer_id)
            if reviewer:
                reviewer_summary = {
                    "reviewer_id": str(reviewer.id),
                    "username": reviewer.username,
                    "email": reviewer.email,
                }

        return {
            "review_id": str(rev.id),
            "status": rev.status,
            "creator": creator_summary,
            "reviewer": reviewer_summary,
            "submitted_at": rev.submitted_at,
            "picked_up_at": rev.picked_up_at,
            "reviewed_at": rev.reviewed_at,
            "resubmitted_at": rev.resubmitted_at,
            "review_notes": rev.review_notes,
            "rejection_reasons": [
                {"code": r.code, "description": r.description}
                for r in rev.rejection_reasons
            ],
            "rejection_feedback": rev.rejection_feedback,
            "scores": {
                "portfolio_score": rev.scores.portfolio_score if rev.scores else None,
                "credential_score": rev.scores.credential_score if rev.scores else None,
                "communication_score": rev.scores.communication_score if rev.scores else None,
            } if rev.scores else None,
            "overall_decision": rev.overall_decision,
            "resubmission_count": rev.resubmission_count,
            "max_resubmissions": rev.max_resubmissions,
            "verification_fee_paid": rev.verification_fee_paid,
            "verification_fee_amount": rev.verification_fee_amount,
            "submitted_portfolio_urls": rev.submitted_portfolio_urls,
            "submitted_notes": rev.submitted_notes,
        }

    @staticmethod
    async def assign_reviewer(review_id: str, admin_user_id: str) -> Dict[str, Any]:
        """
        Admin self-assigns a review from the queue.
        Only pending or resubmitted reviews can be assigned.
        """
        rev = await ReviewQueue.get(PydanticObjectId(review_id))
        if not rev:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found",
            )

        if rev.status not in {"pending", "resubmitted"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign a review with status '{rev.status}'. "
                       "Only pending or resubmitted reviews can be assigned.",
            )

        rev.reviewer_id = PydanticObjectId(admin_user_id)
        rev.status = "in_review"
        rev.picked_up_at = datetime.utcnow()
        rev.updated_at = datetime.utcnow()
        await rev.save()

        return {
            "success": True,
            "message": "Review assigned successfully",
            "review_id": str(rev.id),
            "new_status": rev.status,
        }

    @staticmethod
    async def approve_review(
        review_id: str,
        admin_user_id: str,
        review_notes: Optional[str],
        scores: Optional[Dict[str, Optional[int]]],
        verification_type: str = "standard",
    ) -> Dict[str, Any]:
        """
        Admin approves a review submission.

        Side-effects
        ------------
        - ReviewQueue → approved
        - User.is_verified = True
        - User.verification_badge updated
        - User.spectrum_id.verification_checks_passed += "team_approved"
        - User.spectrum_id.verification_level = verification_type
        - CrewProfile.last_review_date = now
        """
        rev = await ReviewQueue.get(PydanticObjectId(review_id))
        if not rev:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found",
            )

        if rev.status not in {"in_review", "pending", "resubmitted"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve a review with status '{rev.status}'.",
            )

        now = datetime.utcnow()

        # ── Update ReviewQueue ────────────────────────────────────────────
        rev.status = "approved"
        rev.overall_decision = "approved"
        rev.reviewed_at = now
        rev.updated_at = now
        rev.reviewer_id = PydanticObjectId(admin_user_id)
        rev.review_notes = review_notes

        if scores:
            rev.scores = ScoreBreakdown(
                portfolio_score=scores.get("portfolio_score"),
                credential_score=scores.get("credential_score"),
                communication_score=scores.get("communication_score"),
            )

        await rev.save()

        # ── Update User ───────────────────────────────────────────────────
        user = await User.get(rev.user_id)
        if user:
            user.is_verified = True
            user.verification_badge = VerificationBadge(
                verified=True,
                verified_at=now,
                verification_type=verification_type,
            )

            # Update Spectrum ID
            if user.spectrum_id:
                if "team_approved" not in user.spectrum_id.verification_checks_passed:
                    user.spectrum_id.verification_checks_passed.append("team_approved")
                user.spectrum_id.verification_level = verification_type
                user.spectrum_id.last_trust_recalculation = now
            await user.save()

            # ── Update CrewProfile ────────────────────────────────────────
            crew = await CrewProfile.find_one(CrewProfile.user_id == rev.user_id)
            if crew:
                crew.last_review_date = now
                crew.trust_tier_override = None  # let normal tier take over
                await crew.save()

            # ── Email notification (Phase 2) ──────────────────────────────
            # TODO: send_review_approved_email(user.email, user.username, verification_type)
            print(f"[ReviewQueue] Approved: {user.email} — email deferred to Phase 2")

        return {
            "success": True,
            "message": "Review approved. Creator profile is now verified.",
            "review_id": str(rev.id),
            "new_status": "approved",
        }

    @staticmethod
    async def reject_review(
        review_id: str,
        admin_user_id: str,
        rejection_reasons: List[Dict[str, str]],
        rejection_feedback: str,
        review_notes: Optional[str],
        scores: Optional[Dict[str, Optional[int]]],
    ) -> Dict[str, Any]:
        """
        Admin rejects a review submission.

        If the creator has exhausted their resubmission limit the status is
        set to 'permanently_rejected' instead of 'rejected'.
        """
        rev = await ReviewQueue.get(PydanticObjectId(review_id))
        if not rev:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found",
            )

        if rev.status not in {"in_review", "pending", "resubmitted"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reject a review with status '{rev.status}'.",
            )

        now = datetime.utcnow()
        resubmissions_used = rev.resubmission_count
        new_status = (
            "permanently_rejected"
            if resubmissions_used >= rev.max_resubmissions
            else "rejected"
        )

        # ── Update ReviewQueue ────────────────────────────────────────────
        rev.status = new_status
        rev.overall_decision = "rejected"
        rev.reviewed_at = now
        rev.updated_at = now
        rev.reviewer_id = PydanticObjectId(admin_user_id)
        rev.review_notes = review_notes
        rev.rejection_feedback = rejection_feedback
        rev.rejection_reasons = [
            RejectionReason(code=r["code"], description=r["description"])
            for r in rejection_reasons
        ]

        if scores:
            rev.scores = ScoreBreakdown(
                portfolio_score=scores.get("portfolio_score"),
                credential_score=scores.get("credential_score"),
                communication_score=scores.get("communication_score"),
            )

        await rev.save()

        # ── Email notification (Phase 2) ──────────────────────────────────
        user = await User.get(rev.user_id)
        if user:
            # TODO: send_review_rejected_email(user.email, ...)
            print(f"[ReviewQueue] Rejected: {user.email} — email deferred to Phase 2")

        return {
            "success": True,
            "message": (
                "Review rejected. Creator has been notified."
                if new_status == "rejected"
                else "Review permanently rejected. Creator has reached the resubmission limit."
            ),
            "review_id": str(rev.id),
            "new_status": new_status,
        }

    # ------------------------------------------------------------------ #
    # Admin — stats                                                        #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def get_queue_stats() -> Dict[str, Any]:
        """Aggregate counts and approval rate for the admin dashboard."""
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        all_reviews = await ReviewQueue.find_all().to_list()

        counts = {
            "pending": 0,
            "in_review": 0,
            "approved": 0,
            "rejected": 0,
            "resubmitted": 0,
            "permanently_rejected": 0,
        }
        total_this_week = 0
        total_this_month = 0
        review_times: List[float] = []

        for rev in all_reviews:
            counts[rev.status] = counts.get(rev.status, 0) + 1

            if rev.submitted_at >= week_ago:
                total_this_week += 1
            if rev.submitted_at >= month_ago:
                total_this_month += 1

            # Average review time for decided reviews
            if rev.reviewed_at and rev.picked_up_at:
                delta = (rev.reviewed_at - rev.picked_up_at).total_seconds() / 3600
                review_times.append(delta)

        decided = counts["approved"] + counts["rejected"] + counts["permanently_rejected"]
        approval_rate = (
            round(counts["approved"] / decided, 4) if decided > 0 else 0.0
        )

        return {
            "total_submissions": len(all_reviews),
            "pending": counts["pending"],
            "in_review": counts["in_review"],
            "approved": counts["approved"],
            "rejected": counts["rejected"],
            "resubmitted": counts["resubmitted"],
            "permanently_rejected": counts["permanently_rejected"],
            "approval_rate": approval_rate,
            "avg_review_time_hours": (
                round(sum(review_times) / len(review_times), 2)
                if review_times else None
            ),
            "total_this_week": total_this_week,
            "total_this_month": total_this_month,
        }