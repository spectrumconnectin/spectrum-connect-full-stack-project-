from fastapi import APIRouter, Query
from typing import Optional, List

from app.services.talent_service import TalentService

router = APIRouter(prefix="/talent", tags=["talent"])


def _pget(obj, attr, default=None):
    """Safely get an attribute from either a Pydantic model or a dict."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(attr, default)
    return getattr(obj, attr, default)


@router.get("/search")
async def search_talent(
    q: Optional[str] = Query(None, description="free text search on name/headline"),
    location: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
):
    results = await TalentService.search(q=q, location=location, skill=skill, limit=limit)

    def serialize(user):
        profile = user.profile
        stats = user.stats or {}
        stats_get = stats.get if isinstance(stats, dict) else lambda k, d=None: getattr(stats, k, d)

        # Location: might be a nested object or dict
        loc = _pget(profile, "location")
        city = None
        if isinstance(loc, dict):
            city = loc.get("city")
        elif loc is not None:
            city = getattr(loc, "city", None)

        # Skills: list of dicts or Pydantic objects
        raw_skills = _pget(profile, "skills") or []
        skill_names = []
        for s in raw_skills:
            name = s.get("name") if isinstance(s, dict) else getattr(s, "name", None)
            if name:
                skill_names.append(name)

        first = _pget(profile, "first_name") or ""
        last = _pget(profile, "last_name") or ""
        full_name = f"{first} {last}".strip()

        return {
            "id": str(user.id),
            "name": _pget(profile, "display_name") or full_name or user.username,
            "title": _pget(profile, "headline") or _pget(profile, "tagline"),
            "location": city,
            "avatar": _pget(profile, "profile_picture"),
            "skills": skill_names,
            "hourly_rate_min": _pget(profile, "hourly_rate_min"),
            "hourly_rate_max": _pget(profile, "hourly_rate_max"),
            "rating": _pget(profile, "rating") or stats_get("client_satisfaction"),
            "review_count": _pget(profile, "review_count") or stats_get("projects_completed"),
        }

    return {"talent": [serialize(u) for u in results]}
