from __future__ import annotations
"""
Proposals Router — Creator applies to job posts, client reviews applicants.

Model used: Application (schema.py)
  - project_id  → JobPost.id (the job being applied to)
  - crew_id     → User.id   (the creator who applied)
  - status      : submitted | shortlisted | interviewing | accepted | rejected | withdrawn
"""

from fastapi import APIRouter, Depends, HTTPException, status, Path
from pydantic import BaseModel
from typing import Optional, List, Dict
from bson import ObjectId
from datetime import datetime

from app.models.schema import User, Application, JobPost
from app.auth.auth import get_current_user

router = APIRouter(prefix="/proposals", tags=["Proposals"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProposalSubmit(BaseModel):
    cover_letter: str
    proposed_budget: Optional[float] = None
    role: Optional[str] = None
    proposed_duration: Optional[int] = None  # days


class ProposalStatusUpdate(BaseModel):
    status: str  # shortlisted | interviewing | accepted | rejected


class RatingCreate(BaseModel):
    ratings: Dict[str, int]        # e.g. {"quality": 5, "communication": 4, ...}
    review: str
    tags: Optional[List[str]] = []
    private_note: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

VALID_CLIENT_STATUSES = {"shortlisted", "interviewing", "accepted", "rejected"}


def _oid(raw: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/{job_id}",
    status_code=status.HTTP_201_CREATED,
    summary="Submit a proposal to a job (creator)",
)
async def submit_proposal(
    job_id: str = Path(...),
    data: ProposalSubmit = ...,
    current_user: User = Depends(get_current_user),
):
    job = await JobPost.get(_oid(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in ("open", "in_review"):
        raise HTTPException(status_code=400, detail="This job is not accepting proposals")

    # Prevent self-hire: creator cannot apply to their own job post
    if str(job.client_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You cannot apply to your own job post")

    existing = await Application.find_one(
        Application.project_id == _oid(job_id),
        Application.crew_id == current_user.id,
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this job")

    app = Application(
        project_id=_oid(job_id),
        crew_id=current_user.id,
        cover_letter=data.cover_letter,
        proposed_budget=data.proposed_budget,
        role=data.role,
        proposed_duration=data.proposed_duration,
        status="submitted",
    )
    await app.insert()

    # increment proposal count and move job to in_review
    job.proposal_count = (job.proposal_count or 0) + 1
    if job.status == "open":
        job.status = "in_review"
    await job.save()

    # Notify the client that a new application arrived
    try:
        from app.services.notification_service import NotificationService
        await NotificationService.proposal_received(
            client_id=str(job.client_id),
            creator_id=str(current_user.id),
            job_title=job.title,
            job_id=job_id,
        )
    except Exception:
        pass

    return {"id": str(app.id), "status": app.status, "job_id": job_id}


@router.get(
    "/me",
    summary="Get my submitted proposals (creator)",
)
async def get_my_proposals(
    current_user: User = Depends(get_current_user),
):
    apps = (
        await Application.find(Application.crew_id == current_user.id)
        .sort(-Application.submitted_at)
        .to_list()
    )

    results = []
    for app in apps:
        job = await JobPost.get(app.project_id)
        results.append({
            "id": str(app.id),
            "job_id": str(app.project_id),
            "job_title": job.title if job else "Unknown",
            "job_department": job.department if job else "",
            "job_status": job.status if job else "",
            "client_id": str(job.client_id) if job else None,
            "cover_letter": app.cover_letter,
            "proposed_budget": app.proposed_budget,
            "role": app.role,
            "status": app.status,
            "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
        })

    return results


@router.get(
    "/{proposal_id}/detail",
    summary="Get a single proposal by ID (creator or client)",
)
async def get_proposal_detail(
    proposal_id: str = Path(...),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single proposal/application with full job + escrow context.
    Used by the creator workspace page.
    """
    from beanie import PydanticObjectId
    from app.models.escrow import Escrow as EscrowDoc

    try:
        app = await Application.get(PydanticObjectId(proposal_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if not app:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Only the creator or the client can view
    if str(app.crew_id) != str(current_user.id):
        job_check = await JobPost.get(app.project_id)
        if not job_check or str(job_check.client_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorised")

    job = await JobPost.get(app.project_id)

    # Get escrow for this job (if any)
    escrow = None
    try:
        escs = await EscrowDoc.find(EscrowDoc.job_post_id == app.project_id).to_list()
        # prefer the one belonging to this creator
        for e in escs:
            if str(e.creator_id) == str(app.crew_id):
                escrow = e
                break
        if escrow is None and escs:
            escrow = escs[0]
    except Exception:
        pass

    # Client info
    client_info = None
    if job:
        try:
            client = await User.get(job.client_id)
            if client:
                client_info = {
                    "id": str(client.id),
                    "username": client.username,
                    "display_name": client.profile.display_name if client.profile else None,
                    "avatar": client.profile.profile_picture if client.profile else None,
                }
        except Exception:
            pass

    # Build escrow summary
    escrow_data = None
    if escrow:
        escrow_data = {
            "escrow_id": str(escrow.id),
            "status": escrow.status,
            "total_amount": float(escrow.total_amount or 0),
            "funded_amount": float(escrow.funded_amount or 0),
            "released_amount": float(escrow.released_amount or 0),
            "milestones": [
                {
                    "milestone_id": m.milestone_id,
                    "title": m.title,
                    "amount": float(m.amount),
                    "status": m.status,
                    "google_drive_link": m.google_drive_link,
                    "delivery_notes": m.delivery_notes,
                    "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
                    "funded_at": m.funded_at.isoformat() if m.funded_at else None,
                    "released_at": m.released_at.isoformat() if m.released_at else None,
                }
                for m in escrow.milestones
            ],
        }

    return {
        "id": str(app.id),
        "job_id": str(app.project_id),
        "job_title": job.title if job else "Unknown",
        "job_description": job.description if job else None,
        "job_department": job.department if job else "",
        "job_status": job.status if job else "",
        "job_budget_min": (job.budget.min if job and job.budget else None),
        "job_budget_max": (job.budget.max if job and job.budget else None),
        "job_location": None,  # JobPost has no top-level location field
        "job_skills": (job.skills or []) if job else [],
        "job_deadline": job.deadline.isoformat() if job and job.deadline else None,
        "client_id": str(job.client_id) if job else None,
        "client": client_info,
        "cover_letter": app.cover_letter,
        "proposed_budget": app.proposed_budget,
        "role": app.role,
        "status": app.status,
        "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
        "escrow": escrow_data,
    }


@router.get(
    "/job/{job_id}",
    summary="Get all proposals for a job (client/owner)",
)
async def get_job_proposals(
    job_id: str = Path(...),
    current_user: User = Depends(get_current_user),
):
    job = await JobPost.get(_oid(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if str(job.client_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorised")

    apps = (
        await Application.find(Application.project_id == _oid(job_id))
        .sort(-Application.submitted_at)
        .to_list()
    )

    results = []
    for app in apps:
        creator = await User.get(app.crew_id)
        profile = creator.profile if creator else None
        skills = [s.name for s in (profile.skills or [])] if profile and profile.skills else []

        results.append({
            "id": str(app.id),
            "creator_id": str(app.crew_id),
            "creator_name": (
                (profile.display_name or f"{profile.first_name or ''} {profile.last_name or ''}".strip())
                if profile else (creator.username if creator else "Unknown")
            ),
            "creator_avatar": profile.profile_picture if profile else None,
            "creator_title": profile.headline if profile else None,
            "creator_location": (
                profile.location.get("city") if profile and isinstance(profile.location, dict) else None
            ),
            "creator_skills": skills[:6],
            "cover_letter": app.cover_letter,
            "proposed_budget": app.proposed_budget,
            "role": app.role,
            "status": app.status,
            "client_viewed": app.client_viewed,
            "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
        })

    # Mark unviewed as viewed
    for app in apps:
        if not app.client_viewed:
            app.client_viewed = True
            await app.save()

    return results


@router.patch(
    "/{proposal_id}/status",
    summary="Update proposal status (client shortlists / accepts / rejects)",
)
async def update_proposal_status(
    proposal_id: str = Path(...),
    data: ProposalStatusUpdate = ...,
    current_user: User = Depends(get_current_user),
):
    if data.status not in VALID_CLIENT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_CLIENT_STATUSES)}",
        )

    app = await Application.get(_oid(proposal_id))
    if not app:
        raise HTTPException(status_code=404, detail="Proposal not found")

    job = await JobPost.get(app.project_id)
    if not job or str(job.client_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorised")

    # Prevent self-hire: client cannot accept a proposal from themselves
    if data.status == "accepted" and str(app.crew_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You cannot hire yourself")

    app.status = data.status
    await app.save()

    # Update job status based on accepted / rejected decision
    if data.status == "accepted":
        job.status = "pending_funding"
        await job.save()
    elif data.status == "rejected" and job.status in ("in_review", "pending_funding"):
        # If all proposals are now rejected/withdrawn, reopen the job
        remaining = await Application.find(
            Application.project_id == job.id,
            Application.status.in_(["submitted", "shortlisted", "interviewing", "accepted"]),
        ).count()
        if remaining == 0:
            job.status = "open"
            await job.save()

    # Notify creator of the decision
    try:
        from app.services.notification_service import NotificationService
        if data.status == "accepted":
            await NotificationService.proposal_accepted(
                creator_id=str(app.crew_id),
                client_id=str(current_user.id),
                job_title=job.title,
                job_id=str(job.id),
            )
        elif data.status == "rejected":
            await NotificationService.proposal_rejected(
                creator_id=str(app.crew_id),
                client_id=str(current_user.id),
                job_title=job.title,
            )
    except Exception:
        pass

    # ETF: award client points for hiring a creator
    if data.status == "accepted":
        try:
            from app.services.etf_points_service import EtfPointsService
            await EtfPointsService.award_points(
                user_id=current_user.id,
                action="project.hired",
                source_type="application",
                source_id=str(app.id),
                counterparty_id=app.crew_id,
                description=f"Hired creator for: {job.title}",
            )
        except Exception:
            pass

    return {"id": str(app.id), "status": app.status, "job_status": job.status}


@router.delete(
    "/{proposal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Withdraw a proposal (creator)",
)
async def withdraw_proposal(
    proposal_id: str = Path(...),
    current_user: User = Depends(get_current_user),
):
    app = await Application.get(_oid(proposal_id))
    if not app:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if str(app.crew_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorised")
    if app.status in {"accepted", "rejected"}:
        raise HTTPException(status_code=400, detail="Cannot withdraw a proposal that has already been decided")

    job = await JobPost.get(app.project_id)
    await app.delete()

    if job and (job.proposal_count or 0) > 0:
        job.proposal_count -= 1
        await job.save()


@router.post(
    "/{proposal_id}/rate",
    summary="Submit a rating/review after project completion (client rates creator, creator rates client)",
)
async def rate_proposal(
    proposal_id: str = Path(...),
    data: RatingCreate = ...,
    current_user: User = Depends(get_current_user),
):
    app = await Application.get(_oid(proposal_id))
    if not app:
        raise HTTPException(status_code=404, detail="Proposal not found")

    job = await JobPost.get(app.project_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    is_client  = str(job.client_id) == str(current_user.id)
    is_creator = str(app.crew_id)   == str(current_user.id)
    if not is_client and not is_creator:
        raise HTTPException(status_code=403, detail="Only project participants can leave a review")

    # ── Creator rates client ──────────────────────────────────────────────────
    if is_creator:
        if not data.ratings:
            raise HTTPException(status_code=400, detail="At least one rating is required")
        overall = round(sum(data.ratings.values()) / len(data.ratings), 2)
        await app.update({"$set": {
            "creator_rating_of_client": {
                "ratings": data.ratings,
                "overall": overall,
                "review": data.review,
                "tags": data.tags or [],
                "reviewed_at": datetime.utcnow().isoformat(),
            }
        }})
        # Update client's aggregate rating on User.profile
        client = await User.get(job.client_id)
        if client:
            old_count  = (client.profile.review_count if client.profile else None) or 0
            old_rating = (client.profile.rating       if client.profile else None) or 0.0
            new_count  = old_count + 1
            new_rating = round((old_rating * old_count + overall) / new_count, 2)
            await client.update({"$set": {
                "profile.rating": new_rating,
                "profile.review_count": new_count,
            }})
        try:
            from app.services.notification_service import NotificationService
            await NotificationService.send(
                user_id=str(job.client_id),
                type="review",
                category="info",
                title=f"⭐ New review from your creator",
                message=f"You received a {overall:.1f}/5 review for '{job.title}'.",
                actor_id=str(current_user.id),
            )
        except Exception:
            pass
        return {"success": True, "reviewer": "creator", "overall": overall}

    if not data.ratings:
        raise HTTPException(status_code=400, detail="At least one rating is required")

    overall = round(sum(data.ratings.values()) / len(data.ratings), 2)

    # Persist review directly on the application document (no model migration needed)
    await app.update(
        {"$set": {
            "client_rating": {
                "ratings": data.ratings,
                "overall": overall,
                "review": data.review,
                "tags": data.tags or [],
                "private_note": data.private_note,
                "reviewed_at": datetime.utcnow().isoformat(),
            }
        }}
    )

    # Update creator's aggregate rating on User.profile + CrewProfile
    creator = await User.get(app.crew_id)
    if creator:
        old_count  = (creator.profile.review_count if creator.profile else None) or 0
        old_rating = (creator.profile.rating       if creator.profile else None) or 0.0
        new_count  = old_count + 1
        new_rating = round((old_rating * old_count + overall) / new_count, 2)
        # Write to user.profile.rating (where the field is defined)
        await creator.update({"$set": {
            "profile.rating": new_rating,
            "profile.review_count": new_count,
        }})
        # Sync to CrewProfile.rating so Smart Connect ranking is accurate
        try:
            from app.models.schema import CrewProfile as _CP
            cp = await _CP.find_one(_CP.user_id == creator.id)
            if cp:
                from app.models.schema import Rating as _R
                cp.rating = _R(overall=new_rating, total_reviews=new_count)
                cp.last_review_date = datetime.utcnow()
                await cp.save()
        except Exception:
            pass

    # Notify creator they received a review
    try:
        from app.services.notification_service import NotificationService
        await NotificationService.review_received(
            user_id=str(app.crew_id),
            reviewer_id=str(current_user.id),
            rating=overall,
            job_title=job.title,
        )
    except Exception:
        pass

    # ETF: review submission (client) + positive review bonus (creator)
    try:
        from app.services.etf_points_service import EtfPointsService
        # Client gets points for leaving a review (platform activity)
        await EtfPointsService.award_points(
            user_id=current_user.id,
            action="review.submitted",
            source_type="application",
            source_id=proposal_id,
            counterparty_id=app.crew_id,
            description=f"Submitted review for: {job.title}",
        )
        # Creator gets bonus if review is ≥4 stars (positive review bonus)
        if overall >= 4.0:
            await EtfPointsService.award_points(
                user_id=app.crew_id,
                action="positive_review",
                source_type="application",
                source_id=proposal_id,
                counterparty_id=current_user.id,
                description=f"Received {overall}★ review on: {job.title}",
            )
    except Exception:
        pass

    return {"success": True, "message": "Review submitted successfully", "overall": overall}


@router.post(
    "/{proposal_id}/review-client",
    summary="Creator reviews the client after project completion",
)
async def review_client(
    proposal_id: str = Path(...),
    data: RatingCreate = ...,
    current_user: User = Depends(get_current_user),
):
    app = await Application.get(_oid(proposal_id))
    if not app:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Only the creator (crew_id) can review the client
    if str(app.crew_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the creator can leave a client review")

    job = await JobPost.get(app.project_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Can only review after project is completed")

    if not data.ratings:
        raise HTTPException(status_code=400, detail="At least one rating is required")

    overall = round(sum(data.ratings.values()) / len(data.ratings), 2)

    # Persist creator's review on the application document
    await app.update(
        {"$set": {
            "creator_rating": {
                "ratings": data.ratings,
                "overall": overall,
                "review": data.review,
                "tags": data.tags or [],
                "reviewed_at": datetime.utcnow().isoformat(),
            }
        }}
    )

    # Update client's aggregate rating (on User document)
    client = await User.get(job.client_id)
    if client:
        old_count  = getattr(client, "client_review_count", None) or 0
        old_rating = getattr(client, "client_rating",       None) or 0.0
        new_count  = old_count + 1
        new_rating = round((old_rating * old_count + overall) / new_count, 2)
        await client.update({"$set": {
            "client_rating":       new_rating,
            "client_review_count": new_count,
        }})

    # Notify client they received a review
    try:
        from app.services.notification_service import NotificationService
        await NotificationService.review_received(
            user_id=str(job.client_id),
            reviewer_id=str(current_user.id),
            rating=overall,
            job_title=job.title,
        )
    except Exception:
        pass

    # ETF points for leaving a review
    try:
        from app.services.etf_points_service import EtfPointsService
        await EtfPointsService.award_points(
            user_id=current_user.id,
            action="review.given",
            source_type="application",
            source_id=proposal_id,
            counterparty_id=job.client_id,
            description=f"Left a review for client on: {job.title}",
        )
    except Exception:
        pass

    return {"success": True, "message": "Client review submitted", "overall": overall}


@router.get(
    "/{proposal_id}/reviews",
    summary="Get both reviews for a completed proposal",
)
async def get_proposal_reviews(
    proposal_id: str = Path(...),
    current_user: User = Depends(get_current_user),
):
    app = await Application.get(_oid(proposal_id))
    if not app:
        raise HTTPException(status_code=404, detail="Proposal not found")
    job = await JobPost.get(app.project_id)
    # Only the two parties can read reviews
    is_creator = str(app.crew_id) == str(current_user.id)
    is_client  = job and str(job.client_id) == str(current_user.id)
    if not (is_creator or is_client):
        raise HTTPException(status_code=403, detail="Not authorised")
    return {
        "client_rating":  getattr(app, "client_rating",  None),
        "creator_rating": getattr(app, "creator_rating", None),
        "proposal_id":    proposal_id,
        "job_title":      job.title if job else None,
    }


# ── Direct Hire ───────────────────────────────────────────────────────────────

class DirectHireRequest(BaseModel):
    job_id: str
    creator_id: str
    note: Optional[str] = None  # optional message to creator

@router.post(
    "/direct-hire",
    status_code=status.HTTP_201_CREATED,
    summary="Client directly hires a creator (skips proposal phase)",
)
async def direct_hire(
    data: DirectHireRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Client bypasses the proposal flow and directly hires a creator.

    1. Verifies the client owns the job post.
    2. Verifies the creator is not the client (no self-hire).
    3. Creates an Application with status='accepted'.
    4. Notifies the creator.
    5. Optionally starts a conversation with a welcome message.
    """
    from app.models.schema import JobPost, Application
    from bson import ObjectId as _OId

    job = await JobPost.get(_oid(data.job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Project not found")
    if str(job.client_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You do not own this project")
    if job.status != "open":
        raise HTTPException(status_code=400, detail="Project must be open to hire")
    if data.creator_id == str(current_user.id):
        raise HTTPException(status_code=400, detail="You cannot hire yourself")

    # Prevent duplicate — if already hired, return existing
    existing = await Application.find_one(
        Application.project_id == _oid(data.job_id),
        Application.crew_id == _oid(data.creator_id),
    )
    if existing:
        if existing.status == "accepted":
            return {"id": str(existing.id), "status": "accepted", "job_id": data.job_id, "already_hired": True}
        existing.status = "accepted"
        await existing.save()
        return {"id": str(existing.id), "status": "accepted", "job_id": data.job_id}

    app = Application(
        project_id=_oid(data.job_id),
        crew_id=_oid(data.creator_id),
        cover_letter=data.note or f"Directly hired by client for: {job.title}",
        status="accepted",
    )
    await app.insert()

    job.proposal_count = (job.proposal_count or 0) + 1
    job.status = "pending_funding"
    await job.save()

    # Notify creator
    try:
        from app.services.notification_service import NotificationService
        await NotificationService.proposal_status_updated(
            creator_id=data.creator_id,
            client_id=str(current_user.id),
            job_title=job.title,
            new_status="accepted",
            job_id=data.job_id,
        )
    except Exception:
        pass

    # Open a conversation with the creator
    try:
        from app.services.messaging_service import MessagingService
        welcome = data.note or (
            f"Hi! I've hired you directly for my project: **{job.title}**. "
            "Looking forward to working with you!"
        )
        await MessagingService.create_or_get_conversation(
            participants=[str(current_user.id), data.creator_id],
            job_id=data.job_id,
            initial_message=welcome,
            sender_id=str(current_user.id),
        )
    except Exception:
        pass

    return {"id": str(app.id), "status": "accepted", "job_id": data.job_id}
