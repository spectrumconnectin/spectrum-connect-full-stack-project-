"""
Community Service

Business logic for community projects, events, forums, and collab calls
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from beanie import PydanticObjectId

from app.models.community import (
    CommunityProject,
    CommunityEvent,
    ForumThread,
    ForumPost,
    CollabCall,
    CommunityGuideline,
    FeaturedCreator,
    ProjectRole,
    ProjectMember
)
from app.models.schema import User


class CommunityService:
    """Service for community operations"""

    # ===== COMMUNITY PROJECT METHODS =====

    @staticmethod
    async def get_community_projects(
        project_type: Optional[str] = None,
        category: Optional[str] = None,
        tag: Optional[str] = None,
        is_featured: Optional[bool] = None,
        status: str = "active",
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get filtered community projects with pagination"""
        try:
            query = CommunityProject.find(CommunityProject.status == status)

            if project_type:
                query = query.find(CommunityProject.project_type == project_type)

            if category:
                query = query.find(CommunityProject.category == category)

            if tag:
                query = query.find(CommunityProject.tags == tag)

            if is_featured is not None:
                query = query.find(CommunityProject.is_featured == is_featured)

            total = await query.count()
            projects = await query.sort(-CommunityProject.created_at).skip(offset).limit(limit).to_list()

            projects_data = []
            for project in projects:
                projects_data.append({
                    "id": str(project.id),
                    "title": project.title,
                    "description": project.description,
                    "project_type": project.project_type,
                    "creator": {
                        "id": str(project.creator_id),
                        "name": project.creator_name,
                        "role": project.creator_role,
                        "avatar": project.creator_avatar
                    },
                    "roles_open": project.roles_open,
                    "category": project.category,
                    "tags": project.tags or [],
                    "is_featured": project.is_featured,
                    "is_remote": project.is_remote,
                    "views": project.views,
                    "interested_count": project.interested_count,
                    "members": len(project.members) if project.members else 0,
                    "created_at": project.created_at.isoformat()
                })

            return {
                "projects": projects_data,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total
            }

        except Exception as e:
            print(f"Error in CommunityService.get_community_projects: {e}")
            return {"projects": [], "total": 0, "limit": limit, "offset": offset, "has_more": False}

    @staticmethod
    async def get_landing_projects(limit_featured: int = 6, limit_active: int = 12) -> Dict[str, Any]:
        """Bundle featured + active projects for the community landing page."""
        featured = await CommunityService.get_community_projects(
            is_featured=True,
            status="active",
            limit=limit_featured,
            offset=0,
        )
        active = await CommunityService.get_community_projects(
            status="active",
            limit=limit_active,
            offset=0,
        )
        return {
            "featured_projects": featured.get("projects", []),
            "active_projects": active.get("projects", []),
        }

    @staticmethod
    async def get_project_by_id(project_id: str) -> Optional[Dict[str, Any]]:
        """Get single project by ID"""
        try:
            project = await CommunityProject.get(PydanticObjectId(project_id))
            if not project:
                return None

            # Increment views
            project.views += 1
            await project.save()

            return {
                "id": str(project.id),
                "title": project.title,
                "description": project.description,
                "project_type": project.project_type,
                "creator": {
                    "id": str(project.creator_id),
                    "name": project.creator_name,
                    "role": project.creator_role,
                    "avatar": project.creator_avatar
                },
                "roles": [
                    {
                        "title": role.title,
                        "description": role.description,
                        "skills": role.skills or [],
                        "count": role.count,
                        "filled": role.filled
                    }
                    for role in project.roles
                ],
                "members": [
                    {
                        "user_id": str(member.user_id),
                        "role": member.role,
                        "joined_at": member.joined_at.isoformat()
                    }
                    for member in (project.members or [])
                ],
                "roles_open": project.roles_open,
                "category": project.category,
                "tags": project.tags or [],
                "skills_needed": project.skills_needed or [],
                "status": project.status,
                "is_featured": project.is_featured,
                "is_remote": project.is_remote,
                "views": project.views,
                "interested_count": project.interested_count,
                "created_at": project.created_at.isoformat(),
                "updated_at": project.updated_at.isoformat() if project.updated_at else None
            }

        except Exception as e:
            print(f"Error in CommunityService.get_project_by_id: {e}")
            return None

    @staticmethod
    async def create_project(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new community project"""
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return {"error": "User not found"}

            # Calculate total roles open
            roles = data.get("roles", [])
            roles_open = sum(role.get("count", 1) - role.get("filled", 0) for role in roles)

            project = CommunityProject(
                title=data["title"],
                description=data["description"],
                project_type=data.get("project_type", "other"),
                creator_id=user.id,
                creator_name=user.profile.display_name or user.username if user.profile else user.username,
                creator_role=data.get("creator_role"),
                creator_avatar=user.profile.profile_picture if user.profile else None,
                roles=[ProjectRole(**role) for role in roles],
                roles_open=roles_open,
                category=data.get("category"),
                tags=data.get("tags", []),
                skills_needed=data.get("skills_needed", []),
                is_remote=data.get("is_remote", False),
                published_at=datetime.utcnow()
            )

            await project.insert()

            return {
                "success": True,
                "project": {
                    "id": str(project.id),
                    "title": project.title
                }
            }

        except Exception as e:
            print(f"Error in CommunityService.create_project: {e}")
            return {"error": str(e)}

    # ===== COMMUNITY EVENT METHODS =====

    @staticmethod
    async def get_events(
        event_type: Optional[str] = None,
        status: str = "upcoming",
        is_featured: Optional[bool] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get filtered community events"""
        try:
            query = CommunityEvent.find(CommunityEvent.status == status)

            if event_type:
                query = query.find(CommunityEvent.event_type == event_type)

            if is_featured is not None:
                query = query.find(CommunityEvent.is_featured == is_featured)

            events = await query.sort(CommunityEvent.start_time).limit(limit).to_list()

            return [
                {
                    "id": str(event.id),
                    "title": event.title,
                    "description": event.description,
                    "event_type": event.event_type,
                    "host": {
                        "id": str(event.host_id),
                        "name": event.host_name,
                        "avatar": event.host_avatar
                    },
                    "start_time": event.start_time.isoformat(),
                    "end_time": event.end_time.isoformat() if event.end_time else None,
                    "timezone": event.timezone,
                    "location_type": event.location_type,
                    "location": event.location,
                    "attendee_count": event.attendee_count,
                    "max_attendees": event.max_attendees,
                    "is_featured": event.is_featured,
                    "tags": event.tags or [],
                    "created_at": event.created_at.isoformat()
                }
                for event in events
            ]

        except Exception as e:
            print(f"Error in CommunityService.get_events: {e}")
            return []

    # ===== FORUM METHODS =====

    @staticmethod
    async def get_forum_threads(
        category: Optional[str] = None,
        tag: Optional[str] = None,
        is_pinned: Optional[bool] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get forum threads with filters"""
        try:
            query = ForumThread.find(ForumThread.status == "active")

            if category:
                query = query.find(ForumThread.category == category)

            if tag:
                query = query.find(ForumThread.tags == tag)

            if is_pinned is not None:
                query = query.find(ForumThread.is_pinned == is_pinned)

            total = await query.count()

            # Sort: pinned first, then by last activity
            threads = await query.sort(-ForumThread.is_pinned, -ForumThread.last_reply_at).skip(offset).limit(limit).to_list()

            threads_data = []
            for thread in threads:
                threads_data.append({
                    "id": str(thread.id),
                    "title": thread.title,
                    "content": thread.content[:200] + "..." if len(thread.content) > 200 else thread.content,
                    "author": {
                        "id": str(thread.author_id),
                        "name": thread.author_name,
                        "avatar": thread.author_avatar,
                        "role": thread.author_role
                    },
                    "category": thread.category,
                    "tags": thread.tags or [],
                    "is_pinned": thread.is_pinned,
                    "is_locked": thread.is_locked,
                    "views": thread.views,
                    "replies_count": thread.replies_count,
                    "likes": thread.likes,
                    "last_reply_at": thread.last_reply_at.isoformat() if thread.last_reply_at else None,
                    "created_at": thread.created_at.isoformat()
                })

            return {
                "threads": threads_data,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total
            }

        except Exception as e:
            print(f"Error in CommunityService.get_forum_threads: {e}")
            return {"threads": [], "total": 0, "limit": limit, "offset": offset, "has_more": False}

    # ===== COLLAB CALL METHODS =====

    @staticmethod
    async def get_collab_calls(
        collab_type: Optional[str] = None,
        category: Optional[str] = None,
        status: str = "open",
        is_featured: Optional[bool] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get collaboration calls"""
        try:
            query = CollabCall.find(CollabCall.status == status)

            if collab_type:
                query = query.find(CollabCall.collab_type == collab_type)

            if category:
                query = query.find(CollabCall.category == category)

            if is_featured is not None:
                query = query.find(CollabCall.is_featured == is_featured)

            calls = await query.sort(-CollabCall.created_at).limit(limit).to_list()

            return [
                {
                    "id": str(call.id),
                    "title": call.title,
                    "description": call.description,
                    "collab_type": call.collab_type,
                    "creator": {
                        "id": str(call.creator_id),
                        "name": call.creator_name,
                        "avatar": call.creator_avatar,
                        "role": call.creator_role
                    },
                    "roles_needed": call.roles_needed,
                    "skills_needed": call.skills_needed or [],
                    "is_paid": call.is_paid,
                    "budget": call.budget,
                    "timeline": call.timeline,
                    "is_remote": call.is_remote,
                    "category": call.category,
                    "tags": call.tags or [],
                    "application_count": call.application_count,
                    "created_at": call.created_at.isoformat()
                }
                for call in calls
            ]

        except Exception as e:
            print(f"Error in CommunityService.get_collab_calls: {e}")
            return []

    # ===== GUIDELINES & FEATURED CREATORS =====

    @staticmethod
    async def get_guidelines() -> List[Dict[str, Any]]:
        """Get community guidelines"""
        try:
            guidelines = await CommunityGuideline.find(
                CommunityGuideline.is_active == True
            ).sort(CommunityGuideline.order).to_list()

            return [
                {
                    "id": str(guideline.id),
                    "title": guideline.title,
                    "description": guideline.description,
                    "icon": guideline.icon,
                    "color": guideline.color
                }
                for guideline in guidelines
            ]

        except Exception as e:
            print(f"Error in CommunityService.get_guidelines: {e}")
            return []

    @staticmethod
    async def get_featured_creators(limit: int = 6) -> List[Dict[str, Any]]:
        """Get featured creators"""
        try:
            creators = await FeaturedCreator.find(
                FeaturedCreator.is_active == True
            ).sort(FeaturedCreator.order).limit(limit).to_list()

            return [
                {
                    "id": str(creator.id),
                    "user_id": str(creator.user_id),
                    "name": creator.name,
                    "role": creator.role,
                    "avatar": creator.avatar,
                    "bio": creator.bio,
                    "tags": creator.tags,
                    "portfolio_url": creator.portfolio_url,
                    "linkedin_url": creator.linkedin_url,
                    "twitter_url": creator.twitter_url
                }
                for creator in creators
            ]

        except Exception as e:
            print(f"Error in CommunityService.get_featured_creators: {e}")
            return []

    # ===== STATS =====

    @staticmethod
    async def get_community_stats() -> Dict[str, Any]:
        """Get overall community statistics"""
        try:
            # Count active members (users who created projects or joined events)
            active_projects = await CommunityProject.find(
                CommunityProject.status == "active"
            ).count()

            active_threads = await ForumThread.find(
                ForumThread.status == "active"
            ).count()

            upcoming_events = await CommunityEvent.find(
                CommunityEvent.status == "upcoming"
            ).count()

            # For now, return sample stats
            return {
                "members": "8,400+",
                "active_threads": f"{active_threads}+",
                "weekly_events": f"{upcoming_events}+",
                "countries": "60+"
            }

        except Exception as e:
            print(f"Error in CommunityService.get_community_stats: {e}")
            return {
                "members": "0",
                "active_threads": "0",
                "weekly_events": "0",
                "countries": "0"
            }

    # ===== SEARCH =====

    @staticmethod
    async def search_community(query: str, limit: int = 20) -> Dict[str, Any]:
        """Search across projects, events, and threads"""
        try:
            search_pattern = {"$regex": query, "$options": "i"}

            # Search projects
            projects = await CommunityProject.find(
                {
                    "$or": [
                        {"title": search_pattern},
                        {"description": search_pattern},
                        {"tags": search_pattern}
                    ],
                    "status": "active"  # Only return active projects
                }
            ).limit(limit).to_list()

            # Format projects with full details (matching get_community_projects format)
            projects_data = []
            for project in projects:
                projects_data.append({
                    "id": str(project.id),
                    "title": project.title,
                    "description": project.description,
                    "project_type": project.project_type,
                    "creator": {
                        "id": str(project.creator_id),
                        "name": project.creator_name,
                        "role": project.creator_role,
                        "avatar": project.creator_avatar
                    },
                    "roles_open": project.roles_open,
                    "category": project.category,
                    "tags": project.tags or [],
                    "is_featured": project.is_featured,
                    "is_remote": project.is_remote,
                    "views": project.views,
                    "interested_count": project.interested_count,
                    "members": len(project.members) if project.members else 0,
                    "created_at": project.created_at.isoformat()
                })

            # Search events
            events = await CommunityEvent.find(
                {
                    "$or": [
                        {"title": search_pattern},
                        {"description": search_pattern}
                    ]
                }
            ).limit(limit).to_list()

            # Search threads
            threads = await ForumThread.find(
                {
                    "$or": [
                        {"title": search_pattern},
                        {"content": search_pattern},
                        {"tags": search_pattern}
                    ]
                }
            ).limit(limit).to_list()

            return {
                "projects": projects_data,
                "events": [{"id": str(e.id), "title": e.title, "type": "event"} for e in events],
                "threads": [{"id": str(t.id), "title": t.title, "type": "thread"} for t in threads],
                "query": query
            }

        except Exception as e:
            print(f"Error in CommunityService.search_community: {e}")
            return {"projects": [], "events": [], "threads": [], "query": query}
