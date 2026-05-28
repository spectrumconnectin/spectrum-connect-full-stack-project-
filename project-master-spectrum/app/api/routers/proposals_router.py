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
from typing import Optional, List
from bson import ObjectId

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
    if job.status != "open":
        raise HTTPException(status_code=400, detail="This job is not accepting proposals")

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

    # increment proposal count
    job.proposal_count = (job.proposal_count or 0) + 1
    await job.save()

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
            "cover_letter": app.cover_letter,
            "proposed_budget": app.proposed_budget,
            "role": app.role,
            "status": app.status,
            "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
        })

    return results


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

    app.status = data.status
    await app.save()

    return {"id": str(app.id), "status": app.status}


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
