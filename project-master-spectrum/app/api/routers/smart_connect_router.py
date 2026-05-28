"""
Smart Connect API Routes (v2 — Workforce Balance)
==================================================
Endpoints for AI-powered collaborator matching and discovery.

New in v2
---------
GET  /smart-connect/workload-stats     – Platform-wide workload distribution.
PATCH /smart-connect/workload-capacity – Creator updates their project capacity.
SmartMatchRequest  – new fields: min_trust_tier, workload_aware.
CreativeSearchRequest – new fields: min_trust_tier, max_workload, verified_skills_only.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List

from app.models.schema import User
from app.services.smart_connect_service import SmartConnectService
from app.services.workforce_balance_service import WorkforceBalanceService
from app.api.schemas.smart_connect_schemas import (
    SmartMatchRequest,
    SmartMatchResponse,
    CreativeSearchRequest,
    CreativeSearchResponse,
    SavedProfileRequest,
    SavedProfilesResponse,
    WorkloadCapacityRequest,
    WorkloadCapacityResponse,
    WorkloadStatsResponse,
)
from app.auth.auth import get_current_user

router = APIRouter(prefix="/smart-connect", tags=["Smart Connect"])


# ── Smart Match ────────────────────────────────────────────────────────────────

@router.post("/match", response_model=SmartMatchResponse)
async def smart_match(
    request: SmartMatchRequest,
    current_user: User = Depends(get_current_user),
):
    """
    AI-powered smart matching to find perfect collaborators.

    Scoring (v2 — Workforce Balance)
    ---------------------------------
    Role match        35 pts
    Skills match      25 pts
    Specialization    10 pts
    Location          10 pts
    Rating             5 pts
    Workload fairness 10 pts  ← new
    Trust tier         5 pts  ← new
    ─────────────────────────
    Max total        100 pts

    Workload fairness ensures that underutilised creators surface higher in
    results, promoting fair distribution of work across the platform.
    Pass ``workload_aware=false`` to disable and fall back to v1 scoring.
    """
    try:
        result = await SmartConnectService.smart_match(
            project_description=request.project_description,
            project_type=request.project_type,
            roles_needed=request.roles_needed,
            timeline=request.timeline,
            skills_required=request.skills_required,
            location=request.location,
            is_remote=request.is_remote,
            min_trust_tier=request.min_trust_tier,
            workload_aware=request.workload_aware,
            limit=10,
        )
        return SmartMatchResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Smart matching failed: {str(e)}",
        )


# ── Search ─────────────────────────────────────────────────────────────────────

@router.post("/search", response_model=CreativeSearchResponse)
async def search_creatives(
    request: CreativeSearchRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Search for creatives with advanced filters.

    New v2 filters
    --------------
    ``min_trust_tier``     – e.g. "gold" hides bronze/silver creators.
    ``max_workload``       – e.g. 2 hides creators with 3+ active projects.
    ``verified_skills_only`` – placeholder for skill-badge filter (Phase 2).
    """
    try:
        result = await SmartConnectService.search_creatives(
            query=request.query,
            roles=request.roles,
            skills=request.skills,
            location=request.location,
            min_rating=request.min_rating,
            max_rate=request.max_rate,
            min_trust_tier=request.min_trust_tier,
            max_workload=request.max_workload,
            verified_skills_only=request.verified_skills_only,
            limit=request.limit,
            offset=request.offset,
        )
        return CreativeSearchResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )


# ── Featured ───────────────────────────────────────────────────────────────────

@router.get("/featured", response_model=SavedProfilesResponse)
async def get_featured_creatives(
    limit: int = Query(6, ge=1, le=20),
):
    """
    Get featured / top-rated creatives (public, no auth required).

    Each result now includes workload and trust tier data.
    """
    try:
        profiles = await SmartConnectService.get_featured_creatives(limit=limit)
        return SavedProfilesResponse(profiles=profiles, total=len(profiles))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch featured creatives: {str(e)}",
        )


# ── Save / Saved profiles ──────────────────────────────────────────────────────

@router.post("/save")
async def save_profile(
    request: SavedProfileRequest,
    current_user: User = Depends(get_current_user),
):
    """Save a creative profile to favourites."""
    try:
        result = await SmartConnectService.save_profile(
            user_id=str(current_user.id),
            profile_user_id=request.profile_user_id,
        )
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"],
            )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile: {str(e)}",
        )


@router.get("/saved", response_model=SavedProfilesResponse)
async def get_saved_profiles(
    current_user: User = Depends(get_current_user),
):
    """Get user's saved / bookmarked profiles (includes workload data)."""
    try:
        result = await SmartConnectService.get_saved_profiles(
            user_id=str(current_user.id)
        )
        return SavedProfilesResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch saved profiles: {str(e)}",
        )


# ── Workforce Balance — new endpoints ──────────────────────────────────────────

@router.get("/workload-stats", response_model=WorkloadStatsResponse)
async def get_workload_stats(
    current_user: User = Depends(get_current_user),
):
    """
    Platform-wide workload distribution statistics.

    Returns a breakdown of how many creators fall into each workload bucket
    (free / light / moderate / at-capacity) and the score distribution used
    by the fairness algorithm.

    Useful for admins and for showing platform health on dashboards.
    """
    try:
        stats = await WorkforceBalanceService.get_workload_distribution()
        if not stats:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to compute workload distribution",
            )
        return WorkloadStatsResponse(**stats)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch workload stats: {str(e)}",
        )


@router.patch("/workload-capacity", response_model=WorkloadCapacityResponse)
async def update_workload_capacity(
    request: WorkloadCapacityRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Update the current creator's maximum concurrent project capacity.

    Capacity is clamped to 1–10.  Setting a low capacity (e.g. 1) means the
    creator will be hidden from Smart Connect results once they have 1 active
    project.  Setting a high capacity (e.g. 10) keeps them visible until they
    reach 10 active projects.

    This endpoint is only meaningful for ``crew`` and ``both`` account types.
    Producers can call it but it has no effect on their match visibility.
    """
    try:
        result = await WorkforceBalanceService.update_workload_capacity(
            user_id=str(current_user.id),
            new_capacity=request.capacity,
        )
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Update failed"),
            )
        return WorkloadCapacityResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update workload capacity: {str(e)}",
        )


# ── Platform stats (unchanged) ─────────────────────────────────────────────────

@router.get("/stats")
async def get_stats():
    """
    Get platform statistics for Smart Connect (public).

    Returns total creatives, average rating, average response time, success rate.
    """
    try:
        return {
            "total_creatives": "24x7",
            "average_rating": 4.8,
            "avg_response_time": "24h",
            "success_rate": "89%",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stats: {str(e)}",
        )