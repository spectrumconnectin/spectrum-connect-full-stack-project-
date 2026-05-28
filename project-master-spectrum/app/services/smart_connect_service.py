"""
Smart Connect Service
=====================
Business logic for smart matching and collaborator discovery.

Scoring Algorithm (v2 — Workforce Balance)
-------------------------------------------
Category            | Points
--------------------|--------
Role match          | 35
Skills match        | 25
Specialization      | 10
Location            | 10
Rating              | 5
Workload fairness   | 10   <- NEW (via WorkforceBalanceService)
Trust tier          | 5    <- NEW (via WorkforceBalanceService)
--------------------|--------
Max total           | 100

Workload fairness breakdown
    0 active projects   -> 10 pts
    1-2 active          -> 7  pts
    3-4 active          -> 4  pts
    5+ or at capacity   -> 0  pts

Trust tier breakdown
    diamond -> 5 pts | platinum -> 4 | gold -> 3 | silver -> 2 | bronze -> 1
"""

from typing import Dict, Any, List, Optional
from beanie import PydanticObjectId

from app.models.schema import User, CrewProfile
from app.services.workforce_balance_service import WorkforceBalanceService


# --------------------------------------------------------------------------- #
# Helpers                                                                      #
# --------------------------------------------------------------------------- #

def _extract_skill_names(skills) -> List[str]:
    """
    Normalise User.profile.skills to a plain list of lowercase strings.
    Handles both List[Skill] objects (has .name) and plain strings.
    """
    if not skills:
        return []
    result = []
    for s in skills:
        if hasattr(s, "name"):
            result.append(s.name.lower())
        elif isinstance(s, str):
            result.append(s.lower())
    return result


def _tier_order(tier: str) -> int:
    """Return a numeric rank so we can filter by minimum tier."""
    order = {"bronze": 1, "silver": 2, "gold": 3, "platinum": 4, "diamond": 5}
    return order.get((tier or "bronze").lower(), 1)


# --------------------------------------------------------------------------- #
# Service                                                                      #
# --------------------------------------------------------------------------- #

class SmartConnectService:
    """Service for smart matching and creative discovery."""

    @staticmethod
    async def smart_match(
        project_description: str,
        project_type: str,
        roles_needed: List[str],
        timeline: Optional[str] = None,
        skills_required: Optional[List[str]] = None,
        location: Optional[str] = None,
        is_remote: bool = False,
        min_trust_tier: Optional[str] = None,
        workload_aware: bool = True,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """
        Find matching collaborators based on project needs.

        New in v2
        ---------
        workload_aware  - when True (default) applies workload-fairness and
                          trust-tier scoring.
        min_trust_tier  - filter out creators below this tier.
        """
        try:
            crew_profiles = await CrewProfile.find_all().to_list()
            min_tier_rank = _tier_order(min_trust_tier) if min_trust_tier else 1

            matches = []

            for crew_profile in crew_profiles:
                user = await User.get(crew_profile.user_id)
                if not user or not user.profile:
                    continue

                # Trust tier filter
                user_tier = (
                    user.spectrum_id.tier
                    if user.spectrum_id and user.spectrum_id.tier
                    else "bronze"
                )
                if _tier_order(user_tier) < min_tier_rank:
                    continue

                score = 0
                reasons: List[str] = []
                score_breakdown: Dict[str, int] = {}

                # 1. Role match (max 35 pts)
                role_score = 0
                if crew_profile.title:
                    for role in roles_needed:
                        if role.lower() in crew_profile.title.lower():
                            role_score = 35
                            reasons.append(f"Role match: {crew_profile.title}")
                            break
                        elif crew_profile.departments:
                            for dept in crew_profile.departments:
                                if role.lower() in dept.lower():
                                    role_score = 25
                                    reasons.append(f"Department match: {dept}")
                                    break
                score += role_score
                score_breakdown["role"] = role_score

                # 2. Skills match (max 25 pts)
                skill_score = 0
                if skills_required and user.profile.skills:
                    user_skill_names = _extract_skill_names(user.profile.skills)
                    matching = [s for s in skills_required if s.lower() in user_skill_names]
                    if matching:
                        skill_score = min(25, len(matching) * 8)
                        reasons.append(f"Skills: {', '.join(matching[:3])}")
                score += skill_score
                score_breakdown["skills"] = skill_score

                # 3. Specialization (max 10 pts)
                spec_score = 0
                if crew_profile.specializations:
                    for spec in crew_profile.specializations:
                        if project_type.lower() in spec.lower():
                            spec_score = 10
                            reasons.append(f"Specialization: {spec}")
                            break
                score += spec_score
                score_breakdown["specialization"] = spec_score

                # 4. Location (max 10 pts)
                loc_score = 0
                if not is_remote and location and user.profile.location:
                    location_str = (
                        user.profile.location
                        if isinstance(user.profile.location, str)
                        else str(user.profile.location)
                    )
                    if location.lower() in location_str.lower():
                        loc_score = 10
                        reasons.append("Location match")
                elif is_remote:
                    loc_score = 5
                    reasons.append("Remote-ready")
                score += loc_score
                score_breakdown["location"] = loc_score

                # 5. Rating bonus (max 5 pts)
                rating_score = 0
                if crew_profile.rating and crew_profile.rating.overall:
                    rating_score = min(5, int(crew_profile.rating.overall))
                    if crew_profile.rating.overall >= 4.5:
                        reasons.append(f"Highly rated ({crew_profile.rating.overall:.1f})")
                score += rating_score
                score_breakdown["rating"] = rating_score

                # 6. Workload fairness (max 10 pts)
                workload_score = 0
                workload_reason = ""
                if workload_aware:
                    workload_score, workload_reason = (
                        WorkforceBalanceService.calculate_workload_fairness_score(crew_profile)
                    )
                    if workload_score > 0:
                        reasons.append(f"Availability: {workload_reason}")
                score += workload_score
                score_breakdown["workload_fairness"] = workload_score

                # 7. Trust tier bonus (max 5 pts)
                trust_score_bonus = 0
                tier_label = "Bronze"
                if workload_aware:
                    trust_score_bonus, tier_label = WorkforceBalanceService.get_trust_tier_score(user)
                    if trust_score_bonus >= 3:
                        reasons.append(f"Trust tier: {tier_label}")
                score += trust_score_bonus
                score_breakdown["trust_tier"] = trust_score_bonus

                # Threshold and match level
                if score < 20:
                    continue

                if score >= 80:
                    match_level = "Perfect Fit"
                elif score >= 60:
                    match_level = "Great Fit"
                else:
                    match_level = "Good Fit"

                if timeline and crew_profile.availability:
                    reasons.append("Timeline available")

                matches.append({
                    "profile": {
                        "user_id": str(user.id),
                        "name": user.profile.display_name or user.username,
                        "title": crew_profile.title or "Creative Professional",
                        "role": crew_profile.title,
                        "avatar": user.profile.profile_picture,
                        "location": user.profile.location,
                        "rating": crew_profile.rating.overall if crew_profile.rating else 0.0,
                        "total_reviews": (
                            crew_profile.rating.total_reviews if crew_profile.rating else 0
                        ),
                        "skills": [
                            s.name if hasattr(s, "name") else s
                            for s in (user.profile.skills[:5] if user.profile.skills else [])
                        ],
                        "specializations": (
                            crew_profile.specializations[:3]
                            if crew_profile.specializations else []
                        ),
                        "bio": user.profile.bio,
                        "daily_rate": crew_profile.daily_rate,
                        "availability": "Available" if crew_profile.availability else None,
                        "active_project_count": crew_profile.active_project_count,
                        "workload_capacity": crew_profile.workload_capacity,
                        "trust_tier": tier_label,
                        "workload_score": workload_score,
                        "trust_score": (
                            user.spectrum_id.trust_score if user.spectrum_id else 0.0
                        ),
                    },
                    "match_score": min(100, score),
                    "match_level": match_level,
                    "match_reasons": reasons[:4],
                    "score_breakdown": score_breakdown,
                    "workload_info": {
                        "active_projects": crew_profile.active_project_count,
                        "capacity": crew_profile.workload_capacity,
                        "fairness_score": workload_score,
                        "fairness_label": workload_reason,
                    },
                })

            # Sort by score then fewest active projects as tiebreak
            matches.sort(
                key=lambda x: (-x["match_score"], x["workload_info"]["active_projects"])
            )
            matches = matches[:limit]

            return {
                "matches": matches,
                "total_matches": len(matches),
                "search_criteria": {
                    "project_type": project_type,
                    "roles_needed": roles_needed,
                    "is_remote": is_remote,
                    "workload_aware": workload_aware,
                    "min_trust_tier": min_trust_tier,
                },
            }

        except Exception as e:
            print(f"[SmartConnectService] smart_match error: {e}")
            return {"matches": [], "total_matches": 0, "search_criteria": {}}

    @staticmethod
    async def search_creatives(
        query: Optional[str] = None,
        roles: Optional[List[str]] = None,
        skills: Optional[List[str]] = None,
        location: Optional[str] = None,
        min_rating: Optional[float] = None,
        max_rate: Optional[float] = None,
        min_trust_tier: Optional[str] = None,
        max_workload: Optional[int] = None,
        verified_skills_only: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Search for creatives with filters (v2 adds workload and trust tier filters)."""
        try:
            crew_query = CrewProfile.find()

            if roles:
                crew_query = crew_query.find({
                    "$or": [
                        {"title": {"$regex": "|".join(roles), "$options": "i"}},
                        {"departments": {"$in": roles}},
                    ]
                })

            if max_rate:
                crew_query = crew_query.find({"daily_rate": {"$lte": max_rate}})

            if min_rating:
                crew_query = crew_query.find({"rating.overall": {"$gte": min_rating}})

            if max_workload is not None:
                crew_query = crew_query.find({"active_project_count": {"$lte": max_workload}})

            total = await crew_query.count()
            crew_profiles = await crew_query.skip(offset).limit(limit).to_list()

            min_tier_rank = _tier_order(min_trust_tier) if min_trust_tier else 1

            creatives = []
            for crew_profile in crew_profiles:
                user = await User.get(crew_profile.user_id)
                if not user or not user.profile:
                    continue

                # Text search
                if query:
                    search_text = " ".join(filter(None, [
                        user.profile.display_name, user.username,
                        crew_profile.title, user.profile.bio,
                    ])).lower()
                    if query.lower() not in search_text:
                        continue

                # Location filter
                if location and user.profile.location:
                    location_str = (
                        user.profile.location
                        if isinstance(user.profile.location, str)
                        else str(user.profile.location)
                    )
                    if location.lower() not in location_str.lower():
                        continue

                # Skills filter
                if skills and user.profile.skills:
                    user_skill_names = _extract_skill_names(user.profile.skills)
                    if not any(s.lower() in user_skill_names for s in skills):
                        continue

                # Trust tier filter
                user_tier = (
                    user.spectrum_id.tier
                    if user.spectrum_id and user.spectrum_id.tier
                    else "bronze"
                )
                if _tier_order(user_tier) < min_tier_rank:
                    continue

                wl_score, _ = WorkforceBalanceService.calculate_workload_fairness_score(crew_profile)
                _, tier_label = WorkforceBalanceService.get_trust_tier_score(user)

                creatives.append({
                    "user_id": str(user.id),
                    "name": user.profile.display_name or user.username,
                    "title": crew_profile.title or "Creative Professional",
                    "role": crew_profile.title,
                    "avatar": user.profile.profile_picture,
                    "location": user.profile.location,
                    "rating": crew_profile.rating.overall if crew_profile.rating else 0.0,
                    "total_reviews": (
                        crew_profile.rating.total_reviews if crew_profile.rating else 0
                    ),
                    "skills": [
                        s.name if hasattr(s, "name") else s
                        for s in (user.profile.skills[:5] if user.profile.skills else [])
                    ],
                    "specializations": (
                        crew_profile.specializations[:3]
                        if crew_profile.specializations else []
                    ),
                    "bio": user.profile.bio,
                    "daily_rate": crew_profile.daily_rate,
                    "availability": "Available" if crew_profile.availability else None,
                    "active_project_count": crew_profile.active_project_count,
                    "workload_capacity": crew_profile.workload_capacity,
                    "trust_tier": tier_label,
                    "workload_score": wl_score,
                    "trust_score": (
                        user.spectrum_id.trust_score if user.spectrum_id else 0.0
                    ),
                })

            return {
                "creatives": creatives,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total,
            }

        except Exception as e:
            print(f"[SmartConnectService] search_creatives error: {e}")
            return {"creatives": [], "total": 0, "limit": limit, "offset": offset, "has_more": False}

    @staticmethod
    async def get_featured_creatives(limit: int = 6) -> List[Dict[str, Any]]:
        """Return featured / top-rated creatives enriched with workload data."""
        try:
            crew_profiles = await CrewProfile.find(
                CrewProfile.rating.overall >= 4.5
            ).sort(-CrewProfile.rating.overall).limit(limit).to_list()

            if len(crew_profiles) < limit:
                extra = await CrewProfile.find().limit(limit - len(crew_profiles)).to_list()
                crew_profiles.extend(extra)

            creatives = []
            for crew_profile in crew_profiles:
                user = await User.get(crew_profile.user_id)
                if not user or not user.profile:
                    continue

                wl_score, _ = WorkforceBalanceService.calculate_workload_fairness_score(crew_profile)
                _, tier_label = WorkforceBalanceService.get_trust_tier_score(user)

                creatives.append({
                    "user_id": str(user.id),
                    "name": user.profile.display_name or user.username,
                    "title": crew_profile.title or "Creative Professional",
                    "role": crew_profile.title,
                    "avatar": user.profile.profile_picture,
                    "location": user.profile.location,
                    "rating": crew_profile.rating.overall if crew_profile.rating else 0.0,
                    "total_reviews": (
                        crew_profile.rating.total_reviews if crew_profile.rating else 0
                    ),
                    "skills": [
                        s.name if hasattr(s, "name") else s
                        for s in (user.profile.skills[:5] if user.profile.skills else [])
                    ],
                    "specializations": (
                        crew_profile.specializations[:3]
                        if crew_profile.specializations else []
                    ),
                    "bio": user.profile.bio,
                    "daily_rate": crew_profile.daily_rate,
                    "availability": "Available" if crew_profile.availability else None,
                    "active_project_count": crew_profile.active_project_count,
                    "workload_capacity": crew_profile.workload_capacity,
                    "trust_tier": tier_label,
                    "workload_score": wl_score,
                    "trust_score": (
                        user.spectrum_id.trust_score if user.spectrum_id else 0.0
                    ),
                })

            return creatives

        except Exception as e:
            print(f"[SmartConnectService] get_featured_creatives error: {e}")
            return []

    @staticmethod
    async def save_profile(user_id: str, profile_user_id: str) -> Dict[str, Any]:
        """Save a profile to user's saved list."""
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return {"error": "User not found"}

            if not getattr(user, "saved_profiles", None):
                user.saved_profiles = []

            profile_id = PydanticObjectId(profile_user_id)
            if profile_id not in user.saved_profiles:
                user.saved_profiles.append(profile_id)
                await user.save()

            return {"success": True, "message": "Profile saved successfully"}

        except Exception as e:
            print(f"[SmartConnectService] save_profile error: {e}")
            return {"error": str(e)}

    @staticmethod
    async def get_saved_profiles(user_id: str) -> Dict[str, Any]:
        """Get user's saved profiles enriched with workload data."""
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user or not getattr(user, "saved_profiles", None):
                return {"profiles": [], "total": 0}

            profiles = []
            for saved_user_id in user.saved_profiles:
                saved_user = await User.get(saved_user_id)
                if not saved_user or not saved_user.profile:
                    continue

                crew_profile = await CrewProfile.find_one(
                    CrewProfile.user_id == saved_user_id
                )
                if not crew_profile:
                    continue

                wl_score, _ = WorkforceBalanceService.calculate_workload_fairness_score(crew_profile)
                _, tier_label = WorkforceBalanceService.get_trust_tier_score(saved_user)

                profiles.append({
                    "user_id": str(saved_user.id),
                    "name": saved_user.profile.display_name or saved_user.username,
                    "title": crew_profile.title or "Creative Professional",
                    "role": crew_profile.title,
                    "avatar": saved_user.profile.profile_picture,
                    "location": saved_user.profile.location,
                    "rating": crew_profile.rating.overall if crew_profile.rating else 0.0,
                    "total_reviews": (
                        crew_profile.rating.total_reviews if crew_profile.rating else 0
                    ),
                    "skills": [
                        s.name if hasattr(s, "name") else s
                        for s in (saved_user.profile.skills[:5] if saved_user.profile.skills else [])
                    ],
                    "specializations": (
                        crew_profile.specializations[:3]
                        if crew_profile.specializations else []
                    ),
                    "bio": saved_user.profile.bio,
                    "daily_rate": crew_profile.daily_rate,
                    "availability": "Available" if crew_profile.availability else None,
                    "active_project_count": crew_profile.active_project_count,
                    "workload_capacity": crew_profile.workload_capacity,
                    "trust_tier": tier_label,
                    "workload_score": wl_score,
                    "trust_score": (
                        saved_user.spectrum_id.trust_score if saved_user.spectrum_id else 0.0
                    ),
                })

            return {"profiles": profiles, "total": len(profiles)}

        except Exception as e:
            print(f"[SmartConnectService] get_saved_profiles error: {e}")
            return {"profiles": [], "total": 0}