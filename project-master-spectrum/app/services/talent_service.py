from typing import List, Optional
from beanie import PydanticObjectId

from app.models.schema import User


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
            query["$or"] = [
                {"profile.display_name": {"$regex": q, "$options": "i"}},
                {"profile.headline": {"$regex": q, "$options": "i"}},
                {"username": {"$regex": q, "$options": "i"}},
            ]
        if location:
            query["profile.location.city"] = {"$regex": location, "$options": "i"}
        if skill:
            query["profile.skills.name"] = {"$regex": skill, "$options": "i"}

        return await User.find(query).limit(limit).to_list()

