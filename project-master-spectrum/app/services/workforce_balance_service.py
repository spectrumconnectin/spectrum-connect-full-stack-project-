"""
Workforce Balance Service
=========================
Handles all workload-fairness logic for the Smart Connect matching algorithm.

Responsibilities
----------------
1.  calculate_workload_fairness_score  – given a CrewProfile, return a 0-10 score
    and a human-readable reason used in the match result.

2.  get_trust_tier_score              – convert a SpectrumID tier string to a 0-5
    bonus point value.

3.  update_active_project_count       – recount a creator's live projects from the
    Project collection and persist it back to their CrewProfile.  Called whenever
    a project is created, completed, or cancelled.

4.  bulk_sync_project_counts          – recalculates counts for every CrewProfile in
    one pass (background-job friendly).

5.  get_workload_distribution         – returns platform-wide stats for the
    /smart-connect/workload-stats endpoint.

Scoring Table (per spec document)
----------------------------------
Active projects | Fairness points
0               | 10   (new / fresh — promote exposure)
1 – 2           | 7    (light workload — healthy)
3 – 4           | 4    (moderate — still available)
5+              | 0    (at or over capacity — suppress)

If active_project_count >= workload_capacity the score is forced to 0 regardless
of the table above, because the creator explicitly said they are full.

Trust Tier Bonus
----------------
diamond   → 5 pts
platinum  → 4 pts
gold      → 3 pts
silver    → 2 pts
bronze    → 1 pt
(none / unknown) → 0 pts
"""

from typing import Dict, Any, Optional, Tuple
from datetime import datetime

from beanie import PydanticObjectId

from app.models.schema import User, CrewProfile
from app.models.project import Project


# ── Constants ────────────────────────────────────────────────────────────────

ACTIVE_STATUSES = {"active", "in_progress", "review"}   # statuses that count as "live"

WORKLOAD_SCORE_TABLE = [
    (0,  0,  10, "New/fresh — maximising exposure"),
    (1,  2,  7,  "Light workload — highly available"),
    (3,  4,  4,  "Moderate workload — still available"),
    (5,  999, 0, "At capacity — suppressed from ranking"),
]

TIER_BONUS: Dict[str, int] = {
    "diamond":  5,
    "platinum": 4,
    "gold":     3,
    "silver":   2,
    "bronze":   1,
}


# ── Service ──────────────────────────────────────────────────────────────────

class WorkforceBalanceService:
    """Static-method service — no instantiation needed."""

    # ------------------------------------------------------------------ #
    # Scoring helpers                                                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    def calculate_workload_fairness_score(
        crew_profile: CrewProfile,
    ) -> Tuple[int, str]:
        """
        Return (score, reason_string) for a single CrewProfile.

        The score is 0-10 and is added directly into the Smart Connect
        total match score.

        Parameters
        ----------
        crew_profile : CrewProfile
            The crew member's profile document (must be already fetched).

        Returns
        -------
        (int, str)
            score  – fairness points (0, 4, 7, or 10)
            reason – human-readable explanation shown in match_reasons
        """
        active = crew_profile.active_project_count
        capacity = crew_profile.workload_capacity

        # Creator is at or over their own stated capacity → suppress
        if active >= capacity:
            return 0, f"At stated capacity ({active}/{capacity} projects)"

        # Walk the lookup table
        for low, high, points, label in WORKLOAD_SCORE_TABLE:
            if low <= active <= high:
                return points, label

        return 0, "Workload unknown"

    @staticmethod
    def get_trust_tier_score(user: User) -> Tuple[int, str]:
        """
        Return (bonus_points, tier_label) for the trust-tier bonus.

        Parameters
        ----------
        user : User
            The user document (must include spectrum_id).

        Returns
        -------
        (int, str)
            bonus  – 0–5 points
            label  – tier name for display
        """
        tier = "bronze"
        if user.spectrum_id and user.spectrum_id.tier:
            tier = user.spectrum_id.tier.lower()

        bonus = TIER_BONUS.get(tier, 0)
        return bonus, tier.capitalize()

    # ------------------------------------------------------------------ #
    # Project count sync                                                   #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def update_active_project_count(user_id: str) -> int:
        """
        Recount live projects for one creator and persist the updated
        ``active_project_count`` on their CrewProfile.

        Called by the Projects service whenever a project is created,
        completed, or cancelled so the count stays in sync.

        Parameters
        ----------
        user_id : str
            The creator's User ID (string form of ObjectId).

        Returns
        -------
        int
            The new active project count (0 if no CrewProfile exists).
        """
        try:
            crew_profile = await CrewProfile.find_one(
                CrewProfile.user_id == PydanticObjectId(user_id)
            )
            if not crew_profile:
                return 0

            # Count projects where this user is a team member and status is live
            all_projects = await Project.find(
                {"team_members.user_id": user_id}
            ).to_list()

            active_count = sum(
                1 for p in all_projects
                if p.status in ACTIVE_STATUSES
            )

            crew_profile.active_project_count = active_count
            await crew_profile.save()
            return active_count

        except Exception as e:
            print(f"[WorkforceBalanceService] update_active_project_count error: {e}")
            return 0

    @staticmethod
    async def bulk_sync_project_counts() -> Dict[str, Any]:
        """
        Recalculate and persist active_project_count for every CrewProfile.

        Intended to be called by a background job / cron task to keep counts
        consistent even if hook calls are missed.

        Returns
        -------
        dict
            { "updated": int, "errors": int }
        """
        updated = 0
        errors = 0

        try:
            crew_profiles = await CrewProfile.find_all().to_list()

            for crew_profile in crew_profiles:
                try:
                    user_id_str = str(crew_profile.user_id)

                    all_projects = await Project.find(
                        {"team_members.user_id": user_id_str}
                    ).to_list()

                    active_count = sum(
                        1 for p in all_projects
                        if p.status in ACTIVE_STATUSES
                    )

                    if crew_profile.active_project_count != active_count:
                        crew_profile.active_project_count = active_count
                        await crew_profile.save()

                    updated += 1

                except Exception as inner_e:
                    print(f"[WorkforceBalanceService] bulk_sync error for {crew_profile.user_id}: {inner_e}")
                    errors += 1

        except Exception as e:
            print(f"[WorkforceBalanceService] bulk_sync_project_counts fatal: {e}")

        return {"updated": updated, "errors": errors}

    # ------------------------------------------------------------------ #
    # Platform-wide stats                                                  #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def get_workload_distribution() -> Dict[str, Any]:
        """
        Aggregate workload distribution across the entire platform.

        Returns
        -------
        dict
            breakdown    – counts per bucket (free, light, moderate, at_capacity)
            total_crew   – total CrewProfiles checked
            avg_active   – platform average active projects per creator
            at_capacity  – number of creators at/over their stated capacity
            score_dist   – how many creators fall into each fairness score bucket
        """
        try:
            crew_profiles = await CrewProfile.find_all().to_list()

            if not crew_profiles:
                return {
                    "breakdown": {"free": 0, "light": 0, "moderate": 0, "at_capacity": 0},
                    "total_crew": 0,
                    "avg_active_projects": 0.0,
                    "at_capacity_count": 0,
                    "score_distribution": {"score_10": 0, "score_7": 0, "score_4": 0, "score_0": 0},
                }

            total = len(crew_profiles)
            total_active = 0
            breakdown = {"free": 0, "light": 0, "moderate": 0, "at_capacity": 0}
            score_dist = {"score_10": 0, "score_7": 0, "score_4": 0, "score_0": 0}
            at_capacity_count = 0

            for cp in crew_profiles:
                active = cp.active_project_count
                total_active += active

                if active >= cp.workload_capacity:
                    breakdown["at_capacity"] += 1
                    at_capacity_count += 1
                    score_dist["score_0"] += 1
                elif active == 0:
                    breakdown["free"] += 1
                    score_dist["score_10"] += 1
                elif active <= 2:
                    breakdown["light"] += 1
                    score_dist["score_7"] += 1
                elif active <= 4:
                    breakdown["moderate"] += 1
                    score_dist["score_4"] += 1
                else:
                    breakdown["at_capacity"] += 1
                    at_capacity_count += 1
                    score_dist["score_0"] += 1

            return {
                "breakdown": breakdown,
                "total_crew": total,
                "avg_active_projects": round(total_active / total, 2),
                "at_capacity_count": at_capacity_count,
                "score_distribution": score_dist,
            }

        except Exception as e:
            print(f"[WorkforceBalanceService] get_workload_distribution error: {e}")
            return {}

    # ------------------------------------------------------------------ #
    # Capacity management                                                  #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def update_workload_capacity(
        user_id: str,
        new_capacity: int,
    ) -> Dict[str, Any]:
        """
        Let a creator update their stated maximum concurrent project capacity.

        Parameters
        ----------
        user_id     : str   The creator's User ID.
        new_capacity: int   New capacity value (clamped to 1–10).

        Returns
        -------
        dict  { "success": bool, "capacity": int, "message": str }
        """
        new_capacity = max(1, min(10, new_capacity))   # clamp 1-10

        try:
            crew_profile = await CrewProfile.find_one(
                CrewProfile.user_id == PydanticObjectId(user_id)
            )
            if not crew_profile:
                return {"success": False, "message": "Crew profile not found"}

            crew_profile.workload_capacity = new_capacity
            await crew_profile.save()

            return {
                "success": True,
                "capacity": new_capacity,
                "active_project_count": crew_profile.active_project_count,
                "message": f"Workload capacity updated to {new_capacity}",
            }

        except Exception as e:
            print(f"[WorkforceBalanceService] update_workload_capacity error: {e}")
            return {"success": False, "message": str(e)}