"""
Dashboard Service Layer

Aggregates data for client and creator dashboards
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
from beanie.operators import In

from beanie import PydanticObjectId
from app.models.schema import User, JobPost
from app.models.project import Project, ActivityLog, ProjectDeadline
from app.models.message import Conversation, Message
from app.models.project import Project

class DashboardService:
    """Service for dashboard data aggregation"""

    @staticmethod
    async def get_client_dashboard(user_id: str) -> Dict[str, Any]:
        """
        Get complete client dashboard data

        Returns:
            - Active jobs with workspace info
            - Team activity feed
            - Recent messages preview
            - Upcoming deadlines
            - Community spotlight
        """
        # Normalize user id
        user_oid = PydanticObjectId(user_id)

        # Get jobs (include drafts for owner)
        active_jobs = await JobPost.find(
            JobPost.client_id == user_oid,
            In(JobPost.status, ["open", "in_progress", "draft"])
        ).sort(-JobPost.published_at).limit(10).to_list()

        # Format jobs with workspace data
        jobs_data = []
        for job in active_jobs:
            job_dict = {
                "id": str(job.id),
                "title": job.title,
                "description": job.description,
                "status": job.status,
                "tags": job.tags or [],
                "deadline": job.deadline.isoformat() if job.deadline else None,
                "proposal_count": job.proposal_count or 0,
            }

            # Add budget info
            if job.budget:
                job_dict["budget"] = {
                    "min": job.budget.min,
                    "max": job.budget.max
                }

            # Add workspace info
            if job.workspace:
                job_dict["workspace"] = {
                    "progress": job.workspace.progress or 0,
                    "roles_required": job.workspace.roles_required or 1,
                    "roles_filled": job.workspace.roles_filled or 0
                }

            jobs_data.append(job_dict)

        # Get team activity feed (from projects the user owns)
        activity_feed, _, _ = await ProjectService.get_activity_feed(
            user_id=user_id,
            limit=10
        )

        activity_data = [
            {
                "id": str(activity.id),
                "type": activity.activity_type,
                "project_id": activity.project_id,
                "project_title": activity.project_title,
                "actor_name": activity.actor_name,
                "actor_avatar": activity.actor_avatar,
                "message": activity.message,
                "created_at": activity.created_at.isoformat()
            }
            for activity in activity_feed
        ]

        # Get recent messages preview
        conversations = await Conversation.find(
            {"participants": {"$elemMatch": {"user_id": user_id}}}
        ).sort(-Conversation.last_message.timestamp).limit(3).to_list()

        messages_data = []
        for conv in conversations:
            if conv.last_message and conv.last_message.text:
                # Get the other participant's name
                other_participant = next(
                    (p for p in conv.participants if str(p.user_id) != user_id),
                    None
                )
                if other_participant:
                    messages_data.append({
                        "id": str(conv.id),
                        "name": other_participant.user_id,  # Will need to fetch username
                        "text": conv.last_message.text[:100],
                        "timestamp": conv.last_message.timestamp.isoformat() if conv.last_message.timestamp else None
                    })

        # Get upcoming deadlines
        upcoming_deadlines = await ProjectService.get_upcoming_deadlines(
            user_id=user_id,
            days=30,
            limit=5
        )

        deadlines_data = [
            {
                "id": str(deadline.id),
                "title": deadline.title,
                "project_title": deadline.project_title,
                "due_date": deadline.due_date.isoformat(),
                "priority": deadline.priority,
                "days_remaining": deadline.days_remaining()
            }
            for deadline in upcoming_deadlines
        ]

        # Get community spotlight (featured projects)
        featured_projects = await ProjectService.get_featured_projects(limit=3)

        community_data = []
        for project in featured_projects:
            creator = await User.get(project.client_id)
            community_data.append({
                "id": str(project.id),
                "title": project.title,
                "creator_name": creator.username if creator else "Unknown",
                "creator_avatar": creator.profile.profile_picture if creator and creator.profile else None,
                "category": project.category,
                "tags": project.tags
            })

        return {
            "jobs": jobs_data,
            "activity_feed": activity_data,
            "messages": messages_data,
            "deadlines": deadlines_data,
            "community_spotlight": community_data
        }

    @staticmethod
    async def get_creator_dashboard(user_id: str) -> Dict[str, Any]:
        """
        Get complete creator dashboard data

        Returns:
            - Stats (earnings, projects, satisfaction, response time)
            - Smart Connect opportunities (matching jobs)
            - Active teams (projects user is part of)
            - Recent messages
            - Upcoming tasks/deadlines
        """
        # Get user with stats
        user = await User.get(user_id)
        if not user:
            raise ValueError("User not found")

        # Format stats
        stats_data = {
            "name": user.profile.display_name or user.username if user.profile else user.username,
            "total_earnings": user.stats.total_earnings if user.stats else 0,
            "active_projects": user.stats.active_projects if user.stats else 0,
            "projects_completed": user.stats.projects_completed if user.stats else 0,
            "client_satisfaction": user.stats.client_satisfaction if user.stats else 0,
            "response_time_hours": user.stats.response_time if user.stats else 0
        }

        # Get Smart Connect opportunities (open jobs matching user skills)
        user_skills = []
        if user.profile and user.profile.skills:
            user_skills = [skill.name for skill in user.profile.skills]

        # Find jobs that match user's skills
        opportunities_query = JobPost.find(
            JobPost.status == "open",
            JobPost.client_id != user_id  # Exclude user's own jobs
        )

        if user_skills:
            opportunities_query = opportunities_query.find(
                {"skills": {"$in": user_skills}}
            )

        opportunities = await opportunities_query.sort(-JobPost.published_at).limit(6).to_list()

        opportunities_data = []
        for job in opportunities:
            # Calculate match percentage based on skill overlap
            match_percent = 80  # Default, would be calculated by AI matching
            if user_skills and job.skills:
                matching_skills = set(user_skills) & set(job.skills)
                match_percent = int((len(matching_skills) / len(job.skills)) * 100) if job.skills else 70

            opportunities_data.append({
                "id": str(job.id),
                "title": job.title,
                "description": job.description,
                "tags": job.tags or [],
                "skills": job.skills or [],
                "match_percent": match_percent,
                "deadline": job.deadline.isoformat() if job.deadline else None,
                "department": job.department
            })

        # Get active teams (projects where user is a team member)
        active_teams = await Project.find(
            {"team_members.user_id": user_id},
            In(Project.status, ["active", "in_progress"])
        ).limit(5).to_list()

        teams_data = []
        for project in active_teams:
            # Find user's role in the team
            user_role = next(
                (m.role for m in project.team_members if m.user_id == user_id),
                "Member"
            )

            # Calculate time remaining
            time_remaining_days = None
            if project.end_date:
                delta = project.end_date - datetime.utcnow()
                time_remaining_days = max(0, delta.days)

            # Get avatar URLs from team members
            avatar_urls = [m.avatar_url for m in project.team_members if m.avatar_url][:4]

            teams_data.append({
                "project_id": str(project.id),
                "title": project.title,
                "role": user_role,
                "status": project.status,
                "time_remaining_days": time_remaining_days,
                "avatar_urls": avatar_urls
            })

        # Get recent messages
        conversations = await Conversation.find(
            {"participants": {"$elemMatch": {"user_id": user_id}}}
        ).sort(-Conversation.last_message.timestamp).limit(5).to_list()

        messages_data = []
        for conv in conversations:
            if conv.last_message:
                # Get the other participant
                other_participant = next(
                    (p for p in conv.participants if str(p.user_id) != user_id),
                    None
                )

                if other_participant:
                    other_user = await User.get(str(other_participant.user_id))
                    messages_data.append({
                        "id": str(conv.id),
                        "name": other_user.username if other_user else "User",
                        "text": conv.last_message.text[:100] if conv.last_message.text else "",
                        "timestamp": conv.last_message.timestamp.isoformat() if conv.last_message.timestamp else None,
                        "avatar": other_user.profile.profile_picture if other_user and other_user.profile else None
                    })

        # Get upcoming tasks/deadlines assigned to user
        upcoming_tasks = await ProjectDeadline.find(
            {"assigned_to": user_id},
            ProjectDeadline.status == "pending",
            ProjectDeadline.due_date >= datetime.utcnow()
        ).sort(ProjectDeadline.due_date).limit(5).to_list()

        tasks_data = [
            {
                "id": str(task.id),
                "title": task.title,
                "project_name": task.project_title,
                "due_date": task.due_date.isoformat(),
                "priority": task.priority,
                "status": task.status
            }
            for task in upcoming_tasks
        ]

        return {
            "stats": stats_data,
            "opportunities": opportunities_data,
            "active_teams": teams_data,
            "messages": messages_data,
            "tasks": tasks_data
        }
