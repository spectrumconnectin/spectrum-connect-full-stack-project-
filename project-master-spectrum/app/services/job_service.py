"""
Job Post Service Layer
Business logic for job posting management
"""
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from beanie import PydanticObjectId

from app.models.schema import User, JobPost, Budget, Rate, CrewCall, ProposalSettings, ScreeningQuestion
from app.api.schemas.job_schemas import (
    JobPostCreate,
    JobPostUpdate,
    JobPostStatusUpdate,
    JobPostSearchFilters,
)


class JobService:
    """Business logic for job post operations"""

    @staticmethod
    async def create_job_post(user: User, job_data: JobPostCreate) -> JobPost:
        """
        Create a new job post

        Args:
            user: The authenticated user (client)
            job_data: Job post creation data

        Returns:
            Created JobPost
        """
        # Convert budget/rate Pydantic models to dict
        budget = Budget(**job_data.budget.model_dump()) if job_data.budget else None
        hourly_rate = Rate(**job_data.hourly_rate.model_dump()) if job_data.hourly_rate else None
        daily_rate = Rate(**job_data.daily_rate.model_dump()) if job_data.daily_rate else None
        weekly_rate = Rate(**job_data.weekly_rate.model_dump()) if job_data.weekly_rate else None

        # Convert crew calls
        crew_calls = []
        if job_data.crew_call:
            for cc in job_data.crew_call:
                crew_calls.append(CrewCall(**cc.model_dump()))

        # Convert proposal settings
        proposal_settings = None
        if job_data.proposal_settings:
            proposal_settings = ProposalSettings(**job_data.proposal_settings.model_dump())

        # Convert screening questions
        questions = []
        if job_data.questions:
            for q in job_data.questions:
                questions.append(ScreeningQuestion(**q.model_dump()))

        # Convert invited crew IDs
        invited_crew_ids = None
        if job_data.invited_crew:
            invited_crew_ids = [PydanticObjectId(id) for id in job_data.invited_crew]

        # Create job post
        job_post = JobPost(
            client_id=user.id,
            title=job_data.title,
            description=job_data.description,
            department=job_data.department,
            role=job_data.role,
            tags=job_data.tags,
            crew_size=job_data.crew_size,
            complexity=job_data.complexity,
            budget_type=job_data.budget_type,
            budget=budget,
            hourly_rate=hourly_rate,
            daily_rate=daily_rate,
            weekly_rate=weekly_rate,
            location=getattr(job_data, 'location', None),
            event_date=getattr(job_data, 'event_date', None),
            is_remote=getattr(job_data, 'is_remote', None),
            duration=job_data.duration,
            estimated_duration=job_data.estimated_duration,
            start_date=job_data.start_date,
            deadline=job_data.deadline,
            skills=job_data.skills,
            experience_level=job_data.experience_level,
            goals=job_data.goals if hasattr(job_data, 'goals') else None,
            deliverables=job_data.deliverables if hasattr(job_data, 'deliverables') else None,
            crew_call=crew_calls if crew_calls else None,
            visibility=job_data.visibility,
            invited_crew=invited_crew_ids,
            proposal_settings=proposal_settings,
            questions=questions if questions else None,
            status=job_data.status or "draft",
            proposal_count=0,
            view_count=0,
        )

        await job_post.insert()

        # ETF Points — reward client for posting (draft posts excluded so we
        # don't farm points from incomplete drafts).
        if job_post.status and job_post.status != "draft":
            try:
                from app.services.etf_points_service import EtfPointsService
                await EtfPointsService.award_points(
                    user_id=user.id,
                    action="project.posted",
                    source_type="job_post",
                    source_id=str(job_post.id),
                    description=f"Posted project: {job_post.title}",
                )
            except Exception:
                # Auditing must never block the request path.
                pass

        return job_post

    @staticmethod
    async def get_job_by_id(job_id: str) -> JobPost:
        """Get job post by ID"""
        try:
            job = await JobPost.get(PydanticObjectId(job_id))
            if not job:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Job post not found"
                )
            return job
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job post not found"
            )

    @staticmethod
    async def get_my_jobs(user: User, status_filter: Optional[str] = None) -> List[JobPost]:
        """Get all job posts by current user (including drafts)."""
        query = {"client_id": user.id}
        if status_filter:
            query["status"] = status_filter

        jobs = await JobPost.find(query).sort("-published_at").to_list()
        return jobs

    @staticmethod
    async def update_status(job_id: str, user: User, status_value: str) -> JobPost:
        """Update job status (draft/open/in_progress/closed) by owner."""
        job = await JobPost.get(PydanticObjectId(job_id))
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        if str(job.client_id) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        job.status = status_value
        # Update published_at when moving to open
        if status_value == "open":
            job.published_at = datetime.utcnow()
        await job.save()
        return job

    @staticmethod
    async def search_jobs(filters: JobPostSearchFilters) -> dict:
        """
        Search and filter job posts with pagination

        Returns:
            dict with total count and list of jobs
        """
        # Build query
        query = {}

        # Show open + in_review jobs for public search (both accept proposals)
        if filters.status:
            query["status"] = filters.status
        else:
            query["status"] = {"$in": ["open", "in_review"]}  # default: jobs accepting proposals

        # Department filter
        if filters.department:
            query["department"] = filters.department

        # Role filter
        if filters.role:
            query["role"] = filters.role

        # Tags filter (match any)
        if filters.tags:
            query["tags"] = {"$in": filters.tags}

        # Skills filter (match any)
        if filters.skills:
            query["skills"] = {"$in": filters.skills}

        # Crew size filter
        if filters.crew_size:
            query["crew_size"] = filters.crew_size

        # Complexity filter
        if filters.complexity:
            query["complexity"] = filters.complexity

        # Budget type filter
        if filters.budget_type:
            query["budget_type"] = filters.budget_type

        # Budget range filter — match jobs whose budget.max >= creator min AND budget.min <= creator max
        if filters.min_budget or filters.max_budget:
            if filters.min_budget:
                # Job budget must reach at least the creator's minimum
                query["budget.max"] = {"$gte": filters.min_budget}
            if filters.max_budget:
                # Job budget must not start above the creator's maximum
                query["budget.min"] = {"$lte": filters.max_budget}

        # Experience level filter
        if filters.experience_level:
            query["experience_level"] = filters.experience_level

        # Text search (title and description)
        if filters.search:
            query["$or"] = [
                {"title": {"$regex": filters.search, "$options": "i"}},
                {"description": {"$regex": filters.search, "$options": "i"}}
            ]

        # Get total count
        total = await JobPost.find(query).count()

        # Build sort
        sort_field = filters.sort_by
        if sort_field == "proposals":
            sort_field = "proposal_count"
        elif sort_field == "views":
            sort_field = "view_count"
        elif sort_field == "budget":
            sort_field = "budget.min"

        sort_direction = -1 if filters.sort_order == "desc" else 1

        # Get paginated results
        jobs = await JobPost.find(query)\
            .sort([(sort_field, sort_direction)])\
            .skip(filters.skip)\
            .limit(filters.limit)\
            .to_list()

        return {
            "total": total,
            "skip": filters.skip,
            "limit": filters.limit,
            "jobs": jobs
        }

    @staticmethod
    async def update_job(job: JobPost, user: User, update_data: JobPostUpdate) -> JobPost:
        """Update job post (owner only)"""
        # Verify ownership
        if job.client_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this job post"
            )

        # Cannot update if job is completed or cancelled
        if job.status in ['completed', 'cancelled']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot update job post with status: {job.status}"
            )

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)

        # Convert nested Pydantic models
        if 'budget' in update_dict and update_dict['budget']:
            update_dict['budget'] = Budget(**update_dict['budget'])
        if 'hourly_rate' in update_dict and update_dict['hourly_rate']:
            update_dict['hourly_rate'] = Rate(**update_dict['hourly_rate'])
        if 'daily_rate' in update_dict and update_dict['daily_rate']:
            update_dict['daily_rate'] = Rate(**update_dict['daily_rate'])
        if 'weekly_rate' in update_dict and update_dict['weekly_rate']:
            update_dict['weekly_rate'] = Rate(**update_dict['weekly_rate'])

        if 'crew_call' in update_dict and update_dict['crew_call']:
            update_dict['crew_call'] = [CrewCall(**cc) for cc in update_dict['crew_call']]

        if 'proposal_settings' in update_dict and update_dict['proposal_settings']:
            update_dict['proposal_settings'] = ProposalSettings(**update_dict['proposal_settings'])

        if 'questions' in update_dict and update_dict['questions']:
            update_dict['questions'] = [ScreeningQuestion(**q) for q in update_dict['questions']]

        if 'invited_crew' in update_dict and update_dict['invited_crew']:
            update_dict['invited_crew'] = [PydanticObjectId(id) for id in update_dict['invited_crew']]

        # Strip immutable / ownership fields — prevents a client from transferring
        # the job to another user or backdating creation timestamps.
        _IMMUTABLE = {"client_id", "id", "created_at", "proposal_count"}
        for key in _IMMUTABLE:
            update_dict.pop(key, None)

        # Apply updates
        for key, value in update_dict.items():
            setattr(job, key, value)

        await job.save()

        # If location or event_date changed, notify all hired creators so they can
        # reconfirm availability for the new venue / date.
        location_changed = ("location" in update_dict or "event_date" in update_dict)
        if location_changed:
            try:
                from app.models.schema import Application
                from app.services.notification_service import NotificationService
                hired_apps = await Application.find(
                    Application.project_id == job.id,
                    Application.status == "accepted",
                ).to_list()
                new_location = getattr(job, "location", None)
                new_event_date = getattr(job, "event_date", None)
                date_str = new_event_date.strftime("%B %d, %Y") if new_event_date else None
                for app in hired_apps:
                    detail_parts = []
                    if "location" in update_dict and new_location:
                        detail_parts.append(f"New venue: {new_location}")
                    if "event_date" in update_dict and date_str:
                        detail_parts.append(f"New date: {date_str}")
                    detail = " · ".join(detail_parts) if detail_parts else "Project details have been updated."
                    await NotificationService.send(
                        user_id=str(app.crew_id),
                        type="system",
                        category="warning",
                        title=f"⚠️ Project update: '{job.title}'",
                        message=f"The client updated the project details. {detail} Please confirm your availability.",
                        action_url="/creator/projects",
                        action_text="View project",
                        actor_id=str(user.id),
                    )
            except Exception:
                pass

        return job

    @staticmethod
    async def update_job_status(job: JobPost, user: User, status_data: JobPostStatusUpdate) -> JobPost:
        """Update job post status"""
        # Verify ownership
        if job.client_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this job post"
            )

        new_status = status_data.status

        # Validate status transitions
        if job.status == 'completed' and new_status != 'completed':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change status of completed job"
            )

        if job.status == 'cancelled' and new_status != 'cancelled':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change status of cancelled job"
            )

        # Gate: cannot mark completed until escrow funds have been released
        if new_status == 'completed':
            try:
                from app.models.escrow import Escrow as _Escrow
                from beanie import PydanticObjectId as _OID
                escs = await _Escrow.find(_Escrow.job_post_id == job.id).to_list()
                for esc in escs:
                    funded = [m for m in esc.milestones if m.status in ('funded', 'delivered', 'approved')]
                    if funded:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="Payment must be released before this project can be completed. "
                                   "Release the escrow funds to the creator first."
                        )
            except HTTPException:
                raise
            except Exception:
                pass  # If escrow lookup fails, allow status change (non-blocking)

        # Update status
        old_status = job.status
        job.status = new_status

        # Set timestamps
        if new_status == 'open' and old_status == 'draft':
            job.published_at = datetime.utcnow()
        elif new_status in ['completed', 'cancelled', 'closed']:
            job.closed_at = datetime.utcnow()

        await job.save()
        return job

    @staticmethod
    async def delete_job(job: JobPost, user: User):
        """Delete job post (owner only, only if draft or no proposals).
        Cascades to orphaned Applications and Conversations."""
        # Verify ownership
        if job.client_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this job post"
            )

        # Can only delete draft jobs or jobs with no proposals
        if job.status != 'draft' and (job.proposal_count or 0) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete job post with proposals. Cancel it instead."
            )

        # Cascade: remove orphaned applications and conversations
        try:
            from app.models.schema import Application
            await Application.find({"project_id": job.id}).delete()
        except Exception:
            pass
        try:
            from app.models.message import Conversation
            await Conversation.find({"job_id": str(job.id)}).delete()
        except Exception:
            pass

        await job.delete()

    @staticmethod
    async def increment_views(job_id: str):
        """Increment job post view count atomically (prevents race conditions)."""
        try:
            job = await JobPost.get(PydanticObjectId(job_id))
            if job:
                await job.update({"$inc": {"view_count": 1}})
        except Exception:
            pass  # Silently fail for view counting
