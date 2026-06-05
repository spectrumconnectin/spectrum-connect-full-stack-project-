from __future__ import annotations
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.auth import get_current_user
from app.models.schema import (
    Application,
    JobPost,
    User,
    Workspace,
)
from app.models.message import Conversation, Message
from app.services.job_service import JobService
from app.api.schemas.job_schemas import JobPostSearchFilters

router = APIRouter(prefix="/creator/dashboard", tags=["Creator Dashboard"])


class DashboardStats(BaseModel):
    name: str
    total_earnings: float | None = 0
    active_projects: int | None = 0
    projects_completed: int | None = 0
    client_satisfaction: float | None = 0
    response_time_hours: int | None = 0


class Opportunity(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    tags: List[str] = []
    skills: List[str] = []
    match_percent: int = 0
    department: Optional[str] = None
    budget_type: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    deadline: Optional[datetime] = None


class ActiveTeam(BaseModel):
    project_id: str
    title: str
    role: Optional[str] = None
    status: Optional[str] = None
    time_remaining_days: Optional[int] = None
    avatar_urls: List[str] = []


class MessagePreview(BaseModel):
    id: str
    name: str
    text: Optional[str] = None
    timestamp: Optional[datetime] = None
    avatar: Optional[str] = None


class TaskItem(BaseModel):
    id: str
    title: str
    project_name: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class CreatorDashboardResponse(BaseModel):
    stats: DashboardStats
    opportunities: List[Opportunity] = []
    active_teams: List[ActiveTeam] = []
    messages: List[MessagePreview] = []
    tasks: List[TaskItem] = []


def _skill_set(user: User) -> set[str]:
    if not user.profile or not user.profile.skills:
        return set()
    return {s.name.lower() for s in user.profile.skills if getattr(s, "name", None)}


@router.get("", response_model=CreatorDashboardResponse)
async def get_creator_dashboard(current_user: User = Depends(get_current_user)):
    name = (
        (current_user.profile.display_name if current_user.profile else None)
        or (
            f"{current_user.profile.first_name} {current_user.profile.last_name}".strip()
            if current_user.profile and (current_user.profile.first_name or current_user.profile.last_name)
            else None
        )
        or current_user.username
    )

    # ── Compute stats live from real data ────────────────────────────────────
    active_projects_count = 0
    projects_completed_count = 0
    total_earnings = 0.0

    try:
        # All accepted applications for this creator
        all_apps = await Application.find(
            {"crew_id": current_user.id, "status": "accepted"}
        ).to_list()

        for app in all_apps:
            if not app.project_id:
                continue
            try:
                job = await JobPost.get(app.project_id)
                if not job:
                    continue
                if job.status == "completed":
                    projects_completed_count += 1
                elif job.status in ("in_progress", "delivered", "approved", "pending_funding"):
                    active_projects_count += 1
            except Exception:
                pass
    except Exception:
        pass

    try:
        from app.models.schema import Transaction as TxModel
        txns = await TxModel.find({
            "recipient_id": current_user.id,
            "status": "completed",
        }).to_list()
        total_earnings = round(sum(float(t.net_amount or t.amount or 0) for t in txns), 2)
    except Exception:
        total_earnings = 0.0

    # client_satisfaction comes from User.rating (updated on every review)
    satisfaction = getattr(current_user, "rating", None) or 0.0
    # Convert 0–5 star rating to a 0–100% value for the UI
    satisfaction_pct = round(satisfaction * 20, 1) if satisfaction else 0.0

    # response_time is stored on user.stats if set
    response_time_h = 0
    if current_user.stats and getattr(current_user.stats, "response_time", None):
        response_time_h = current_user.stats.response_time

    # Persist computed stats back to user.stats so other views (public profile) also benefit
    try:
        from app.models.schema import UserStats
        if not current_user.stats:
            current_user.stats = UserStats()
        current_user.stats.active_projects = active_projects_count
        current_user.stats.projects_completed = projects_completed_count
        current_user.stats.completed_credits = projects_completed_count
        current_user.stats.total_earnings = total_earnings
        current_user.stats.client_satisfaction = satisfaction_pct
        await current_user.save()
    except Exception:
        pass

    dashboard_stats = DashboardStats(
        name=name,
        total_earnings=total_earnings,
        active_projects=active_projects_count,
        projects_completed=projects_completed_count,
        client_satisfaction=satisfaction_pct if satisfaction_pct else None,
        response_time_hours=response_time_h,
    )

    # Opportunities (simple match using overlap of skills with open jobs)
    user_skills = _skill_set(current_user)
    opportunities: List[Opportunity] = []
    try:
        filters = JobPostSearchFilters(limit=3, status="open")
        result = await JobService.search_jobs(filters)
        for job in result.get("jobs", [])[:3]:
            match = 0
            if user_skills and job.skills:
                overlap = user_skills.intersection({s.lower() for s in job.skills})
                match = int((len(overlap) / len(user_skills)) * 100) if user_skills else 0
            opportunities.append(
                Opportunity(
                    id=str(job.id),
                    title=job.title,
                    description=job.description,
                    tags=job.tags or [],
                    skills=job.skills or [],
                    match_percent=match,
                    department=job.department,
                    budget_type=job.budget_type,
                    budget_min=getattr(job.budget, "min", None),
                    budget_max=getattr(job.budget, "max", None),
                    deadline=job.deadline,
                )
            )
    except Exception:
        opportunities = []

    # Active teams (accepted/shortlisted applications)
    active_teams: List[ActiveTeam] = []
    try:
        apps = await Application.find(
            {
                "crew_id": current_user.id,
                "status": {"$in": ["accepted", "in_progress", "shortlisted", "interviewing"]},
            }
        ).to_list(5)
        for app in apps:
            job = await JobPost.get(app.project_id) if app.project_id else None
            deadline = job.deadline if job else None
            remaining_days = None
            if deadline:
                remaining_days = max(0, (deadline - datetime.utcnow()).days)
            active_teams.append(
                ActiveTeam(
                    project_id=str(app.project_id),
                    title=job.title if job else "Project",
                    role=app.role,
                    status=app.status,
                    time_remaining_days=remaining_days,
                    avatar_urls=[],
                )
            )
    except Exception:
        active_teams = []

    # Recent messages (conversation last_message)
    messages: List[MessagePreview] = []
    try:
        # New Conversation model has participants as list of user_id strings
        conversations = await Conversation.find({"participants": str(current_user.id)}).sort("-last_message_at").limit(5).to_list()
        for conv in conversations:
            if not conv.last_message:
                continue
            # Find other participant (participants is now a list of user_id strings)
            other_participant_id = next(
                (p for p in conv.participants if str(p) != str(current_user.id)), None
            )
            other_user: Optional[User] = None
            if other_participant_id:
                try:
                    other_user = await User.get(other_participant_id)
                except Exception:
                    other_user = None
            messages.append(
                MessagePreview(
                    id=str(conv.id),
                    name=other_user.profile.display_name if other_user and other_user.profile else (conv.job_title or "Conversation"),
                    text=conv.last_message,
                    timestamp=conv.last_message_at,
                    avatar=other_user.profile.profile_picture if other_user and other_user.profile else None,
                )
            )
    except Exception:
        messages = []

    # Tasks assigned to the user (from workspaces)
    tasks: List[TaskItem] = []
    try:
        workspaces = await Workspace.find({"tasks.assigned_to": current_user.id}).to_list(5)
        for ws in workspaces:
            for t in ws.tasks or []:
                if not t.assigned_to or current_user.id not in t.assigned_to:
                    continue
                tasks.append(
                    TaskItem(
                        id="{}:{}".format(ws.id, t.title),
                        title=t.title,
                        project_name=t.project_name,
                        due_date=t.due_date,
                        priority=t.priority,
                        status=t.status,
                    )
                )
                if len(tasks) >= 5:
                    break
            if len(tasks) >= 5:
                break
    except Exception:
        tasks = []

    return CreatorDashboardResponse(
        stats=dashboard_stats,
        opportunities=opportunities,
        active_teams=active_teams,
        messages=messages,
        tasks=tasks,
    )


