"""
Project Service Layer

Business logic for project management:
- Project CRUD operations
- Team member management
- Activity logging
- Deadline management
- Dashboard data aggregation
"""

from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from beanie import PydanticObjectId
from beanie.operators import In, And
from fastapi import HTTPException, status

from app.models.project import Project, ActivityLog, ProjectDeadline, ProjectTeamMember
from app.models.schema import User

from app.services.etf_service import ETFService
from app.services.workforce_balance_service import WorkforceBalanceService
class ProjectService:
    """Service for managing projects and related data"""

    # ==================== Project CRUD ====================

    @staticmethod
    async def create_project(
        client_id: str,
        title: str,
        description: str,
        category: str,
        tags: List[str] = None,
        total_roles: int = 1,
        icon_type: str = "film",
        is_public: bool = False,
        **kwargs
    ) -> Project:
        """
        Create a new project

        Args:
            client_id: ID of user creating the project
            title: Project title
            description: Project description
            category: Project category (film, app, music, etc.)
            tags: Optional list of tags
            total_roles: Number of roles needed
            icon_type: Icon type for UI
            is_public: Whether project is public
            **kwargs: Additional optional fields

        Returns:
            Created Project
        """
        project = Project(
            title=title,
            description=description,
            client_id=client_id,
            category=category,
            tags=tags or [],
            total_roles=total_roles,
            icon_type=icon_type,
            is_public=is_public,
            status="active",
            **kwargs
        )
        await project.insert()

        # Log activity
        user = await User.get(client_id)
        await ProjectService.log_activity(
            activity_type="project_created",
            project_id=str(project.id),
            project_title=project.title,
            actor_id=client_id,
            actor_name=user.username if user else "Unknown",
            actor_avatar=user.profile.avatar if user and user.profile else None,
            message=f"Created project '{project.title}'"
        )

        return project

    @staticmethod
    async def get_project(project_id: str) -> Optional[Project]:
        """Get project by ID"""
        return await Project.get(project_id)

    @staticmethod
    async def get_user_projects(
        user_id: str,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Project], int]:
        """
        Get projects for a user

        Args:
            user_id: User ID
            status: Optional status filter
            search: Optional search query
            limit: Max projects to return
            offset: Offset for pagination

        Returns:
            Tuple of (projects, total_count)
        """
        # Build query - user is owner OR team member
        query = Project.find(
            {
                "$or": [
                    {"client_id": user_id},
                    {"team_members.user_id": user_id}
                ]
            }
        )

        # Filter by status
        if status and status != "all":
            query = query.find(Project.status == status)

        # Search
        if search:
            query = query.find(
                {
                    "$or": [
                        {"title": {"$regex": search, "$options": "i"}},
                        {"description": {"$regex": search, "$options": "i"}},
                        {"tags": {"$regex": search, "$options": "i"}}
                    ]
                }
            )

        # Get total count
        total = await query.count()

        # Get paginated results
        projects = await query.sort(-Project.created_at).skip(offset).limit(limit).to_list()

        return projects, total

    @staticmethod
    async def update_project(
        project_id: str,
        user_id: str,
        **update_data
    ) -> Project:
        """
        Update project

        Args:
            project_id: Project ID
            user_id: User ID (for auth check)
            **update_data: Fields to update

        Returns:
            Updated Project
        """
        project = await Project.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Only owner can update project details
        if not project.is_owner(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owner can update project"
            )

        # Update fields
        for key, value in update_data.items():
            if value is not None and hasattr(project, key):
                setattr(project, key, value)

        project.updated_at = datetime.utcnow()
        await project.save()

        # Log status changes
        if "status" in update_data:
            await ProjectService.log_activity(
                activity_type="status_changed",
                project_id=project_id,
                project_title=project.title,
                actor_id=user_id,
                message=f"Changed status to {update_data['status']}",
                metadata={"old_status": project.status, "new_status": update_data["status"]}
            )

            # ── Workforce Balance hook ──────────────────────────────────────
            # When a project reaches a terminal state (completed / cancelled /
            # archived) or becomes active, recount every team member's load.
            _trigger_statuses = {"completed", "cancelled", "archived", "active", "in_progress"}
            if update_data["status"] in _trigger_statuses:
                try:
                    for _member in project.team_members:
                        await WorkforceBalanceService.update_active_project_count(
                            _member.user_id
                        )
                except Exception as _wf_err:
                    print(f"[WorkforceBalance] update_project hook failed: {_wf_err}")
            # ───────────────────────────────────────────────────────────────

        return project

    @staticmethod
    async def update_progress(
        project_id: str,
        user_id: str,
        progress_percentage: int
    ) -> Project:
        """Update project progress"""
        project = await Project.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Owner or team member can update progress
        if not (project.is_owner(user_id) or project.is_team_member(user_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        old_progress = project.progress_percentage
        project.progress_percentage = progress_percentage
        project.updated_at = datetime.utcnow()
        await project.save()

        # Log milestone completion
        if progress_percentage == 100 and old_progress < 100:
            await ProjectService.log_activity(
                activity_type="milestone_completed",
                project_id=project_id,
                project_title=project.title,
                actor_id=user_id,
                message="Project completed!",
                metadata={"progress": progress_percentage}
            )

            # ETF contribution on project completion
            from app.services.etf_service import ETFService
            try:
                project_value = project.budget_max or project.budget_min or 500.0
                contribution_amount = ETFService.calculate_contribution_amount(
                    project_value=project_value,
                    trust_score=None,
                    verification_level=None,
                )
                if contribution_amount > 0:
                    from beanie import PydanticObjectId
                    for member in project.team_members:
                        await ETFService.add_contribution(
                            user_id=PydanticObjectId(member.user_id),
                            amount=contribution_amount,
                            source_type="project_completion",
                            source_id=project.id,
                            description=f"Project completed: {project.title}",
                        )
            except Exception as e:
                print(f"ETF contribution failed: {e}")

        return project

    @staticmethod
    async def delete_project(project_id: str, user_id: str):
        """Archive/delete project (soft delete by setting status to 'archived')"""
        project = await Project.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        if not project.is_owner(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owner can delete project"
            )

        project.status = "archived"
        await project.save()

        # ── Workforce Balance hook ──────────────────────────────────────────
        # Archiving frees up every team member's active project slot.
        try:
            for _member in project.team_members:
                await WorkforceBalanceService.update_active_project_count(_member.user_id)
        except Exception as _wf_err:
            print(f"[WorkforceBalance] delete_project hook failed: {_wf_err}")
        # ───────────────────────────────────────────────────────────────────

    # ==================== Team Management ====================

    @staticmethod
    async def add_team_member(
        project_id: str,
        user_id: str,  # User being added
        role: str,
        added_by: str,  # User adding the member
        permissions: List[str] = None
    ) -> Project:
        """Add team member to project"""
        project = await Project.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Only owner can add team members
        if not project.is_owner(added_by):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owner can add team members"
            )

        # Check if user already in team
        if project.is_team_member(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a team member"
            )

        # Get user details
        user = await User.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Add member
        project.add_team_member(
            user_id=user_id,
            username=user.username,
            role=role,
            avatar_url=user.profile.avatar if user.profile else None,
            permissions=permissions
        )
        await project.save()

        # ── Workforce Balance hook ──────────────────────────────────────────
        # Recount the creator's active projects and stamp last_project_assigned_at
        try:
            await WorkforceBalanceService.update_active_project_count(user_id)
            from app.models.schema import CrewProfile as _CrewProfile
            from beanie import PydanticObjectId as _ObjId
            _cp = await _CrewProfile.find_one(_CrewProfile.user_id == _ObjId(user_id))
            if _cp:
                _cp.last_project_assigned_at = datetime.utcnow()
                await _cp.save()
        except Exception as _wf_err:
            print(f"[WorkforceBalance] add_team_member hook failed: {_wf_err}")
        # ───────────────────────────────────────────────────────────────────

        # Log activity
        await ProjectService.log_activity(
            activity_type="user_joined",
            project_id=project_id,
            project_title=project.title,
            actor_id=user_id,
            actor_name=user.username,
            actor_avatar=user.profile.avatar if user.profile else None,
            message=f"{user.username} joined as {role}"
        )

        return project

    @staticmethod
    async def remove_team_member(
        project_id: str,
        user_id: str,  # User being removed
        removed_by: str  # User removing the member
    ) -> Project:
        """Remove team member from project"""
        project = await Project.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Only owner can remove team members
        if not project.is_owner(removed_by):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owner can remove team members"
            )

        project.remove_team_member(user_id)
        await project.save()

        # ── Workforce Balance hook ──────────────────────────────────────────
        try:
            await WorkforceBalanceService.update_active_project_count(user_id)
        except Exception as _wf_err:
            print(f"[WorkforceBalance] remove_team_member hook failed: {_wf_err}")
        # ───────────────────────────────────────────────────────────────────

        return project

    @staticmethod
    async def update_team_member(
        project_id: str,
        user_id: str,  # User being updated
        updated_by: str,  # User updating
        role: Optional[str] = None,
        permissions: Optional[List[str]] = None
    ) -> Project:
        """Update team member role/permissions"""
        project = await Project.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Only owner can update team members
        if not project.is_owner(updated_by):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owner can update team members"
            )

        # Find and update member
        for member in project.team_members:
            if member.user_id == user_id:
                if role:
                    member.role = role
                if permissions is not None:
                    member.permissions = permissions
                break
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team member not found"
            )

        await project.save()
        return project

    # ==================== Activity Logging ====================

    @staticmethod
    async def log_activity(
        activity_type: str,
        project_id: str,
        project_title: str,
        message: str,
        actor_id: Optional[str] = None,
        actor_name: Optional[str] = None,
        actor_avatar: Optional[str] = None,
        metadata: dict = None
    ) -> ActivityLog:
        """Log a project activity"""
        activity = ActivityLog(
            activity_type=activity_type,
            project_id=project_id,
            project_title=project_title,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_avatar=actor_avatar,
            message=message,
            metadata=metadata or {}
        )
        await activity.insert()
        return activity

    @staticmethod
    async def get_activity_feed(
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[ActivityLog], int, bool]:
        """
        Get activity feed for user's projects

        Args:
            user_id: User ID
            limit: Max activities to return
            offset: Offset for pagination

        Returns:
            Tuple of (activities, total_count, has_more)
        """
        # Get user's project IDs
        projects = await Project.find(
            {
                "$or": [
                    {"client_id": user_id},
                    {"team_members.user_id": user_id}
                ]
            }
        ).to_list()
        project_ids = [str(p.id) for p in projects]

        # Get activities
        query = ActivityLog.find(In(ActivityLog.project_id, project_ids))
        total = await query.count()

        activities = await query.sort(-ActivityLog.created_at).skip(offset).limit(limit + 1).to_list()

        has_more = len(activities) > limit
        if has_more:
            activities = activities[:limit]

        return activities, total, has_more

    @staticmethod
    async def get_project_activity(
        project_id: str,
        user_id: str,
        limit: int = 50
    ) -> List[ActivityLog]:
        """Get activity log for specific project"""
        # Verify user has access
        project = await Project.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        if not (project.is_owner(user_id) or project.is_team_member(user_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        activities = await ActivityLog.find(
            ActivityLog.project_id == project_id
        ).sort(-ActivityLog.created_at).limit(limit).to_list()

        return activities

    # ==================== Deadlines ====================

    @staticmethod
    async def create_deadline(
        project_id: str,
        created_by: str,
        title: str,
        due_date: datetime,
        description: Optional[str] = None,
        priority: str = "medium",
        assigned_to: List[str] = None
    ) -> ProjectDeadline:
        """Create a project deadline"""
        project = await Project.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Only owner or team member can create deadlines
        if not (project.is_owner(created_by) or project.is_team_member(created_by)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        deadline = ProjectDeadline(
            project_id=project_id,
            project_title=project.title,
            title=title,
            description=description,
            due_date=due_date,
            priority=priority,
            assigned_to=assigned_to or [],
            created_by=created_by
        )
        await deadline.insert()

        # Log activity
        await ProjectService.log_activity(
            activity_type="deadline_created",
            project_id=project_id,
            project_title=project.title,
            actor_id=created_by,
            message=f"Added deadline: {title}",
            metadata={"deadline_id": str(deadline.id), "due_date": due_date.isoformat()}
        )

        return deadline

    @staticmethod
    async def get_upcoming_deadlines(
        user_id: str,
        days: int = 7,
        limit: int = 10
    ) -> List[ProjectDeadline]:
        """Get upcoming deadlines for user's projects"""
        # Get user's project IDs
        projects = await Project.find(
            {
                "$or": [
                    {"client_id": user_id},
                    {"team_members.user_id": user_id}
                ]
            }
        ).to_list()
        project_ids = [str(p.id) for p in projects]

        # Get upcoming deadlines
        cutoff_date = datetime.utcnow() + timedelta(days=days)
        deadlines = await ProjectDeadline.find(
            In(ProjectDeadline.project_id, project_ids),
            ProjectDeadline.status == "pending",
            ProjectDeadline.due_date <= cutoff_date,
            ProjectDeadline.due_date >= datetime.utcnow()
        ).sort(ProjectDeadline.due_date).limit(limit).to_list()

        return deadlines

    @staticmethod
    async def update_deadline(
        deadline_id: str,
        user_id: str,
        **update_data
    ) -> ProjectDeadline:
        """Update deadline"""
        deadline = await ProjectDeadline.get(deadline_id)
        if not deadline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deadline not found"
            )

        # Verify user has access to project
        project = await Project.get(deadline.project_id)
        if not project or not (project.is_owner(user_id) or project.is_team_member(user_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        # Update fields
        for key, value in update_data.items():
            if value is not None and hasattr(deadline, key):
                setattr(deadline, key, value)

        await deadline.save()

        return deadline

    @staticmethod
    async def complete_deadline(
        deadline_id: str,
        user_id: str
    ) -> ProjectDeadline:
        """Mark deadline as completed"""
        deadline = await ProjectDeadline.get(deadline_id)
        if not deadline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deadline not found"
            )

        deadline.mark_completed(user_id)
        await deadline.save()

        # Log activity
        await ProjectService.log_activity(
            activity_type="milestone_completed",
            project_id=deadline.project_id,
            project_title=deadline.project_title,
            actor_id=user_id,
            message=f"Completed deadline: {deadline.title}"
        )

        return deadline

    @staticmethod
    async def delete_deadline(
        deadline_id: str,
        user_id: str
    ):
        """Delete deadline"""
        deadline = await ProjectDeadline.get(deadline_id)
        if not deadline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deadline not found"
            )

        # Verify user has access
        project = await Project.get(deadline.project_id)
        if not project or not (project.is_owner(user_id) or project.is_team_member(user_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        await deadline.delete()

    # ==================== Dashboard Summary ====================

    @staticmethod
    async def get_dashboard_summary(user_id: str) -> dict:
        """
        Get complete dashboard data in one call

        Returns:
            Dict with active_projects, activity_feed, upcoming_deadlines, community_spotlight, stats
        """
        # Get active projects
        active_projects, _ = await ProjectService.get_user_projects(
            user_id=user_id,
            status="in_progress",
            limit=5
        )

        # Get activity feed
        activity_feed, _, _ = await ProjectService.get_activity_feed(
            user_id=user_id,
            limit=10
        )

        # Get upcoming deadlines
        upcoming_deadlines = await ProjectService.get_upcoming_deadlines(
            user_id=user_id,
            days=7,
            limit=5
        )

        # Get community spotlight (featured public projects)
        community_spotlight = await Project.find(
            Project.is_featured == True,
            Project.is_public == True
        ).sort(-Project.created_at).limit(3).to_list()

        # Calculate stats
        all_projects, total_projects = await ProjectService.get_user_projects(
            user_id=user_id,
            limit=1000
        )
        active_count = len([p for p in all_projects if p.status == "in_progress"])
        completed_count = len([p for p in all_projects if p.status == "completed"])

        # Count team members
        team_members_set = set()
        for project in all_projects:
            for member in project.team_members:
                team_members_set.add(member.user_id)

        # Count completed milestones
        completed_milestones = await ProjectDeadline.find(
            ProjectDeadline.status == "completed",
            ProjectDeadline.created_by == user_id
        ).count()

        return {
            "active_projects": active_projects,
            "activity_feed": activity_feed,
            "upcoming_deadlines": upcoming_deadlines,
            "community_spotlight": community_spotlight,
            "stats": {
                "total_projects": total_projects,
                "active_projects": active_count,
                "completed_projects": completed_count,
                "team_members": len(team_members_set),
                "completed_milestones": completed_milestones
            }
        }

    # ==================== Community ====================

    @staticmethod
    async def get_featured_projects(limit: int = 10) -> List[Project]:
        """Get featured community projects"""
        return await Project.find(
            Project.is_featured == True,
            Project.is_public == True
        ).sort(-Project.created_at).limit(limit).to_list()