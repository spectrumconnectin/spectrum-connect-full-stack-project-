"""
Skill Verification Challenges — Models
=======================================

Collections
-----------
SkillChallenge      — Admin-created challenge definitions per skill category.
ChallengeSubmission — A creator's submitted work for evaluation.
SkillBadge          — Awarded to a creator after passing a challenge.

Challenge flow
--------------
  Admin creates challenge  → SkillChallenge (is_active=True)
  Creator views challenge  → GET /skill-challenges/
  Creator submits work     → ChallengeSubmission (status=pending)
  AI/Admin evaluates       → status=passed|failed, scores recorded
  If passed                → SkillBadge awarded
                           → User.profile.skills[matched].verified = True
                           → User.spectrum_id.verification_checks_passed += "skill_verified"
                           → Trust score boosted

Badge levels
------------
  verified   – passed beginner/intermediate challenge
  advanced   – passed advanced challenge
  expert     – passed expert challenge
  master     – passed expert + peer-reviewed
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from beanie import Document, PydanticObjectId


# ── SkillChallenge sub-models ─────────────────────────────────────────────────

class EvaluationCriterion(BaseModel):
    """A single grading dimension inside a challenge."""
    criterion_name: str          # e.g. "Technical Accuracy", "Creativity"
    weight: float                # 0.0 – 1.0, all weights in a challenge must sum to 1.0
    max_score: float = 10.0      # Points for this criterion
    description: Optional[str] = None


# ── SkillChallenge Document ───────────────────────────────────────────────────

class SkillChallenge(Document):
    """
    A challenge definition created by admin.
    Creators browse these and submit work to get their skills verified.
    """

    title: str
    description: str

    # Categorisation — maps to CrewProfile departments
    skill_category: str
    # e.g. "Camera", "Sound", "Editing", "VFX", "Lighting",
    #      "Directing", "Producing", "Writing", "Design", "Music"

    difficulty: str = "intermediate"
    # beginner | intermediate | advanced | expert

    challenge_type: str = "task"
    # task   – upload a deliverable (video, image, document)
    # quiz   – answer structured questions (future)
    # project – multi-part submission (future)

    # What the creator must do
    instructions: str
    # Detailed instructions shown to creator

    # Grading
    evaluation_criteria: List[EvaluationCriterion] = Field(default_factory=list)
    pass_threshold: float = 7.0   # Minimum overall score (out of 10) to pass
    time_limit_minutes: Optional[int] = None  # None = no time limit

    # Badge level awarded on passing
    badge_level: str = "verified"
    # verified | advanced | expert | master

    # Meta
    is_active: bool = True
    created_by: Optional[PydanticObjectId] = None   # Admin user_id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Aggregated stats (updated after each submission)
    submission_count: int = 0
    pass_count: int = 0
    average_score: float = 0.0

    @property
    def pass_rate(self) -> float:
        if self.submission_count == 0:
            return 0.0
        return round(self.pass_count / self.submission_count, 4)

    class Settings:
        name = "skill_challenges"
        indexes = [
            "skill_category",
            "difficulty",
            "is_active",
            "created_at",
            [("skill_category", 1), ("difficulty", 1), ("is_active", 1)],
        ]


# ── ChallengeSubmission sub-models ────────────────────────────────────────────

class CriterionScore(BaseModel):
    """Score awarded on a single evaluation criterion."""
    criterion_name: str
    score: float             # 0 – max_score
    feedback: Optional[str] = None


class SubmittedContent(BaseModel):
    """The actual work submitted by the creator."""
    content_type: str        # "file_url" | "text" | "link"
    value: str               # URL, raw text, or external link
    notes: Optional[str] = None   # Creator's notes about the submission


# ── ChallengeSubmission Document ─────────────────────────────────────────────

class ChallengeSubmission(Document):
    """
    One submission by a creator for a specific challenge.

    A creator may attempt the same challenge multiple times after failing,
    but only one badge is awarded per skill_category per user.
    """

    challenge_id: PydanticObjectId
    user_id:      PydanticObjectId

    # What the creator submitted
    submitted_content: SubmittedContent

    # Timestamps
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    evaluated_at: Optional[datetime] = None

    # Evaluation
    evaluation_status: str = "pending"
    # pending | evaluating | passed | failed

    evaluator_type: str = "manual"
    # ai | manual | hybrid

    evaluation_scores: List[CriterionScore] = Field(default_factory=list)
    overall_score: Optional[float] = None      # Weighted average 0–10
    pass_threshold: float = 7.0
    evaluator_notes: Optional[str] = None      # Internal reviewer notes

    # Badge link (set when passed)
    badge_awarded: bool = False
    badge_id: Optional[PydanticObjectId] = None

    # Attempt tracking
    attempt_number: int = 1   # Increments on resubmission

    class Settings:
        name = "challenge_submissions"
        indexes = [
            "challenge_id",
            "user_id",
            "evaluation_status",
            "submitted_at",
            [("user_id", 1), ("challenge_id", 1)],
            [("challenge_id", 1), ("evaluation_status", 1)],
        ]


# ── SkillBadge Document ───────────────────────────────────────────────────────

class SkillBadge(Document):
    """
    A verified skill badge awarded to a creator after passing a challenge.

    One badge per (user_id, skill_name) — re-passing a higher challenge
    upgrades the badge_level in place rather than creating a new document.
    """

    user_id:       PydanticObjectId
    skill_name:    str           # Matches skill_category of the challenge
    badge_level:   str           # verified | advanced | expert | master

    # Source
    challenge_id:  PydanticObjectId
    submission_id: PydanticObjectId

    # Validity
    awarded_at:  datetime = Field(default_factory=datetime.utcnow)
    expires_at:  Optional[datetime] = None   # None = permanent
    is_active:   bool = True

    # Revocation
    revoked_at:     Optional[datetime] = None
    revoked_reason: Optional[str] = None
    revoked_by:     Optional[PydanticObjectId] = None

    class Settings:
        name = "skill_badges"
        indexes = [
            "user_id",
            "skill_name",
            "badge_level",
            "is_active",
            [("user_id", 1), ("skill_name", 1)],   # unique badge per user+skill
            [("user_id", 1), ("is_active", 1)],
        ]