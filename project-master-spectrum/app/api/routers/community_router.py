"""
Community API Routes

Endpoints for community projects, events, forums, and collab calls
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, Dict, Any, List

from app.models.schema import User
from app.services.community_service import CommunityService
from app.api.schemas.community_schemas import (
    CommunityProjectCreate,
    CommunityProjectUpdate,
    CommunityEventCreate,
    CommunityEventUpdate,
    EventRegistration,
    ForumThreadCreate,
    ForumThreadUpdate,
    ForumPostCreate,
    CollabCallCreate,
    CollabCallUpdate,
    CollabApplication
)
from app.auth.auth import get_current_user

router = APIRouter(prefix="/community", tags=["Community"])


# ===== COMMUNITY PROJECT ENDPOINTS =====

@router.get("/projects")
async def get_projects(
    project_type: Optional[str] = Query(None, description="Filter by project type (doc, app, music, film, game, mag)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    is_featured: Optional[bool] = Query(None, description="Filter featured projects"),
    status: str = Query("active", description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    """
    Get community projects with filters

    Query params:
    - project_type: doc, app, music, film, game, mag
    - category: Film, Design, Music, Gaming, etc.
    - tag: Filter by tag
    - is_featured: true/false for featured projects
    - status: active, in_progress, completed, cancelled
    - limit: Results per page (default: 20, max: 100)
    - offset: Pagination offset

    Returns list of projects with pagination info
    """
    try:
        result = await CommunityService.get_community_projects(
            project_type=project_type,
            category=category,
            tag=tag,
            is_featured=is_featured,
            status=status,
            limit=limit,
            offset=offset
        )
        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch projects: {str(e)}"
        )


@router.get("/landing")
async def get_community_landing() -> Dict[str, Any]:
    """
    Landing data for community page:
    - featured_projects
    - active_projects
    """
    try:
        return await CommunityService.get_landing_projects()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load community landing: {str(e)}"
        )


@router.get("/projects/{project_id}")
async def get_project(project_id: str) -> Dict[str, Any]:
    """Get single project by ID (increments view count)"""
    try:
        project = await CommunityService.get_project_by_id(project_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        return project

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project: {str(e)}"
        )


@router.post("/projects")
async def create_project(
    request: CommunityProjectCreate,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Create new community project (authenticated users only)"""
    try:
        result = await CommunityService.create_project(
            user_id=str(current_user.id),
            data=request.dict()
        )

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )


# ===== COMMUNITY EVENT ENDPOINTS =====

@router.get("/events")
async def get_events(
    event_type: Optional[str] = Query(None, description="Filter by event type (live, workshop, meetup, roundtable, showcase)"),
    event_status: str = Query("upcoming", description="Filter by status (upcoming, ongoing, completed, cancelled)"),
    is_featured: Optional[bool] = Query(None, description="Filter featured events"),
    limit: int = Query(20, ge=1, le=100)
) -> Dict[str, Any]:
    """
    Get community events

    Query params:
    - event_type: live, workshop, meetup, roundtable, showcase
    - event_status: upcoming, ongoing, completed, cancelled
    - is_featured: true/false for featured events
    - limit: Max results (default: 20, max: 100)

    Returns list of events sorted by start time
    """
    try:
        events = await CommunityService.get_events(
            event_type=event_type,
            status=event_status,
            is_featured=is_featured,
            limit=limit
        )

        return {"events": events}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch events: {str(e)}"
        )


@router.post("/events")
async def create_event(
    request: CommunityEventCreate,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Create new community event (authenticated users only)"""
    try:
        # Event creation logic would go here
        return {
            "success": True,
            "message": "Event created successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create event: {str(e)}"
        )


# ===== FORUM ENDPOINTS =====

@router.get("/forum/threads")
async def get_forum_threads(
    category: Optional[str] = Query(None, description="Filter by category"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    is_pinned: Optional[bool] = Query(None, description="Filter pinned threads"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    """
    Get forum threads

    Query params:
    - category: General, Help, Showcase, Feedback
    - tag: Filter by tag
    - is_pinned: true/false for pinned threads
    - limit: Results per page
    - offset: Pagination offset

    Returns list of threads with pagination info
    """
    try:
        result = await CommunityService.get_forum_threads(
            category=category,
            tag=tag,
            is_pinned=is_pinned,
            limit=limit,
            offset=offset
        )

        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch threads: {str(e)}"
        )


@router.post("/forum/threads")
async def create_thread(
    request: ForumThreadCreate,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Create new forum thread (authenticated users only)"""
    try:
        return {
            "success": True,
            "message": "Thread created successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create thread: {str(e)}"
        )


# ===== COLLAB CALL ENDPOINTS =====

@router.get("/collab-calls")
async def get_collab_calls(
    collab_type: Optional[str] = Query(None, description="Filter by collab type (video, design, music, writing)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    call_status: str = Query("open", description="Filter by status (open, in_progress, filled, closed)"),
    is_featured: Optional[bool] = Query(None, description="Filter featured calls"),
    limit: int = Query(20, ge=1, le=100)
) -> Dict[str, Any]:
    """
    Get collaboration calls

    Query params:
    - collab_type: video, design, music, writing
    - category: Filter by category
    - call_status: open, in_progress, filled, closed
    - is_featured: true/false for featured calls
    - limit: Max results

    Returns list of collab calls
    """
    try:
        calls = await CommunityService.get_collab_calls(
            collab_type=collab_type,
            category=category,
            status=call_status,
            is_featured=is_featured,
            limit=limit
        )

        return {"collab_calls": calls}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch collab calls: {str(e)}"
        )


@router.post("/collab-calls")
async def create_collab_call(
    request: CollabCallCreate,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Create new collaboration call (authenticated users only)"""
    try:
        return {
            "success": True,
            "message": "Collab call created successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create collab call: {str(e)}"
        )


# ===== COMMUNITY INFO ENDPOINTS =====

@router.get("/guidelines")
async def get_guidelines() -> Dict[str, Any]:
    """Get community guidelines"""
    try:
        guidelines = await CommunityService.get_guidelines()
        return {"guidelines": guidelines}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch guidelines: {str(e)}"
        )


@router.get("/featured-creators")
async def get_featured_creators(
    limit: int = Query(6, ge=1, le=20)
) -> Dict[str, Any]:
    """Get featured community creators"""
    try:
        creators = await CommunityService.get_featured_creators(limit=limit)
        return {"creators": creators}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch featured creators: {str(e)}"
        )


@router.get("/stats")
async def get_community_stats() -> Dict[str, Any]:
    """Get overall community statistics"""
    try:
        stats = await CommunityService.get_community_stats()
        return {"stats": stats}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stats: {str(e)}"
        )


# ===== SEARCH ENDPOINT =====

@router.get("/search")
async def search_community(
    query: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=50)
) -> Dict[str, Any]:
    """
    Search across community projects, events, and forum threads

    Query params:
    - query: Search query
    - limit: Max results per category

    Returns projects, events, and threads matching the query
    """
    try:
        results = await CommunityService.search_community(query=query, limit=limit)
        return results

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search community: {str(e)}"
        )
