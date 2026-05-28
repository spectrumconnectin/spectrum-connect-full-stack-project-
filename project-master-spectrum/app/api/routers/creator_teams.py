"""
Creator Teams API

Returns projects where the creator is a team member.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.auth.auth import get_current_user
from app.models.project import Project
from app.models.schema import User

router = APIRouter(prefix="/creator/teams", tags=["Creator Teams"])


class TeamMember(BaseModel):
    user_id: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class TeamProject(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    end_date: Optional[datetime] = None
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


class CreatorTeamsResponse(BaseModel):
    stats: TeamStats
    projects: List[TeamProject]


@router.get("", response_model=CreatorTeamsResponse)
async def list_creator_teams(
    status: str = Query("all", description="all|in_progress|completed|on_hold|active"),
    current_user: User = Depends(get_current_user),
):
    user_id = str(current_user.id)

    # All projects user participates in
    all_projects = await Project.find({"team_members.user_id": user_id}).to_list()
    stats = TeamStats(
        total=len(all_projects),
        in_progress=len([p for p in all_projects if p.status in {"in_progress", "active"}]),
        completed=len([p for p in all_projects if p.status == "completed"]),
        on_hold=len([p for p in all_projects if p.status == "on_hold"]),
    )

    filtered = all_projects
    if status != "all":
        filtered = [p for p in all_projects if p.status == status or (status == "in_progress" and p.status == "active")]

    projects_payload: List[TeamProject] = []
    for project in filtered:
        days_remaining = None
        if project.end_date:
            delta = project.end_date - datetime.utcnow()
            days_remaining = max(0, delta.days)

        projects_payload.append(
            TeamProject(
                id=str(project.id),
                title=project.title,
                description=project.description,
                status=project.status,
                end_date=project.end_date,
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

    return CreatorTeamsResponse(stats=stats, projects=projects_payload)

