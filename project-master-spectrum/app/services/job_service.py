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
            duration=job_data.duration,
            estimated_duration=job_data.estimated_duration,
            start_date=job_data.start_date,
            deadline=job_data.deadline,
            skills=job_data.skills,
            experience_level=job_data.experience_level,
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

        # Only show open jobs for public search (unless specific status requested)
        if filters.status:
            query["status"] = filters.status
        else:
            query["status"] = "open"  # Default to open jobs

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

        # Budget range filter
        if filters.min_budget or filters.max_budget:
            budget_query = {}
            if filters.min_budget:
                budget_query["$gte"] = filters.min_budget
            if filters.max_budget:
                budget_query["$lte"] = filters.max_budget
            if budget_query:
                query["budget.min"] = budget_query

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

        # Apply updates
        for key, value in update_dict.items():
            setattr(job, key, value)

        await job.save()
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
        """Delete job post (owner only, only if draft or no proposals)"""
        # Verify ownership
        if job.client_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this job post"
            )

        # Can only delete draft jobs or jobs with no proposals
        if job.status != 'draft' and job.proposal_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete job post with proposals. Cancel it instead."
            )

        await job.delete()

    @staticmethod
    async def increment_views(job_id: str):
        """Increment job post view count"""
        try:
            job = await JobPost.get(PydanticObjectId(job_id))
            if job:
                job.view_count += 1
                await job.save()
        except:
            pass  # Silently fail for view counting
