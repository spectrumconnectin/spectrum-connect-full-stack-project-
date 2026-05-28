"""
Creator Smart Connect API

Returns personalized project matches for creators based on their skills.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.auth.auth import get_current_user
from app.models.schema import User, JobPost
from app.services.job_service import JobService
from app.api.schemas.job_schemas import JobPostSearchFilters

router = APIRouter(prefix="/creator/smart-connect", tags=["Creator Smart Connect"])


class SmartMatch(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    tags: List[str] = []
    skills: List[str] = []
    match_percent: int = 0
    budget_type: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    client_name: Optional[str] = None
    client_avatar: Optional[str] = None
    project_type: Optional[str] = None
    roles_open: Optional[int] = None
    created_at: Optional[datetime] = None


class SmartConnectResponse(BaseModel):
    matches: List[SmartMatch] = []


@router.get("", response_model=SmartConnectResponse)
async def get_smart_matches(
    limit: int = Query(9, ge=1, le=30),
    current_user: User = Depends(get_current_user),
):
    # Collect user skills
    skills = []
    if current_user.profile and current_user.profile.skills:
        skills = [s.name for s in current_user.profile.skills if getattr(s, "name", None)]

    filters = JobPostSearchFilters(
        status="open",
        limit=limit,
    )
    jobs_data = await JobService.search_jobs(filters)
    jobs = jobs_data.get("jobs", [])

    matches: List[SmartMatch] = []
    for job in jobs:
        match_percent = 70
        if skills and job.skills:
            overlap = set(sk.lower() for sk in skills).intersection({sk.lower() for sk in job.skills})
            if overlap:
                match_percent = min(100, max(80, int((len(overlap) / len(job.skills)) * 100)))

        # ✅ FIX: JobPost has client_id, not client_profile — fetch the user
        client_name = None
        client_avatar = None
        if job.client_id:
            try:
                client_user = await User.get(job.client_id)
                if client_user and client_user.profile:
                    p = client_user.profile
                    client_name = (
                        p.display_name
                        or f"{p.first_name or ''} {p.last_name or ''}".strip()
                        or None
                    )
                    client_avatar = p.profile_picture
            except Exception:
                pass

        matches.append(
            SmartMatch(
                id=str(job.id),
                title=job.title,
                description=job.description,
                tags=job.tags or [],
                skills=job.skills or [],
                match_percent=match_percent,
                budget_type=job.budget_type,
                budget_min=getattr(job.budget, "min", None),
                budget_max=getattr(job.budget, "max", None),
                client_name=client_name,
                client_avatar=client_avatar,
                project_type=job.department,
                roles_open=getattr(job.workspace, "roles_required", None),
                created_at=getattr(job, "published_at", None),
            )
        )

    return SmartConnectResponse(matches=matches)