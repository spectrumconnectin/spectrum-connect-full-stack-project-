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
        query = {"account_type": "crew"}
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

