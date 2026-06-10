from fastapi import APIRouter, Query
from typing import Optional, List

from app.services.talent_service import TalentService
from app.services.presence_service import PresenceService

router = APIRouter(prefix="/talent", tags=["talent"])


async def _get_etf_level(user_id) -> str:
    """Return the creator's ETF level name (bronze/silver/gold/platinum)."""
    try:
        from app.services.etf_points_service import EtfPointsService
        level = await EtfPointsService.badge_for(user_id)
        return level.name
    except Exception:
        return "bronze"


async def _get_etf_levels_bulk(user_ids) -> dict:
    """ETF level for many users in a single $in query: {user_id_str: level}."""
    try:
        from app.models.etf_points import EtfPoints
        from bson import ObjectId
        oids = [ObjectId(str(u)) for u in user_ids]
        col = EtfPoints.get_motor_collection()
        docs = await col.find(
            {"user_id": {"$in": oids}}, {"user_id": 1, "level": 1}
        ).to_list(length=None)
        return {str(d["user_id"]): (d.get("level") or "bronze").lower() for d in docs}
    except Exception:
        return {}


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

    # ETF levels + presence for the whole result set in 2 queries total
    # (was 2 queries per user — 60 round-trips for a 30-result page).
    import asyncio
    etf_map, presence_map = await asyncio.gather(
        _get_etf_levels_bulk([u.id for u in results]),
        PresenceService.get_presence_bulk([u.id for u in results]),
    )
    etf_levels = [etf_map.get(str(u.id), "bronze") for u in results]
    presence_data = [presence_map.get(str(u.id), {"is_online": False, "last_activity": None}) for u in results]

    def serialize(user, etf_level: str, presence: dict):
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

        # Availability status — what the user has manually set in their profile
        # (available / busy / not_available). Null means they haven't set it; do NOT
        # default to "available" because that would show everyone as green.
        availability_status = None
        if user.settings:
            availability_status = getattr(user.settings, "availability_status", None)

        # Real-time online presence from PresenceService (heartbeat-based, 2-min window).
        # Use last_activity — updated on every heartbeat — as the authoritative
        # "last seen" timestamp. last_seen is only stamped on explicit logout.
        is_online = isinstance(presence, dict) and presence.get("is_online", False)
        last_seen = (presence.get("last_activity") if isinstance(presence, dict) else None)

        return {
            "id": str(user.id),
            "name": _pget(profile, "display_name") or full_name or user.username,
            "title": _pget(profile, "headline") or _pget(profile, "tagline"),
            "location": city,
            "avatar": _pget(profile, "profile_picture"),
            "skills": skill_names,
            "hourly_rate_min": _pget(profile, "hourly_rate_min"),
            "hourly_rate_max": _pget(profile, "hourly_rate_max"),
            # rating / review_count are stored directly on User, not user.profile
            "rating": getattr(user, "rating", None) or stats_get("client_satisfaction") or 0.0,
            "review_count": getattr(user, "review_count", None) or 0,
            # Stage 4 additions
            "etf_level": etf_level if isinstance(etf_level, str) else "bronze",
            # Profile-set availability (busy/available/not_available) — null if not set
            "availability_status": availability_status,
            # Real-time heartbeat presence — only True if user sent a heartbeat recently
            "is_online": is_online,
            "last_seen": last_seen,
            "portfolio_has_video": portfolio_has_video,
            "portfolio_item_count": portfolio_item_count,
        }

    return {"talent": [serialize(u, etf_levels[i], presence_data[i]) for i, u in enumerate(results)]}
