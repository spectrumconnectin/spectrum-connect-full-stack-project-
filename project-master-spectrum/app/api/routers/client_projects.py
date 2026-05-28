"""
Client Projects API Routes

Provides list + summary data for the client projects page
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.auth.auth import get_current_user
from app.models.schema import User
from app.services.profile_service import ProfileService as ProjectService

router = APIRouter(prefix="/client/projects", tags=["Client Projects"])


class ProjectTeamMemberResponse(BaseModel):
    user_id: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None


class ProjectCardResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    progress_percentage: int = 0
    category: Optional[str] = None
    icon_type: Optional[str] = None
    tags: List[str] = []
    total_roles: int = 0
    filled_roles: int = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    team_members: List[ProjectTeamMemberResponse] = []


class ProjectStatsResponse(BaseModel):
    total_projects: int = 0
    active_projects: int = 0
    completed_projects: int = 0
    collaborators: int = 0


class ClientProjectsResponse(BaseModel):
    stats: ProjectStatsResponse
    projects: List[ProjectCardResponse]


@router.get("", response_model=ClientProjectsResponse)
async def list_client_projects(
    status: str = Query("all", description="Filter by status (all, active, in_progress, completed, on_hold, draft)"),
    search: Optional[str] = Query(None, description="Search by title/description/tags"),
    sort: str = Query("date", description="Sort by date|name|progress|status"),
    current_user: User = Depends(get_current_user),
):
    """
    Returns projects for the logged-in client with summary stats for the UI.
    """
    user_id = str(current_user.id)

    # Fetch all projects for stats
    all_projects, total_count = await ProjectService.get_user_projects(
        user_id=user_id,
        limit=1000,
    )

    # Stats
    active_count = len([p for p in all_projects if p.status in {"active", "in_progress"}])
    completed_count = len([p for p in all_projects if p.status == "completed"])
    collaborators = set()
    for project in all_projects:
        for member in project.team_members:
            collaborators.add(member.user_id)

    stats = ProjectStatsResponse(
        total_projects=total_count,
        active_projects=active_count,
        completed_projects=completed_count,
        collaborators=len(collaborators),
    )

    # Apply filters for list payload
    projects, _ = await ProjectService.get_user_projects(
        user_id=user_id,
        status=status if status != "all" else None,
        search=search,
        limit=100,
    )

    # Sort client-side as needed
    if sort == "name":
        projects = sorted(projects, key=lambda p: p.title.lower())
    elif sort == "progress":
        projects = sorted(projects, key=lambda p: p.progress_percentage, reverse=True)
    elif sort == "status":
        projects = sorted(projects, key=lambda p: p.status)
    else:  # date/default -> relies on created_at desc from service
        pass

    # Shape for UI
    projects_response = []
    for project in projects:
        projects_response.append(
            ProjectCardResponse(
                id=str(project.id),
                title=project.title,
                description=project.description,
                status=project.status,
                progress_percentage=project.progress_percentage or 0,
                category=project.category,
                icon_type=project.icon_type,
                tags=project.tags or [],
                total_roles=project.total_roles or 0,
                filled_roles=project.filled_roles or len(project.team_members or []),
                start_date=project.start_date.isoformat() if project.start_date else None,
                end_date=project.end_date.isoformat() if project.end_date else None,
                team_members=[
                    ProjectTeamMemberResponse(
                        user_id=member.user_id,
                        username=member.username,
                        avatar_url=member.avatar_url,
                        role=member.role,
                    )
                    for member in project.team_members or []
                ],
            )
        )

    return ClientProjectsResponse(stats=stats, projects=projects_response)

