"""
Skill Verification Challenges — Router
=======================================

Creator endpoints  (prefix: /skill-challenges)
------------------------------------------------
GET   /skill-challenges/                           – browse active challenges
GET   /skill-challenges/{challenge_id}             – challenge detail + instructions
POST  /skill-challenges/{challenge_id}/submit      – submit work for evaluation
GET   /skill-challenges/my-submissions             – my submission history
GET   /skill-challenges/my-badges                  – my earned skill badges

Admin endpoints
----------------
POST  /skill-challenges/                           – create new challenge
PATCH /skill-challenges/{challenge_id}             – update challenge
GET   /skill-challenges/submissions/pending        – queue awaiting evaluation
PATCH /skill-challenges/submissions/{id}/evaluate  – manually evaluate submission
PATCH /skill-challenges/badges/{badge_id}/revoke   – revoke a badge
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.models.schema import User
from app.auth.auth import get_current_user, get_admin_user
from app.services.skill_challenge_service import SkillChallengeService
from app.api.schemas.skill_challenge_schemas import (
    CreateChallengeRequest,
    UpdateChallengeRequest,
    SubmitChallengeRequest,
    EvaluateSubmissionRequest,
    RevokeBadgeRequest,
    ChallengeListResponse,
    ChallengeDetailResponse,
    SubmissionListResponse,
    PendingSubmissionsResponse,
    BadgeListResponse,
    ChallengeActionResponse,
    SubmissionActionResponse,
    BadgeActionResponse,
)

router = APIRouter(prefix="/skill-challenges", tags=["Skill Verification Challenges"])


# ═══════════════════════════════════════════════════════════════════════════════
# CREATOR ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/my-submissions",
    response_model=SubmissionListResponse,
    summary="My challenge submission history",
)
async def get_my_submissions(
    challenge_id: Optional[str] = Query(None, description="Filter by specific challenge"),
    status_filter: Optional[str] = Query(
        None,
        description="pending | evaluating | passed | failed",
    ),
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all challenge submissions made by the current user.

    Filter by challenge or status to narrow results.

    **Who:** Any authenticated user (Creator)
    """
    result = await SkillChallengeService.get_my_submissions(
        user_id=str(current_user.id),
        challenge_id=challenge_id,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return SubmissionListResponse(**result)


@router.get(
    "/my-badges",
    response_model=BadgeListResponse,
    summary="My earned skill badges",
)
async def get_my_badges(
    active_only: bool = Query(True, description="Show only active (non-revoked) badges"),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all skill badges earned by the current user.

    Badges are awarded automatically after passing a challenge evaluation.

    **Who:** Any authenticated user (Creator)
    """
    result = await SkillChallengeService.get_my_badges(
        user_id=str(current_user.id),
        active_only=active_only,
    )
    return BadgeListResponse(**result)


@router.get(
    "/submissions/pending",
    response_model=PendingSubmissionsResponse,
    summary="[Admin] Queue of pending submissions",
)
async def get_pending_submissions(
    skill_category: Optional[str] = Query(None),
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: User = Depends(get_admin_user),
):
    """
    Admin view of all challenge submissions awaiting evaluation.

    Sorted oldest-first so nothing gets missed.

    **Who:** Admin only
    """
    result = await SkillChallengeService.get_pending_submissions(
        limit=limit,
        offset=offset,
        skill_category=skill_category,
    )
    return PendingSubmissionsResponse(**result)


@router.get(
    "/",
    response_model=ChallengeListResponse,
    summary="Browse active challenges",
)
async def list_challenges(
    skill_category: Optional[str] = Query(
        None,
        description="Camera | Sound | Editing | VFX | Lighting | Directing | Producing | Writing | Design | Music",
    ),
    difficulty: Optional[str] = Query(
        None,
        description="beginner | intermediate | advanced | expert",
    ),
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """
    Browse all active skill verification challenges.

    Filter by `skill_category` (matches your department/skills) or `difficulty`.

    **Who:** Any authenticated user
    """
    result = await SkillChallengeService.get_available_challenges(
        skill_category=skill_category,
        difficulty=difficulty,
        limit=limit,
        offset=offset,
    )
    return ChallengeListResponse(**result)


@router.get(
    "/{challenge_id}",
    response_model=ChallengeDetailResponse,
    summary="Get challenge detail and instructions",
)
async def get_challenge(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Full challenge detail including:
    - Instructions (what to submit)
    - Evaluation criteria and their weights
    - Pass threshold and badge level awarded

    **Who:** Any authenticated user
    """
    result = await SkillChallengeService.get_challenge_by_id(challenge_id)
    return ChallengeDetailResponse(**result)


@router.post(
    "/{challenge_id}/submit",
    summary="Submit work for a challenge",
)
async def submit_challenge(
    challenge_id: str,
    request: SubmitChallengeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Submit your work for evaluation on a skill challenge.

    **content_type options:**
    - `file_url` — upload a file and paste the URL
    - `link`     — external portfolio/drive link
    - `text`     — written response (for quiz-type challenges)

    After submission the team evaluates within 1-3 business days.
    If you pass, a skill badge is automatically added to your profile.

    **Who:** Any authenticated user (Creator)
    """
    result = await SkillChallengeService.submit_challenge(
        challenge_id=challenge_id,
        user_id=str(current_user.id),
        content_type=request.content_type,
        value=request.value,
        notes=request.notes,
    )
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/",
    response_model=ChallengeActionResponse,
    summary="[Admin] Create a new skill challenge",
)
async def create_challenge(
    request: CreateChallengeRequest,
    admin: User = Depends(get_admin_user),
):
    """
    Admin creates a new skill verification challenge.

    **Evaluation criteria weights must sum to exactly 1.0.**

    Example criteria for a Camera challenge:
    ```json
    [
      {"criterion_name": "Technical Accuracy", "weight": 0.4, "max_score": 10},
      {"criterion_name": "Creativity",         "weight": 0.3, "max_score": 10},
      {"criterion_name": "Presentation",       "weight": 0.3, "max_score": 10}
    ]
    ```

    **Who:** Admin only
    """
    result = await SkillChallengeService.create_challenge(
        admin_user_id=str(admin.id),
        title=request.title,
        description=request.description,
        skill_category=request.skill_category,
        difficulty=request.difficulty,
        challenge_type=request.challenge_type,
        instructions=request.instructions,
        evaluation_criteria=[ec.model_dump() for ec in request.evaluation_criteria],
        pass_threshold=request.pass_threshold,
        badge_level=request.badge_level,
        time_limit_minutes=request.time_limit_minutes,
    )
    return ChallengeActionResponse(**result)


@router.patch(
    "/{challenge_id}",
    response_model=ChallengeActionResponse,
    summary="[Admin] Update a challenge",
)
async def update_challenge(
    challenge_id: str,
    request: UpdateChallengeRequest,
    admin: User = Depends(get_admin_user),
):
    """
    Update challenge fields. Only provided fields are changed.
    Set `is_active: false` to deactivate a challenge without deleting it.

    **Who:** Admin only
    """
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    result = await SkillChallengeService.update_challenge(
        challenge_id=challenge_id,
        updates=updates,
    )
    return ChallengeActionResponse(**result)


@router.patch(
    "/submissions/{submission_id}/evaluate",
    response_model=SubmissionActionResponse,
    summary="[Admin] Evaluate a submission",
)
async def evaluate_submission(
    submission_id: str,
    request: EvaluateSubmissionRequest,
    admin: User = Depends(get_admin_user),
):
    """
    Manually evaluate a challenge submission.

    Provide a score for each evaluation criterion.
    The weighted overall score is calculated automatically.
    If overall_score >= pass_threshold, the creator passes and receives a badge.

    **Side effects on pass:**
    - SkillBadge created/upgraded
    - User.profile.skills updated with badge_level
    - User.spectrum_id.trust_score boosted (+5)
    - User.spectrum_id.verification_checks_passed += "skill_verified"

    **Who:** Admin only
    """
    result = await SkillChallengeService.evaluate_submission(
        submission_id=submission_id,
        admin_user_id=str(admin.id),
        criterion_scores=[cs.model_dump() for cs in request.criterion_scores],
        evaluator_notes=request.evaluator_notes,
    )
    return SubmissionActionResponse(**result)


@router.patch(
    "/badges/{badge_id}/revoke",
    response_model=BadgeActionResponse,
    summary="[Admin] Revoke a skill badge",
)
async def revoke_badge(
    badge_id: str,
    request: RevokeBadgeRequest,
    admin: User = Depends(get_admin_user),
):
    """
    Revoke a creator's skill badge (fraud, plagiarism, account violation).

    Side effects:
    - Badge.is_active = False
    - Removed from User.spectrum_id.badges
    - Trust score reduced by 5 points

    **Who:** Admin only
    """
    result = await SkillChallengeService.revoke_badge(
        badge_id=badge_id,
        admin_user_id=str(admin.id),
        reason=request.reason,
    )
    return BadgeActionResponse(**result)