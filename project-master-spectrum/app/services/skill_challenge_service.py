"""
Skill Challenge Service
=======================
Business logic for the Skill Verification Challenges module.

Responsibilities
----------------
Creator-facing
  1. get_available_challenges  – browse active challenges with filters
  2. get_challenge_by_id       – full challenge detail + instructions
  3. submit_challenge          – creator submits work for evaluation
  4. get_my_submissions        – paginated submission history
  5. get_my_badges             – all earned skill badges

Admin-facing
  6. create_challenge          – admin creates a new challenge
  7. update_challenge          – admin edits challenge details
  8. evaluate_submission       – admin manually grades a submission
  9. get_pending_submissions   – queue of submissions awaiting review
 10. revoke_badge              – admin revokes a fraudulent badge

Side-effects on PASS
--------------------
  - SkillBadge created (or upgraded if exists for same skill)
  - User.profile.skills[matched_skill].level updated if badge_level is higher
  - User.spectrum_id.verification_checks_passed += "skill_verified" (once)
  - User.spectrum_id.badges  += SpectrumBadge(badge_type="skill_verified")
  - User.spectrum_id.trust_score boosted (+5 per new badge, capped at 100)
  - SkillChallenge.submission_count / pass_count / average_score updated
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.skill_challenge import (
    SkillChallenge,
    ChallengeSubmission,
    SkillBadge,
    EvaluationCriterion,
    SubmittedContent,
    CriterionScore,
)
from app.models.schema import User, Skill, SpectrumBadge


# ── Badge level ordering (for upgrade logic) ──────────────────────────────────
BADGE_LEVEL_ORDER = {"verified": 1, "advanced": 2, "expert": 3, "master": 4}

# Trust score boost per new verified skill
TRUST_BOOST_PER_BADGE = 5.0


# ═══════════════════════════════════════════════════════════════════════════════
# CREATOR-FACING
# ═══════════════════════════════════════════════════════════════════════════════

class SkillChallengeService:

    @staticmethod
    async def get_available_challenges(
        skill_category: Optional[str] = None,
        difficulty: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """List active challenges with optional filters."""
        query = SkillChallenge.find(SkillChallenge.is_active == True)

        if skill_category:
            query = query.find(SkillChallenge.skill_category == skill_category)
        if difficulty:
            query = query.find(SkillChallenge.difficulty == difficulty)

        total = await query.count()
        challenges_raw = (
            await query.sort(-SkillChallenge.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        challenges = []
        for c in challenges_raw:
            challenges.append({
                "challenge_id": str(c.id),
                "title": c.title,
                "description": c.description,
                "skill_category": c.skill_category,
                "difficulty": c.difficulty,
                "challenge_type": c.challenge_type,
                "badge_level": c.badge_level,
                "pass_threshold": c.pass_threshold,
                "time_limit_minutes": c.time_limit_minutes,
                "submission_count": c.submission_count,
                "average_score": c.average_score,
                "pass_rate": c.pass_rate,
                "criteria_count": len(c.evaluation_criteria),
                "created_at": c.created_at,
            })

        return {
            "challenges": challenges,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }

    @staticmethod
    async def get_challenge_by_id(challenge_id: str) -> Dict[str, Any]:
        """Full challenge detail including instructions and evaluation criteria."""
        c = await SkillChallenge.get(PydanticObjectId(challenge_id))
        if not c or not c.is_active:
            raise HTTPException(status_code=404, detail="Challenge not found.")

        return {
            "challenge_id": str(c.id),
            "title": c.title,
            "description": c.description,
            "skill_category": c.skill_category,
            "difficulty": c.difficulty,
            "challenge_type": c.challenge_type,
            "instructions": c.instructions,
            "badge_level": c.badge_level,
            "pass_threshold": c.pass_threshold,
            "time_limit_minutes": c.time_limit_minutes,
            "evaluation_criteria": [
                {
                    "criterion_name": ec.criterion_name,
                    "weight": ec.weight,
                    "max_score": ec.max_score,
                    "description": ec.description,
                }
                for ec in c.evaluation_criteria
            ],
            "submission_count": c.submission_count,
            "average_score": c.average_score,
            "pass_rate": c.pass_rate,
            "created_at": c.created_at,
        }

    @staticmethod
    async def submit_challenge(
        challenge_id: str,
        user_id: str,
        content_type: str,
        value: str,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creator submits work for a challenge.

        - Counts previous attempts for this user + challenge.
        - Creates a ChallengeSubmission with status=pending.
        """
        challenge = await SkillChallenge.get(PydanticObjectId(challenge_id))
        if not challenge or not challenge.is_active:
            raise HTTPException(status_code=404, detail="Challenge not found.")

        uid = PydanticObjectId(user_id)

        # Count previous attempts
        attempt_number = await ChallengeSubmission.find(
            ChallengeSubmission.challenge_id == challenge.id,
            ChallengeSubmission.user_id == uid,
        ).count() + 1

        submission = ChallengeSubmission(
            challenge_id=challenge.id,
            user_id=uid,
            submitted_content=SubmittedContent(
                content_type=content_type,
                value=value,
                notes=notes,
            ),
            pass_threshold=challenge.pass_threshold,
            attempt_number=attempt_number,
        )
        await submission.insert()

        # Bump challenge submission count
        challenge.submission_count += 1
        challenge.updated_at = datetime.utcnow()
        await challenge.save()

        return {
            "success": True,
            "submission_id": str(submission.id),
            "challenge_id": challenge_id,
            "evaluation_status": "pending",
            "attempt_number": attempt_number,
            "message": "Submission received. Our team will evaluate it within 1-3 business days.",
        }

    @staticmethod
    async def get_my_submissions(
        user_id: str,
        challenge_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Paginated list of a creator's challenge submissions."""
        uid = PydanticObjectId(user_id)
        query = ChallengeSubmission.find(ChallengeSubmission.user_id == uid)

        if challenge_id:
            query = query.find(
                ChallengeSubmission.challenge_id == PydanticObjectId(challenge_id)
            )
        if status_filter:
            query = query.find(
                ChallengeSubmission.evaluation_status == status_filter
            )

        total = await query.count()
        subs_raw = (
            await query.sort(-ChallengeSubmission.submitted_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        submissions = []
        for s in subs_raw:
            challenge = await SkillChallenge.get(s.challenge_id)
            submissions.append({
                "submission_id": str(s.id),
                "challenge_id": str(s.challenge_id),
                "challenge_title": challenge.title if challenge else "Unknown",
                "skill_category": challenge.skill_category if challenge else None,
                "difficulty": challenge.difficulty if challenge else None,
                "evaluation_status": s.evaluation_status,
                "overall_score": s.overall_score,
                "pass_threshold": s.pass_threshold,
                "badge_awarded": s.badge_awarded,
                "attempt_number": s.attempt_number,
                "submitted_at": s.submitted_at,
                "evaluated_at": s.evaluated_at,
            })

        return {
            "submissions": submissions,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }

    @staticmethod
    async def get_my_badges(
        user_id: str,
        active_only: bool = True,
    ) -> Dict[str, Any]:
        """List all skill badges earned by the user."""
        uid = PydanticObjectId(user_id)
        query = SkillBadge.find(SkillBadge.user_id == uid)
        if active_only:
            query = query.find(SkillBadge.is_active == True)

        badges_raw = await query.sort(-SkillBadge.awarded_at).to_list()

        badges = []
        for b in badges_raw:
            challenge = await SkillChallenge.get(b.challenge_id)
            badges.append({
                "badge_id": str(b.id),
                "skill_name": b.skill_name,
                "badge_level": b.badge_level,
                "challenge_title": challenge.title if challenge else "Unknown",
                "challenge_difficulty": challenge.difficulty if challenge else None,
                "awarded_at": b.awarded_at,
                "expires_at": b.expires_at,
                "is_active": b.is_active,
            })

        return {
            "badges": badges,
            "total": len(badges),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN-FACING
# ═══════════════════════════════════════════════════════════════════════════════

    @staticmethod
    async def create_challenge(
        admin_user_id: str,
        title: str,
        description: str,
        skill_category: str,
        difficulty: str,
        challenge_type: str,
        instructions: str,
        evaluation_criteria: List[Dict[str, Any]],
        pass_threshold: float = 7.0,
        badge_level: str = "verified",
        time_limit_minutes: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Admin creates a new skill challenge."""

        # Validate weights sum to 1.0
        if evaluation_criteria:
            total_weight = sum(float(ec.get("weight", 0)) for ec in evaluation_criteria)
            if not (0.99 <= total_weight <= 1.01):
                raise HTTPException(
                    status_code=400,
                    detail=f"Evaluation criteria weights must sum to 1.0 (got {total_weight:.2f}).",
                )

        criteria_docs = [
            EvaluationCriterion(
                criterion_name=ec["criterion_name"],
                weight=float(ec["weight"]),
                max_score=float(ec.get("max_score", 10.0)),
                description=ec.get("description"),
            )
            for ec in evaluation_criteria
        ]

        challenge = SkillChallenge(
            title=title,
            description=description,
            skill_category=skill_category,
            difficulty=difficulty,
            challenge_type=challenge_type,
            instructions=instructions,
            evaluation_criteria=criteria_docs,
            pass_threshold=pass_threshold,
            badge_level=badge_level,
            time_limit_minutes=time_limit_minutes,
            created_by=PydanticObjectId(admin_user_id),
        )
        await challenge.insert()

        return {
            "success": True,
            "challenge_id": str(challenge.id),
            "title": challenge.title,
            "skill_category": challenge.skill_category,
            "difficulty": challenge.difficulty,
            "message": "Challenge created and is now active.",
        }

    @staticmethod
    async def update_challenge(
        challenge_id: str,
        updates: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Admin updates a challenge (title, instructions, active status, etc.)."""
        challenge = await SkillChallenge.get(PydanticObjectId(challenge_id))
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found.")

        allowed = {
            "title", "description", "instructions", "is_active",
            "pass_threshold", "time_limit_minutes", "badge_level",
        }
        for key, value in updates.items():
            if key in allowed:
                setattr(challenge, key, value)

        challenge.updated_at = datetime.utcnow()
        await challenge.save()

        return {
            "success": True,
            "challenge_id": challenge_id,
            "message": "Challenge updated.",
        }

    @staticmethod
    async def get_pending_submissions(
        limit: int = 20,
        offset: int = 0,
        skill_category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Admin queue — submissions awaiting evaluation."""
        query = ChallengeSubmission.find(
            ChallengeSubmission.evaluation_status == "pending"
        )

        total = await query.count()
        subs_raw = (
            await query.sort(+ChallengeSubmission.submitted_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        submissions = []
        for s in subs_raw:
            user = await User.get(s.user_id)
            challenge = await SkillChallenge.get(s.challenge_id)

            if skill_category and challenge and challenge.skill_category != skill_category:
                continue

            submissions.append({
                "submission_id": str(s.id),
                "challenge_id": str(s.challenge_id),
                "challenge_title": challenge.title if challenge else "Unknown",
                "skill_category": challenge.skill_category if challenge else None,
                "difficulty": challenge.difficulty if challenge else None,
                "user_id": str(s.user_id),
                "username": user.username if user else "unknown",
                "content_type": s.submitted_content.content_type,
                "submission_url": s.submitted_content.value,
                "submission_notes": s.submitted_content.notes,
                "attempt_number": s.attempt_number,
                "submitted_at": s.submitted_at,
            })

        return {
            "submissions": submissions,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }

    @staticmethod
    async def evaluate_submission(
        submission_id: str,
        admin_user_id: str,
        criterion_scores: List[Dict[str, Any]],
        evaluator_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Admin manually evaluates a submission.

        Calculates weighted overall_score, determines pass/fail,
        and awards badge if passed.
        """
        submission = await ChallengeSubmission.get(PydanticObjectId(submission_id))
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found.")

        if submission.evaluation_status != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Submission already evaluated (status: {submission.evaluation_status}).",
            )

        challenge = await SkillChallenge.get(submission.challenge_id)
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found.")

        # Build criterion score objects
        score_docs = [
            CriterionScore(
                criterion_name=cs["criterion_name"],
                score=float(cs["score"]),
                feedback=cs.get("feedback"),
            )
            for cs in criterion_scores
        ]

        # Calculate weighted overall score
        criteria_map = {ec.criterion_name: ec for ec in challenge.evaluation_criteria}
        weighted_total = 0.0
        for cs in score_docs:
            criterion = criteria_map.get(cs.criterion_name)
            if criterion:
                normalised = cs.score / criterion.max_score  # 0–1
                weighted_total += normalised * criterion.weight * 10  # scale to 0–10

        overall_score = round(weighted_total, 2)
        passed = overall_score >= submission.pass_threshold

        now = datetime.utcnow()
        submission.evaluation_status = "passed" if passed else "failed"
        submission.evaluation_scores = score_docs
        submission.overall_score = overall_score
        submission.evaluator_notes = evaluator_notes
        submission.evaluator_type = "manual"
        submission.evaluated_at = now

        # Update challenge aggregate stats
        challenge.pass_count += 1 if passed else 0
        prev_total = challenge.average_score * (challenge.submission_count - 1)
        challenge.average_score = round(
            (prev_total + overall_score) / challenge.submission_count, 2
        )
        challenge.updated_at = now
        await challenge.save()

        badge_info = None
        if passed:
            badge_info = await SkillChallengeService._award_badge(
                submission=submission,
                challenge=challenge,
                now=now,
            )
            submission.badge_awarded = True
            submission.badge_id = PydanticObjectId(badge_info["badge_id"])

        await submission.save()

        return {
            "success": True,
            "submission_id": submission_id,
            "evaluation_status": submission.evaluation_status,
            "overall_score": overall_score,
            "pass_threshold": submission.pass_threshold,
            "passed": passed,
            "badge_awarded": passed,
            "badge_info": badge_info,
            "message": (
                f"Submission passed with score {overall_score}/10. Badge awarded!"
                if passed
                else f"Submission failed with score {overall_score}/10. Creator can resubmit."
            ),
        }

    # ── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    async def _award_badge(
        submission: ChallengeSubmission,
        challenge: SkillChallenge,
        now: datetime,
    ) -> Dict[str, Any]:
        """
        Award or upgrade a SkillBadge.

        If a badge already exists for this (user, skill_name):
        - Upgrade badge_level if new level is higher.
        Else create a new badge.

        Also updates User.profile.skills and User.spectrum_id.
        """
        uid = submission.user_id
        skill_name = challenge.skill_category
        new_level = challenge.badge_level

        # Check for existing badge for this skill
        existing = await SkillBadge.find_one(
            SkillBadge.user_id == uid,
            SkillBadge.skill_name == skill_name,
            SkillBadge.is_active == True,
        )

        if existing:
            existing_order = BADGE_LEVEL_ORDER.get(existing.badge_level, 0)
            new_order = BADGE_LEVEL_ORDER.get(new_level, 0)
            if new_order > existing_order:
                existing.badge_level = new_level
                existing.challenge_id = challenge.id
                existing.submission_id = submission.id
                existing.awarded_at = now
                await existing.save()
            badge_id = str(existing.id)
        else:
            badge = SkillBadge(
                user_id=uid,
                skill_name=skill_name,
                badge_level=new_level,
                challenge_id=challenge.id,
                submission_id=submission.id,
            )
            await badge.insert()
            badge_id = str(badge.id)

        # Update User.profile.skills + SpectrumID
        user = await User.get(uid)
        if user:
            # Update skill level in profile
            if user.profile and user.profile.skills:
                for skill in user.profile.skills:
                    if skill.name.lower() == skill_name.lower():
                        skill.level = new_level
                        break
                else:
                    # Skill not in profile — add it
                    user.profile.skills.append(Skill(
                        name=skill_name,
                        level=new_level,
                    ))
            elif user.profile:
                user.profile.skills = [Skill(name=skill_name, level=new_level)]

            # Update SpectrumID
            if user.spectrum_id:
                # Add "skill_verified" check once
                if "skill_verified" not in user.spectrum_id.verification_checks_passed:
                    user.spectrum_id.verification_checks_passed.append("skill_verified")

                # Add SpectrumBadge
                already_badged = any(
                    b.badge_type == f"skill_verified_{skill_name.lower()}"
                    for b in user.spectrum_id.badges
                )
                if not already_badged:
                    user.spectrum_id.badges.append(SpectrumBadge(
                        badge_type=f"skill_verified_{skill_name.lower()}",
                        earned_at=now,
                    ))

                # Boost trust score
                user.spectrum_id.trust_score = min(
                    100.0,
                    user.spectrum_id.trust_score + TRUST_BOOST_PER_BADGE,
                )
                user.spectrum_id.last_trust_recalculation = now

            await user.save()

        return {
            "badge_id": badge_id,
            "skill_name": skill_name,
            "badge_level": new_level,
        }

    @staticmethod
    async def revoke_badge(
        badge_id: str,
        admin_user_id: str,
        reason: str,
    ) -> Dict[str, Any]:
        """Admin revokes a badge (fraud, plagiarism, etc.)."""
        badge = await SkillBadge.get(PydanticObjectId(badge_id))
        if not badge:
            raise HTTPException(status_code=404, detail="Badge not found.")

        now = datetime.utcnow()
        badge.is_active = False
        badge.revoked_at = now
        badge.revoked_reason = reason
        badge.revoked_by = PydanticObjectId(admin_user_id)
        await badge.save()

        # Remove from user SpectrumID badges
        user = await User.get(badge.user_id)
        if user and user.spectrum_id:
            user.spectrum_id.badges = [
                b for b in user.spectrum_id.badges
                if b.badge_type != f"skill_verified_{badge.skill_name.lower()}"
            ]
            # Reduce trust score
            user.spectrum_id.trust_score = max(
                0.0,
                user.spectrum_id.trust_score - TRUST_BOOST_PER_BADGE,
            )
            await user.save()

        return {
            "success": True,
            "badge_id": badge_id,
            "message": f"Badge revoked. Reason: {reason}",
        }