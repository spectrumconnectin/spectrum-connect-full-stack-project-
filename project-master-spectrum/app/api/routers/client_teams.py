"""
Client Teams API Routes

Provides teams/projects list for the client "My Teams" page.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.auth.auth import get_current_user
from app.models.schema import User
from app.services.profile_service import ProfileService as ProjectService

router = APIRouter(prefix="/client/teams", tags=["Client Teams"])


class TeamMember(BaseModel):
    user_id: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class TeamProject(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    end_date: Optional[str] = None
    days_remaining: Optional[int] = None
    member_count: int = 0
    team_members: List[TeamMember] = []
    category: Optional[str] = None
    icon_type: Optional[str] = None


class TeamStats(BaseModel):
    total: int = 0
    in_progress: int = 0
    completed: int = 0
    on_hold: int = 0


class ClientTeamsResponse(BaseModel):
    stats: TeamStats
    projects: List[TeamProject]


@router.get("", response_model=ClientTeamsResponse)
async def list_client_teams(
    status: str = Query("all", description="Filter by status (all, in_progress, completed, on_hold, active)"),
    current_user: User = Depends(get_current_user),
):
    """Return projects for the current client with team info."""
    user_id = str(current_user.id)

    # Load all projects for stats
    all_projects, total_count = await ProjectService.get_user_projects(
        user_id=user_id,
        limit=500,
    )

    stats = TeamStats(
        total=total_count,
        in_progress=len([p for p in all_projects if p.status in {"in_progress", "active"}]),
        completed=len([p for p in all_projects if p.status == "completed"]),
        on_hold=len([p for p in all_projects if p.status == "on_hold"]),
    )

    # Filter for list
    list_status = None if status == "all" else status
    projects, _ = await ProjectService.get_user_projects(
        user_id=user_id,
        status=list_status,
        limit=100,
    )

    projects_payload: List[TeamProject] = []
    for project in projects:
        days_remaining = None
        if project.end_date:
            delta = project.end_date - project.end_date.__class__.utcnow()
            days_remaining = max(0, delta.days)

        projects_payload.append(
            TeamProject(
                id=str(project.id),
                title=project.title,
                description=project.description,
                status=project.status,
                end_date=project.end_date.isoformat() if project.end_date else None,
                days_remaining=days_remaining,
                member_count=len(project.team_members or []),
                team_members=[
                    TeamMember(
                        user_id=member.user_id,
                        username=member.username,
                        avatar_url=member.avatar_url,
                    )
                    for member in project.team_members or []
                ],
                category=project.category,
                icon_type=project.icon_type,
            )
        )

    return ClientTeamsResponse(stats=stats, projects=projects_payload)

