from fastapi import APIRouter, Query
from typing import Optional, List

from app.services.talent_service import TalentService

router = APIRouter(prefix="/talent", tags=["talent"])


@router.get("/search")
async def search_talent(
    q: Optional[str] = Query(None, description="free text search on name/headline"),
    location: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
):
    results = await TalentService.search(q=q, location=location, skill=skill, limit=limit)
    def serialize(user):
        profile = user.profile or {}
        stats = user.stats or {}
        return {
          "id": str(user.id),
          "name": profile.get("display_name") or f"{profile.get('first_name','')}".strip() or user.username,
          "title": profile.get("headline") or profile.get("tagline"),
          "location": (profile.get("location") or {}).get("city"),
          "avatar": profile.get("profile_picture"),
          "skills": [s.get("name") for s in (profile.get("skills") or []) if s.get("name")] if profile.get("skills") else [],
          "hourly_rate_min": profile.get("hourly_rate_min"),
          "hourly_rate_max": profile.get("hourly_rate_max"),
          "rating": profile.get("rating") or stats.get("client_satisfaction"),
          "review_count": profile.get("review_count") or stats.get("projects_completed"),
        }
    return {"talent": [serialize(u) for u in results]}

