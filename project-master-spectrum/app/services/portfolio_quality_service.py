"""
Portfolio Quality Score
=======================
Deterministic 0–100 score of how complete/compelling a creator's portfolio is,
plus up to 5 concrete, actionable suggestions.

Pure function over already-loaded data — no DB calls here. Callers (the
portfolio-builder router) pass in the user, their projects, and review stats
they've already fetched for their own response.

Weighting (100 pts):
  Profile completeness  25
  Portfolio/projects    40
  Experience & creds    10
  Reviews               15
  Verification          10
"""
from __future__ import annotations

from typing import List, Optional


def compute_quality_score(user, projects: list, reviews_total: int, reviews_avg: Optional[float]) -> dict:
    """Return {"score": int, "breakdown": {...}, "suggestions": [str, ...]}."""
    p = getattr(user, "profile", None)
    suggestions: List[str] = []
    breakdown = {"profile": 0, "portfolio": 0, "experience": 0, "reviews": 0, "verification": 0}

    # ── Profile completeness (25) ────────────────────────────────────────────
    if p and p.profile_picture:
        breakdown["profile"] += 5
    else:
        suggestions.append("Add a profile photo — portfolios with a face build far more trust.")
    if p and p.bio and len(p.bio.strip()) >= 80:
        breakdown["profile"] += 5
    else:
        suggestions.append("Write a bio of at least 80 characters describing what you do best.")
    if p and (p.tagline or p.headline):
        breakdown["profile"] += 5
    else:
        suggestions.append("Add a short professional title, e.g. “Motion Designer”.")
    if p and p.location and (p.location.city or p.location.country):
        breakdown["profile"] += 3
    else:
        suggestions.append("Add your location so clients know your timezone.")
    if p and p.skills and len(p.skills) >= 3:
        breakdown["profile"] += 4
    else:
        suggestions.append("List at least 3 skills clients can search for.")
    has_link = bool(p and (p.website or (p.social_links and any(
        v for v in p.social_links.model_dump().values()
    ))))
    if has_link:
        breakdown["profile"] += 3
    else:
        suggestions.append("Add a website or social link so clients can learn more about you.")

    # ── Portfolio / projects (40) ────────────────────────────────────────────
    n = len(projects)
    if n >= 1:
        breakdown["portfolio"] += 10
    else:
        suggestions.append("Add your first project to start your portfolio.")
    if n >= 3:
        breakdown["portfolio"] += 10
    elif n >= 1:
        suggestions.append(f"Add {3 - n} more project{'s' if 3 - n != 1 else ''} to strengthen your portfolio.")
    if projects:
        complete = [
            proj for proj in projects
            if getattr(proj, "description", None) and getattr(proj, "category", None) and getattr(proj, "media", None)
        ]
        breakdown["portfolio"] += round(15 * len(complete) / len(projects))
        if len(complete) < len(projects):
            suggestions.append("Give every project a description, a category, and at least one image or video.")
    if any(len(getattr(proj, "media", []) or []) >= 2 for proj in projects):
        breakdown["portfolio"] += 5
    elif projects:
        suggestions.append("Add multiple media items (images/video) to at least one project to make it a real case study.")

    # ── Experience & credibility (10) ────────────────────────────────────────
    if p and p.experience:
        breakdown["experience"] += 5
    else:
        suggestions.append("Add a work experience entry to show your track record.")
    if p and (p.education or p.certifications):
        breakdown["experience"] += 5

    # ── Reviews (15) ─────────────────────────────────────────────────────────
    if reviews_total >= 1:
        breakdown["reviews"] += 5
    else:
        suggestions.append("Complete a project on Spectrum to start collecting client reviews.")
    if reviews_total >= 5:
        breakdown["reviews"] += 5
    if reviews_avg is not None and reviews_avg >= 4.5:
        breakdown["reviews"] += 5

    # ── Verification (10) ────────────────────────────────────────────────────
    if getattr(user, "is_verified", False):
        breakdown["verification"] += 5
    else:
        suggestions.append("Verify your email to boost credibility.")
    sid = getattr(user, "spectrum_id", None)
    if sid and getattr(sid, "verification_level", None) in ("standard", "premium", "elite"):
        breakdown["verification"] += 5

    score = min(100, sum(breakdown.values()))
    return {"score": score, "breakdown": breakdown, "suggestions": suggestions[:5]}
