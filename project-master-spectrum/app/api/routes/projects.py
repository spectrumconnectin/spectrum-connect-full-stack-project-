"""
Project API Routes

Endpoints for project management:
- Project CRUD (create, read, update, delete)
- Team member management
- Activity feed
- Deadlines/milestones
- Dashboard summary
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse

from app.models.schema import User
from app.models.project import Project, ActivityLog, ProjectDeadline
from app.services.project_service import ProjectService
from app.api.schemas.project_schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectProgressUpdate,
    ProjectResponse,
    ProjectListResponse,
    TeamMemberAdd,
    TeamMemberUpdate,
    TeamMemberResponse,
    ActivityLogResponse,
    ActivityFeedResponse,
    DeadlineCreate,
    DeadlineUpdate,
    DeadlineResponse,
    DeadlineListResponse,
    DashboardSummaryResponse,
    ProjectStats,
    CommunityProjectResponse,
)
from app.auth.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


# ==================== Helper Functions ====================

def _project_to_response(project: Project) -> ProjectResponse:
    """Convert Project model to response schema"""
    team_members = [
        TeamMemberResponse(
            user_id=m.user_id,
            username=m.username,
            avatar_url=m.avatar_url,
            role=m.role,
            permissions=m.permissions,
            joined_at=m.joined_at,
            invitation_status=m.invitation_status
        )
        for m in project.team_members
    ]

    return ProjectResponse(
        id=str(project.id),
        title=project.title,
        description=project.description,
        client_id=project.client_id,
        status=project.status,
        progress_percentage=project.progress_percentage,
        team_members=team_members,
        total_roles=project.total_roles,
        filled_roles=project.filled_roles,
        tags=project.tags,
        category=project.category,
        icon_type=project.icon_type,
        start_date=project.start_date,
        end_date=project.end_date,
        created_at=project.created_at,
        updated_at=project.updated_at,
        is_featured=project.is_featured,
        is_public=project.is_public,
        job_post_id=project.job_post_id,
        budget_min=project.budget_min,
        budget_max=project.budget_max,
        location=project.location
    )


def _activity_to_response(activity: ActivityLog) -> ActivityLogResponse:
    """Convert ActivityLog to response schema"""
    return ActivityLogResponse(
        id=str(activity.id),
        activity_type=activity.activity_type,
        project_id=activity.project_id,
        project_title=activity.project_title,
        actor_id=activity.actor_id,
        actor_name=activity.actor_name,
        actor_avatar=activity.actor_avatar,
        message=activity.message,
        metadata=activity.metadata,
        created_at=activity.created_at
    )


def _deadline_to_response(deadline: ProjectDeadline) -> DeadlineResponse:
    """Convert ProjectDeadline to response schema"""
    return DeadlineResponse(
        id=str(deadline.id),
        project_id=deadline.project_id,
        project_title=deadline.project_title,
        title=deadline.title,
        description=deadline.description,
        due_date=deadline.due_date,
        priority=deadline.priority,
        status=deadline.status,
        assigned_to=deadline.assigned_to,
        created_by=deadline.created_by,
        created_at=deadline.created_at,
        completed_at=deadline.completed_at,
        completed_by=deadline.completed_by,
        days_remaining=deadline.days_remaining()
    )


# ==================== Project CRUD ====================

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new project"""
    project = await ProjectService.create_project(
        client_id=str(current_user.id),
        title=data.title,
        description=data.description,
        category=data.category,
        tags=data.tags,
        total_roles=data.total_roles,
        icon_type=data.icon_type,
        is_public=data.is_public,
        budget_min=data.budget_min,
        budget_max=data.budget_max,
        location=data.location,
        start_date=data.start_date,
        end_date=data.end_date
    )

    return _project_to_response(project)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """
    List user's projects with optional filters

    - status: Filter by status (in_progress, completed, on_hold, etc.)
    - search: Search in title, description, tags
    """
    offset = (page - 1) * page_size

    projects, total = await ProjectService.get_user_projects(
        user_id=str(current_user.id),
        status=status,
        search=search,
        limit=page_size,
        offset=offset
    )

    project_responses = [_project_to_response(p) for p in projects]

    return ProjectListResponse(
        projects=project_responses,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get project details"""
    project = await ProjectService.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Check access (owner, team member, or public)
    if not (
        project.is_owner(str(current_user.id)) or
        project.is_team_member(str(current_user.id)) or
        project.is_public
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this project"
        )

    return _project_to_response(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update project details"""
    update_data = data.dict(exclude_unset=True)

    project = await ProjectService.update_project(
        project_id=project_id,
        user_id=str(current_user.id),
        **update_data
    )

    return _project_to_response(project)


@router.patch("/{project_id}/progress", response_model=ProjectResponse)
async def update_project_progress(
    project_id: str,
    data: ProjectProgressUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update project progress percentage"""
    project = await ProjectService.update_progress(
        project_id=project_id,
        user_id=str(current_user.id),
        progress_percentage=data.progress_percentage
    )

    return _project_to_response(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Archive/delete project"""
    await ProjectService.delete_project(
        project_id=project_id,
        user_id=str(current_user.id)
    )


# ==================== Team Management ====================

@router.post("/{project_id}/members", response_model=ProjectResponse)
async def add_team_member(
    project_id: str,
    data: TeamMemberAdd,
    current_user: User = Depends(get_current_user)
):
    """Add a team member to the project"""
    project = await ProjectService.add_team_member(
        project_id=project_id,
        user_id=data.user_id,
        role=data.role,
        added_by=str(current_user.id),
        permissions=data.permissions
    )

    return _project_to_response(project)


@router.delete("/{project_id}/members/{user_id}", response_model=ProjectResponse)
async def remove_team_member(
    project_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove a team member from the project"""
    project = await ProjectService.remove_team_member(
        project_id=project_id,
        user_id=user_id,
        removed_by=str(current_user.id)
    )

    return _project_to_response(project)


@router.patch("/{project_id}/members/{user_id}", response_model=ProjectResponse)
async def update_team_member(
    project_id: str,
    user_id: str,
    data: TeamMemberUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update team member role and permissions"""
    update_data = data.dict(exclude_unset=True)

    project = await ProjectService.update_team_member(
        project_id=project_id,
        user_id=user_id,
        updated_by=str(current_user.id),
        **update_data
    )

    return _project_to_response(project)


# ==================== Activity Feed ====================

@router.get("/activity/feed", response_model=ActivityFeedResponse)
async def get_activity_feed(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Get activity feed for all user's projects"""
    activities, total, has_more = await ProjectService.get_activity_feed(
        user_id=str(current_user.id),
        limit=limit,
        offset=offset
    )

    activity_responses = [_activity_to_response(a) for a in activities]

    return ActivityFeedResponse(
        activities=activity_responses,
        total=total,
        has_more=has_more
    )


@router.get("/{project_id}/activity", response_model=list[ActivityLogResponse])
async def get_project_activity(
    project_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get activity log for a specific project"""
    activities = await ProjectService.get_project_activity(
        project_id=project_id,
        user_id=str(current_user.id),
        limit=limit
    )

    return [_activity_to_response(a) for a in activities]


# ==================== Deadlines ====================

@router.post("/deadlines", response_model=DeadlineResponse, status_code=status.HTTP_201_CREATED)
async def create_deadline(
    data: DeadlineCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new deadline"""
    deadline = await ProjectService.create_deadline(
        project_id=data.project_id,
        created_by=str(current_user.id),
        title=data.title,
        due_date=data.due_date,
        description=data.description,
        priority=data.priority,
        assigned_to=data.assigned_to
    )

    return _deadline_to_response(deadline)


@router.get("/deadlines/upcoming", response_model=DeadlineListResponse)
async def get_upcoming_deadlines(
    days: int = Query(default=7, ge=1, le=30),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user)
):
    """Get upcoming deadlines for user's projects"""
    deadlines = await ProjectService.get_upcoming_deadlines(
        user_id=str(current_user.id),
        days=days,
        limit=limit
    )

    deadline_responses = [_deadline_to_response(d) for d in deadlines]

    return DeadlineListResponse(
        deadlines=deadline_responses,
        total=len(deadline_responses)
    )


@router.patch("/deadlines/{deadline_id}", response_model=DeadlineResponse)
async def update_deadline(
    deadline_id: str,
    data: DeadlineUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a deadline"""
    update_data = data.dict(exclude_unset=True)

    deadline = await ProjectService.update_deadline(
        deadline_id=deadline_id,
        user_id=str(current_user.id),
        **update_data
    )

    return _deadline_to_response(deadline)


@router.post("/deadlines/{deadline_id}/complete", response_model=DeadlineResponse)
async def complete_deadline(
    deadline_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark a deadline as completed"""
    deadline = await ProjectService.complete_deadline(
        deadline_id=deadline_id,
        user_id=str(current_user.id)
    )

    return _deadline_to_response(deadline)


@router.delete("/deadlines/{deadline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deadline(
    deadline_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a deadline"""
    await ProjectService.delete_deadline(
        deadline_id=deadline_id,
        user_id=str(current_user.id)
    )


# ==================== Dashboard Summary ====================

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user)
):
    """
    Get complete dashboard data in one API call

    Returns:
    - Active projects (in_progress status)
    - Recent activity feed
    - Upcoming deadlines (next 7 days)
    - Community spotlight (featured projects)
    - Statistics (total projects, active, completed, team members, milestones)
    """
    summary = await ProjectService.get_dashboard_summary(str(current_user.id))

    # Convert to response models
    active_projects = [_project_to_response(p) for p in summary["active_projects"]]
    activity_feed = [_activity_to_response(a) for a in summary["activity_feed"]]
    upcoming_deadlines = [_deadline_to_response(d) for d in summary["upcoming_deadlines"]]

    # Community spotlight
    community_spotlight = []
    for project in summary["community_spotlight"]:
        # Get creator info
        creator = await User.get(project.client_id)
        community_spotlight.append(CommunityProjectResponse(
            id=str(project.id),
            title=project.title,
            creator_id=project.client_id,
            creator_name=creator.username if creator else "Unknown",
            creator_avatar=creator.profile.avatar if creator and creator.profile else None,
            category=project.category,
            tags=project.tags,
            created_at=project.created_at
        ))

    return DashboardSummaryResponse(
        active_projects=active_projects,
        activity_feed=activity_feed,
        upcoming_deadlines=upcoming_deadlines,
        community_spotlight=community_spotlight,
        stats=ProjectStats(**summary["stats"])
    )


# ==================== Community ====================

@router.get("/community/featured", response_model=list[CommunityProjectResponse])
async def get_featured_projects(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user)
):
    """Get featured community projects"""
    projects = await ProjectService.get_featured_projects(limit=limit)

    results = []
    for project in projects:
        creator = await User.get(project.client_id)
        results.append(CommunityProjectResponse(
            id=str(project.id),
            title=project.title,
            creator_id=project.client_id,
            creator_name=creator.username if creator else "Unknown",
            creator_avatar=creator.profile.avatar if creator and creator.profile else None,
            category=project.category,
            tags=project.tags,
            created_at=project.created_at
        ))

    return results
