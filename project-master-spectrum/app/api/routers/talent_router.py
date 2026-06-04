from fastapi import APIRouter, Query
from typing import Optional, List

from app.services.talent_service import TalentService

router = APIRouter(prefix="/talent", tags=["talent"])


async def _get_etf_level(user_id) -> str:
    """Return the creator's ETF level name (bronze/silver/gold/platinum)."""
    try:
        from app.services.etf_points_service import EtfPointsService
        level = await EtfPointsService.badge_for(user_id)
        return level.name
    except Exception:
        return "bronze"


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

    # Fetch ETF levels for all users in parallel to avoid N+1
    import asyncio
    etf_levels = await asyncio.gather(
        *[_get_etf_level(u.id) for u in results],
        return_exceptions=True
    )

    def serialize(user, etf_level: str):
        profile = user.profile
        stats = user.stats or {}
        stats_get = stats.get if isinstance(stats, dict) else lambda k, d=None: getattr(stats, k, d)

        # Location
        loc = _pget(profile, "location")
        city = None
        if isinstance(loc, dict):
            city = loc.get("city")
        elif loc is not None:
            city = getattr(loc, "city", None)

        # Skills
        raw_skills = _pget(profile, "skills") or []
        skill_names = []
        for s in raw_skills:
            name = s.get("name") if isinstance(s, dict) else getattr(s, "name", None)
            if name:
                skill_names.append(name)

        first = _pget(profile, "first_name") or ""
        last = _pget(profile, "last_name") or ""
        full_name = f"{first} {last}".strip()

        # Portfolio info
        portfolio_items = _pget(profile, "portfolio_items") or []
        portfolio_has_video = any(
            (i.get("type") if isinstance(i, dict) else getattr(i, "type", None)) == "video"
            for i in portfolio_items
        )
        portfolio_item_count = len(portfolio_items)

        # Availability status (set during onboarding / profile settings)
        availability_status = None
        if user.settings:
            availability_status = getattr(user.settings, "availability_status", None)

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
            # Stage 4 additions
            "etf_level": etf_level if isinstance(etf_level, str) else "bronze",
            "availability_status": availability_status or "available",
            "portfolio_has_video": portfolio_has_video,
            "portfolio_item_count": portfolio_item_count,
        }

    return {"talent": [serialize(u, etf_levels[i]) for i, u in enumerate(results)]}
