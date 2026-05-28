"""
Review Queue Router
===================
Freelancer Quality Review Team — API endpoints.

Creator endpoints (prefix: /profiles)
--------------------------------------
POST  /profiles/me/submit-for-review   – submit profile for review
GET   /profiles/me/review-status       – check latest submission status

Admin endpoints (prefix: /admin/reviews)
-----------------------------------------
GET   /admin/reviews/queue             – list queue (filterable by status)
GET   /admin/reviews/stats             – aggregate stats dashboard
GET   /admin/reviews/{review_id}       – full review detail
PATCH /admin/reviews/{review_id}/assign   – self-assign a pending review
PATCH /admin/reviews/{review_id}/approve  – approve with scorecard
PATCH /admin/reviews/{review_id}/reject   – reject with structured feedback
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional

from app.models.schema import User
from app.auth.auth import get_current_user, get_admin_user
from app.services.review_queue_service import ReviewQueueService
from app.api.schemas.review_schemas import (
    SubmitForReviewRequest,
    ReviewStatusResponse,
    ReviewDetailResponse,
    QueueListResponse,
    QueueStatsResponse,
    AssignReviewerRequest,
    ApproveReviewRequest,
    RejectReviewRequest,
    ActionResponse,
)

# Two separate routers — mounted at different prefixes in main.py
creator_router = APIRouter(tags=["Review Queue — Creator"])
admin_router   = APIRouter(prefix="/admin/reviews", tags=["Review Queue — Admin"])


# ═══════════════════════════════════════════════════════════════════════════════
# CREATOR ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@creator_router.post(
    "/profiles/me/submit-for-review",
    summary="Submit profile for quality review",
)
async def submit_for_review(
    request: SubmitForReviewRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Creator submits their profile to the Freelancer Quality Review Team.

    Rules
    -----
    - Only ``crew`` or ``both`` account types can submit.
    - Cannot submit while a review is already active (pending / in_review).
    - Can resubmit after rejection up to **3 times**.
    - Already-approved creators are blocked from re-submitting.

    On success a ``ReviewQueue`` document is created with status ``pending``
    (or ``resubmitted`` if this is a repeat attempt).
    """
    if current_user.account_type not in {"crew", "both"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only crew or 'both' account types can submit for quality review.",
        )

    result = await ReviewQueueService.submit_for_review(
        user_id=str(current_user.id),
        portfolio_urls=request.portfolio_urls,
        notes=request.notes,
    )
    return result


@creator_router.get(
    "/profiles/me/review-status",
    response_model=ReviewStatusResponse,
    summary="Get my review submission status",
)
async def get_my_review_status(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the current user's latest review submission status.

    If no submission exists, ``has_submission`` is ``false``.
    When rejected, ``rejection_feedback`` and ``rejection_reasons`` are included
    so the creator knows exactly what to fix before resubmitting.
    """
    result = await ReviewQueueService.get_my_review_status(
        user_id=str(current_user.id)
    )
    return ReviewStatusResponse(**result)


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@admin_router.get(
    "/queue",
    response_model=QueueListResponse,
    summary="[Admin] List review queue",
)
async def get_review_queue(
    status_filter: Optional[str] = Query(
        None,
        description="Filter by status: pending | in_review | approved | rejected | resubmitted | permanently_rejected. Omit for all active.",
    ),
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0,  ge=0),
    admin: User = Depends(get_admin_user),
):
    """
    Returns the paginated review queue.

    Default (no ``status_filter``) shows all actionable reviews:
    ``pending``, ``in_review``, and ``resubmitted``.

    Results are sorted oldest-first so nothing gets forgotten.
    Header counts (``pending_count``, ``in_review_count``) are always returned
    regardless of filter.
    """
    result = await ReviewQueueService.get_queue(
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return QueueListResponse(**result)


@admin_router.get(
    "/stats",
    response_model=QueueStatsResponse,
    summary="[Admin] Review queue statistics",
)
async def get_queue_stats(
    admin: User = Depends(get_admin_user),
):
    """
    Aggregate review queue statistics for the admin dashboard.

    Returns counts per status, approval rate, average review time,
    and weekly / monthly submission volume.
    """
    result = await ReviewQueueService.get_queue_stats()
    return QueueStatsResponse(**result)


@admin_router.get(
    "/{review_id}",
    response_model=ReviewDetailResponse,
    summary="[Admin] Get review detail",
)
async def get_review_detail(
    review_id: str,
    admin: User = Depends(get_admin_user),
):
    """
    Full detail view of a single review submission.

    Includes creator profile summary, portfolio URLs, reviewer info,
    scorecard, rejection reasons, and all timestamps.
    """
    result = await ReviewQueueService.get_review_by_id(review_id)
    return ReviewDetailResponse(**result)


@admin_router.patch(
    "/{review_id}/assign",
    response_model=ActionResponse,
    summary="[Admin] Self-assign a pending review",
)
async def assign_review(
    review_id: str,
    _request: AssignReviewerRequest = AssignReviewerRequest(),
    admin: User = Depends(get_admin_user),
):
    """
    Admin self-assigns a pending or resubmitted review from the queue.

    Sets status to ``in_review`` and stamps ``picked_up_at``.
    Only one admin can hold a review at a time — the endpoint will error
    if the review is already ``in_review``.
    """
    result = await ReviewQueueService.assign_reviewer(
        review_id=review_id,
        admin_user_id=str(admin.id),
    )
    return ActionResponse(**result)


@admin_router.patch(
    "/{review_id}/approve",
    response_model=ActionResponse,
    summary="[Admin] Approve a review",
)
async def approve_review(
    review_id: str,
    request: ApproveReviewRequest,
    admin: User = Depends(get_admin_user),
):
    """
    Approve a freelancer's profile.

    Effects
    -------
    - Review status → ``approved``
    - ``User.is_verified`` → ``True``
    - ``User.verification_badge`` populated
    - ``User.spectrum_id.verification_checks_passed`` += ``"team_approved"``
    - ``User.spectrum_id.verification_level`` = ``request.verification_type``
    - ``CrewProfile.last_review_date`` stamped
    - Approval email sent to creator
    """
    scores = None
    if request.scores:
        scores = {
            "portfolio_score":     request.scores.portfolio_score,
            "credential_score":    request.scores.credential_score,
            "communication_score": request.scores.communication_score,
        }

    result = await ReviewQueueService.approve_review(
        review_id=review_id,
        admin_user_id=str(admin.id),
        review_notes=request.review_notes,
        scores=scores,
        verification_type=request.verification_type,
    )
    return ActionResponse(**result)


@admin_router.patch(
    "/{review_id}/reject",
    response_model=ActionResponse,
    summary="[Admin] Reject a review",
)
async def reject_review(
    review_id: str,
    request: RejectReviewRequest,
    admin: User = Depends(get_admin_user),
):
    """
    Reject a freelancer's profile with structured feedback.

    The creator is notified by email with ``rejection_feedback`` and the list
    of ``rejection_reasons`` so they know exactly what to fix.

    If the creator has exhausted their resubmission allowance (default 3),
    the status becomes ``permanently_rejected`` instead of ``rejected``.
    """
    scores = None
    if request.scores:
        scores = {
            "portfolio_score":     request.scores.portfolio_score,
            "credential_score":    request.scores.credential_score,
            "communication_score": request.scores.communication_score,
        }

    result = await ReviewQueueService.reject_review(
        review_id=review_id,
        admin_user_id=str(admin.id),
        rejection_reasons=[
            {"code": r.code, "description": r.description}
            for r in request.rejection_reasons
        ],
        rejection_feedback=request.rejection_feedback,
        review_notes=request.review_notes,
        scores=scores,
    )
    return ActionResponse(**result)