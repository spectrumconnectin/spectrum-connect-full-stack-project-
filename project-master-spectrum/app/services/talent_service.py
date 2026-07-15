import re
from typing import List, Optional
from beanie import PydanticObjectId

from app.models.schema import User


def _safe_regex(raw: str) -> str:
    """Escape a user-supplied string before embedding it in a MongoDB $regex.

    Without escaping, a crafted pattern like '(a+)+' can cause catastrophic
    backtracking (ReDoS) inside the MongoDB query engine.  re.escape() converts
    every metacharacter to a literal so the query is always a plain substring search.
    We also hard-cap the length to prevent excessively long patterns.
    """
    return re.escape(raw[:100])


class TalentService:
    @staticmethod
    async def search(
        q: Optional[str] = None,
        location: Optional[str] = None,
        skill: Optional[str] = None,
        limit: int = 30,
    ) -> List[User]:
        # Base filter: active creator accounts only — exclude soft-deleted and suspended users
        # Beanie stores Optional fields as null in MongoDB, not as absent keys.
        # "$exists: False" would never match null-valued fields, excluding everyone.
        # Use "$or" to match both "field is null" and "field doesn't exist" (legacy docs).
        query: dict = {
            "account_type": "crew",
            "is_active": {"$ne": False},   # exclude suspended accounts (is_active = False)
            "$or": [
                {"deleted_at": {"$exists": False}},  # very old docs without the field
                {"deleted_at": None},                # normal Beanie docs (stored as null)
            ],
        }
        if q:
            safe_q = _safe_regex(q)
            query["$or"] = [
                {"profile.display_name": {"$regex": safe_q, "$options": "i"}},
                {"profile.headline": {"$regex": safe_q, "$options": "i"}},
                {"username": {"$regex": safe_q, "$options": "i"}},
            ]
        if location:
            query["profile.location.city"] = {"$regex": _safe_regex(location), "$options": "i"}
        if skill:
            query["profile.skills.name"] = {"$regex": _safe_regex(skill), "$options": "i"}

        # Rank discovery by rating (best first), then most-recently active. This
        # surfaces complete, high-rated profiles instead of raw insertion order
        # (which buried strong profiles behind old/empty test accounts).
        return (
            await User.find(query)
            .sort([("profile.rating", -1), ("last_active", -1)])
            .limit(limit)
            .to_list()
        )
