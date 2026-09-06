"""
Job Post Router - Upwork-style Job Marketplace Endpoints
Film Industry specific job postings
"""
from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from typing import List, Optional

from app.models.schema import User, JobPost, ProjectRole
from app.auth.auth import get_current_user
from app.services.job_service import JobService
from app.services import role_service, workspace_service
from app.api.schemas.job_schemas import (
    JobPostCreate,
    JobPostUpdate,
    JobPostRead,
    JobPostListRead,
    JobPostStatusUpdate,
    JobPostSearchFilters,
    ProjectRoleCreate,
)


router = APIRouter()


# Helper function to convert Beanie JobPost to dict
def job_to_dict(job: JobPost) -> dict:
    """Convert JobPost Beanie model to dict for Pydantic response"""
    job_dict = job.model_dump()
    job_dict['id'] = str(job.id)
    job_dict['client_id'] = str(job.client_id)
    job_dict['created_at'] = job.id.generation_time if job.id else None

    # Convert ObjectIds in lists
    if job.invited_crew:
        job_dict['invited_crew'] = [str(id) for id in job.invited_crew]
    if job.hired_crew:
        job_dict['hired_crew'] = [str(id) for id in job.hired_crew]

    # Roles carry derived fields the model computes rather than stores.
    if job.roles:
        for role, role_dict in zip(job.roles, job_dict.get('roles') or []):
            role_dict['seats_remaining'] = role.seats_remaining
            role_dict['budget_per_seat'] = role.budget_per_seat()

    return job_dict


# ============================================================================
# JOB POST CRUD ENDPOINTS
# ============================================================================

@router.post(
    "",
    response_model=JobPostRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create new job post",
    description="Create a new Upwork-style job posting. Job starts in 'draft' status."
)
async def create_job_post(
    job_data: JobPostCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new job post for hiring film industry crew.

    **Film Industry Departments:**
    - Camera, Sound, Lighting, Grip, Electric
    - Art Department, Costume, Makeup & Hair, VFX
    - Post-Production, Editing, Color Grading, Sound Design
    - Music Composition, Production Management
    - Directing, Producing, Cinematography
    - Scripting, Storyboarding, Animation, 3D Modeling, Motion Graphics

    **Budget Types:**
    - `fixed`: One-time payment for entire project
    - `hourly`: Pay by the hour
    - `daily`: Day rate
    - `weekly`: Week rate

    **Example:**
    ```json
    {
        "title": "Cinematographer Needed for Short Film",
        "description": "Looking for an experienced cinematographer...",
        "department": "Camera",
        "role": "Cinematographer",
        "tags": ["short-film", "narrative", "drama"],
        "crew_size": "small_crew",
        "complexity": "intermediate",
        "budget_type": "daily",
        "daily_rate": {"min": 500, "max": 800},
        "estimated_duration": 5,
        "skills": ["ARRI Cameras", "Lighting", "Shot Composition"],
        "experience_level": "intermediate"
    }
    ```
    """
    job = await JobService.create_job_post(current_user, job_data)
    try:
        from app.services.audit_service import log_event
        await log_event(
            "job.posted",
            actor=current_user,
            target_type="job",
            target_id=str(job.id),
            metadata={"title": job.title, "department": getattr(job, "department", None)},
        )
    except Exception:
        pass
    return job_to_dict(job)


@router.get(
    "/me",
    response_model=List[JobPostListRead],
    summary="Get my job posts",
    description="Get all job posts created by the current user"
)
async def get_my_jobs(
    status_filter: Optional[str] = Query(None, description="Filter by status: draft, open, in_progress, completed, cancelled, closed"),
    current_user: User = Depends(get_current_user)
):
    """
    Get all your job posts with optional status filter.
    """
    jobs = await JobService.get_my_jobs(current_user, status_filter)
    return [job_to_dict(j) for j in jobs]




@router.get(
    "/search",
    response_model=dict,
    summary="Search/browse job posts",
    description="Search and filter job posts with pagination"
)
async def search_jobs(
    department: Optional[str] = Query(None, description="Filter by department"),
    role: Optional[str] = Query(None, description="Filter by role"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    crew_size: Optional[str] = Query(None, description="individual, small_crew, full_crew"),
    complexity: Optional[str] = Query(None, description="simple, intermediate, complex"),
    budget_type: Optional[str] = Query(None, description="fixed, hourly, daily, weekly"),
    min_budget: Optional[float] = Query(None, ge=0, description="Minimum budget"),
    max_budget: Optional[float] = Query(None, ge=0, description="Maximum budget"),
    experience_level: Optional[str] = Query(None, description="student, entry, intermediate, expert"),
    skills: Optional[List[str]] = Query(None, description="Required skills"),
    status: Optional[str] = Query(None, description="Job status (defaults to 'open')"),
    search: Optional[str] = Query(None, description="Search text"),
    skip: int = Query(0, ge=0, description="Skip N results"),
    limit: int = Query(20, ge=1, le=100, description="Limit results"),
    sort_by: str = Query("created_at", description="Sort field: created_at, deadline, budget, proposals, views"),
    sort_order: str = Query("desc", description="Sort order: asc or desc")
):
    """
    Search and filter job posts with comprehensive options.

    **Example:**
    ```
    GET /jobs/search?department=Camera&experience_level=intermediate&sort_by=deadline&sort_order=asc
    ```

    **Returns:**
    ```json
    {
        "total": 45,
        "skip": 0,
        "limit": 20,
        "jobs": [...]
    }
    ```
    """
    filters = JobPostSearchFilters(
        department=department,
        role=role,
        tags=tags,
        crew_size=crew_size,
        complexity=complexity,
        budget_type=budget_type,
        min_budget=min_budget,
        max_budget=max_budget,
        experience_level=experience_level,
        skills=skills,
        status=status,
        search=search,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )

    result = await JobService.search_jobs(filters)
    result['jobs'] = [job_to_dict(j) for j in result['jobs']]
    return result


@router.get(
    "/{job_id}",
    response_model=JobPostRead,
    summary="Get job post by ID",
    description="Get detailed job post information"
)
async def get_job(
    job_id: str = Path(..., description="Job Post ID")
):
    """
    Get complete job post details.

    Also increments the view count.
    """
    job = await JobService.get_job_by_id(job_id)

    # Increment view count (fire and forget)
    await JobService.increment_views(job_id)

    return job_to_dict(job)


@router.get(
    "/{job_id}/workspace",
    summary="Team workspace for a project",
    description=(
        "Roster, per-member milestones, the viewer's own tasks, shared "
        "deliveries, progress and the team conversation id."
    ),
)
async def get_job_workspace(
    job_id: str = Path(..., description="Job Post ID"),
    current_user: User = Depends(get_current_user),
):
    """
    The shared workspace for everyone hired onto a project.

    Open to the client **and** every hired creator — a camera operator needs the
    roster and the team chat as much as the client does. Creators see the full
    team and their own tasks, but not teammates' payment amounts.
    """
    job = await JobService.get_job_by_id(job_id)
    workspace = await workspace_service.get_workspace(job, str(current_user.id))

    # Convene the team chat on first visit, so a project hired before this
    # existed still gets one, and late hires are added to it.
    if workspace["team_size"] > 0 and not workspace["conversation_id"]:
        conversation = await workspace_service.ensure_team_conversation(
            job,
            initial_message=(
                f"Welcome to the team for **{job.title}**. "
                "Use this chat to coordinate, share files and discuss deliverables."
            ),
        )
        if conversation:
            workspace["conversation_id"] = str(conversation.id)

    return workspace


@router.get(
    "/{job_id}/roles",
    summary="Get role staffing for a project",
    description=(
        "Per-role breakdown: seats needed, seats filled, applicant counts and "
        "budget allocation. Creators use this to pick a role to apply for; "
        "clients use it for the staffing header."
    ),
)
async def get_job_roles(
    job_id: str = Path(..., description="Job Post ID"),
):
    """Role staffing for a project.

    Legacy job posts with no explicit roles fall back to roles derived from
    their crew_call / role fields, so callers can render a role list for any
    project. Derived roles are marked so the UI can hide "apply to this role"
    on posts that predate role-based hiring.
    """
    job = await JobService.get_job_by_id(job_id)

    if job.roles:
        return {
            "job_id": str(job.id),
            "title": job.title,
            "multi_role": True,
            "summary": job.roles_summary(),
            "roles": await role_service.role_breakdown(job),
        }

    derived = job.effective_roles()
    return {
        "job_id": str(job.id),
        "title": job.title,
        "multi_role": False,
        "summary": {
            "total_roles": len(derived),
            "total_seats": sum(r.count for r in derived),
            "filled_seats": 0,
            "open_seats": sum(r.count for r in derived),
            "fully_staffed": False,
            "allocated_budget": 0,
        },
        "roles": [
            {
                "role_id": None,  # not persisted — cannot be applied to directly
                "title": r.title,
                "count": r.count,
                "filled_count": 0,
                "seats_remaining": r.count,
                "status": "open",
                "skills": r.skills or [],
                "description": r.description,
                "derived": True,
            }
            for r in derived
        ],
    }


@router.post(
    "/{job_id}/roles",
    response_model=JobPostRead,
    summary="Add a role to a project",
    description="Append a new staffed role to an existing project (owner only).",
)
async def add_job_role(
    job_id: str = Path(..., description="Job Post ID"),
    role_data: ProjectRoleCreate = ...,
    current_user: User = Depends(get_current_user),
):
    """Add a role after the project is live — e.g. the shoot grew and now needs
    a second camera operator."""
    job = await JobService.get_job_by_id(job_id)
    if job.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this job post",
        )
    if job.status in ("completed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add roles to a {job.status} project",
        )

    new_role = ProjectRole(**role_data.model_dump(exclude={"role_id"}))
    roles = list(job.roles or [])
    roles.append(new_role)
    role_service.validate_role_budgets(roles, job.budget.max if job.budget else None)

    job.roles = roles
    await job.save()
    await role_service.recount_fills(job)
    return job_to_dict(job)


@router.patch(
    "/{job_id}/roles/{role_id}/close",
    response_model=JobPostRead,
    summary="Stop recruiting for a role",
    description="Close a role to new applications without removing existing hires.",
)
async def close_job_role(
    job_id: str = Path(..., description="Job Post ID"),
    role_id: str = Path(..., description="Role ID"),
    current_user: User = Depends(get_current_user),
):
    """Close a role the client no longer wants to fill.

    Existing hires on the role keep their applications, escrow and milestones —
    this only stops new applications.
    """
    job = await JobService.get_job_by_id(job_id)
    if job.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this job post",
        )

    role = job.get_role(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found on this project",
        )

    role.status = "closed"
    await job.save()
    return job_to_dict(job)


@router.put(
    "/{job_id}",
    response_model=JobPostRead,
    summary="Update job post",
    description="Update job post details (owner only)"
)
async def update_job(
    job_id: str = Path(..., description="Job Post ID"),
    update_data: JobPostUpdate = ...,
    current_user: User = Depends(get_current_user)
):
    """
    Update job post details. Only the job owner can update.

    Cannot update completed or cancelled jobs.
    """
    job = await JobService.get_job_by_id(job_id)
    updated_job = await JobService.update_job(job, current_user, update_data)
    return job_to_dict(updated_job)


@router.patch(
    "/{job_id}/status",
    response_model=JobPostRead,
    summary="Update job post status",
    description="Change job post status"
)
async def update_job_status(
    job_id: str = Path(..., description="Job Post ID"),
    status_data: JobPostStatusUpdate = ...,
    current_user: User = Depends(get_current_user)
):
    """
    Update job post status.

    **Status transitions:**
    - `draft` → `open` (publish job)
    - `open` → `in_progress` (start working with hired crew)
    - `in_progress` → `completed` (mark as completed)
    - Any → `cancelled` (cancel job)
    - `open` → `closed` (close to new proposals)

    **Notes:**
    - Cannot change status of completed jobs
    - Cannot change status of cancelled jobs
    - Publishing a job sets `published_at` timestamp
    - Completing/cancelling sets `closed_at` timestamp
    """
    job = await JobService.get_job_by_id(job_id)
    updated_job = await JobService.update_job_status(job, current_user, status_data)
    return job_to_dict(updated_job)


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete job post",
    description="Delete job post (owner only, draft or no proposals)"
)
async def delete_job(
    job_id: str = Path(..., description="Job Post ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a job post permanently.

    **Restrictions:**
    - Can only delete draft jobs
    - Cannot delete jobs with proposals (cancel them instead)
    - Must be job owner
    """
    job = await JobService.get_job_by_id(job_id)
    await JobService.delete_job(job, current_user)
    return {"message": "Job post deleted successfully"}


# ============================================================================
# JOB POST ANALYTICS & STATS
# ============================================================================

@router.get(
    "/{job_id}/team",
    response_model=list,
    summary="Get all hired creators for a job (crew team)",
    description="Returns every accepted application with creator profile and escrow summary"
)
async def get_job_team(
    job_id: str = Path(..., description="Job Post ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all accepted (hired) creators on a job, along with a brief escrow
    summary per creator. Used by the payments page to show multi-creator funding UI.

    **Who:** Client (job owner) only.
    """
    from app.models.schema import Application
    from app.models.escrow import Escrow as EscrowDoc
    import asyncio

    job = await JobService.get_job_by_id(job_id)
    if str(job.client_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this team"
        )

    hired_apps = await Application.find(
        Application.project_id == job.id,
        Application.status == "accepted",
    ).to_list()

    async def _enrich(app):
        creator = await User.get(app.crew_id)
        profile = creator.profile if creator else None

        # Budget the client earmarked for this seat — the default amount to fund
        # this member's escrow with on a multi-role project.
        member_role = job.get_role(app.role_id) if app.role_id else None
        role_budget = member_role.budget_per_seat() if member_role else None

        # Find escrow for this (job, creator) pair
        escrow = await EscrowDoc.find_one({
            "job_post_id": job.id,
            "creator_id": app.crew_id,
        })

        return {
            "application_id": str(app.id),
            "creator_id": str(app.crew_id),
            "creator_name": (
                (profile.display_name or f"{profile.first_name or ''} {profile.last_name or ''}".strip())
                if profile else (creator.username if creator else "Unknown")
            ),
            "creator_username": creator.username if creator else None,
            "creator_avatar": profile.profile_picture if profile else None,
            "creator_title": profile.headline if profile else None,
            "role_id": app.role_id,
            "role": app.role,
            "role_budget_per_seat": role_budget,
            "proposed_budget": app.proposed_budget,
            "escrow": {
                "escrow_id": str(escrow.id),
                "status": escrow.status,
                "total_amount": escrow.total_amount,
                "funded_amount": escrow.funded_amount,
                "released_amount": escrow.released_amount,
                "milestone_count": len(escrow.milestones),
                "funded_milestones": sum(1 for m in escrow.milestones if m.status == "funded"),
                "released_milestones": sum(1 for m in escrow.milestones if m.status == "released"),
            } if escrow else None,
        }

    results = await asyncio.gather(*[_enrich(app) for app in hired_apps])
    return list(results)


@router.get(
    "/{job_id}/stats",
    response_model=dict,
    summary="Get job post statistics",
    description="Get views, proposals stats (owner only)"
)
async def get_job_stats(
    job_id: str = Path(..., description="Job Post ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Get job post statistics (owner only).

    **Returns:**
    ```json
    {
        "view_count": 234,
        "proposal_count": 12,
        "hired_crew_count": 2,
        "status": "in_progress"
    }
    ```
    """
    job = await JobService.get_job_by_id(job_id)

    # Verify ownership
    if job.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view these stats"
        )

    return {
        "view_count": job.view_count,
        "proposal_count": job.proposal_count,
        "hired_crew_count": len(job.hired_crew) if job.hired_crew else 0,
        "status": job.status,
        "published_at": job.published_at,
        "closed_at": job.closed_at
    }
