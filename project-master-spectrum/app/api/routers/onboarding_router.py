"""
Onboarding Router — the new user's "setup journey".

GET /onboarding/journey returns a role-adaptive list of milestones computed from
the user's real data (profile, portfolio, ETF, first project/application/escrow),
so the dashboard can show genuine progression toward first success.
"""
from fastapi import APIRouter, Depends
from typing import Any, Dict, List

from beanie import PydanticObjectId

from app.models.schema import User, JobPost, Application
from app.models.escrow import Escrow
from app.models.etf_points import EtfPoints
from app.auth.auth import get_current_user

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


def _profile_complete_creator(u: User) -> bool:
    p = u.profile
    if not p:
        return False
    has_bio = bool((p.bio or "").strip()) and len((p.bio or "").strip()) >= 20
    has_skills = bool(p.skills) and len(p.skills) >= 1
    has_photo = bool(p.profile_picture)
    return has_bio and has_skills and has_photo


def _profile_complete_client(u: User) -> bool:
    p = u.profile
    if not p:
        return False
    name = (p.display_name or p.first_name or "").strip()
    return bool(name) and bool((p.bio or "").strip())


async def _etf_activated(uid: PydanticObjectId) -> bool:
    doc = await EtfPoints.find_one(EtfPoints.user_id == uid)
    return bool(doc and (doc.lifetime_points or 0) > 0)


@router.get("/journey", summary="Setup journey milestones for the current user")
async def get_journey(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    uid = current_user.id
    is_creator = current_user.account_type in ("crew", "both")
    # A user who is both defaults to the creator journey on the creator dashboard;
    # the frontend passes role context implicitly by which dashboard renders it.

    steps: List[Dict[str, Any]] = [{
        "key": "account",
        "title": "Account created",
        "subtitle": "Welcome to Spectrum Connect.",
        "icon": "fa-circle-check",
        "done": True,
        "href": None,
        "cta": None,
    }]

    if is_creator:
        portfolio_count = len((current_user.profile.portfolio_items or []) if current_user.profile else [])
        applications = await Application.find(Application.crew_id == uid).count()
        etf_on = await _etf_activated(uid)

        steps += [
            {
                "key": "profile", "title": "Build your profile",
                "subtitle": "Add a bio, your skills and a photo so clients trust you.",
                "icon": "fa-user", "done": _profile_complete_creator(current_user),
                "href": "/creator/profile", "cta": "Complete profile",
            },
            {
                "key": "portfolio", "title": "Show your work",
                "subtitle": "Upload a few best pieces — portfolios win 5× more hires.",
                "icon": "fa-images", "done": portfolio_count >= 1,
                "href": "/creator/profile", "cta": "Add portfolio",
            },
            {
                "key": "etf", "title": "Build trust",
                "subtitle": "Your ETF score grows as you deliver great work.",
                "icon": "fa-medal", "done": etf_on,
                "href": "/creator/etf", "cta": "See ETF",
            },
            {
                "key": "first_application", "title": "Apply to your first project",
                "subtitle": "Send a proposal — your next gig is one pitch away.",
                "icon": "fa-paper-plane", "done": applications >= 1,
                "href": "/creator/find-projects", "cta": "Browse projects",
            },
        ]
    else:
        jobs = await JobPost.find(JobPost.client_id == uid).count()
        # proposals received across this client's jobs
        proposals = 0
        if jobs:
            ids = [j.id for j in await JobPost.find(JobPost.client_id == uid).to_list()]
            if ids:
                proposals = await Application.find({"project_id": {"$in": ids}}).count()
        escrows = await Escrow.find(Escrow.client_id == uid).count()

        steps += [
            {
                "key": "profile", "title": "Complete your profile",
                "subtitle": "Add your name and a short bio so creators know who they're working with.",
                "icon": "fa-user", "done": _profile_complete_client(current_user),
                "href": "/client/profile", "cta": "Complete profile",
            },
            {
                "key": "first_project", "title": "Post your first project",
                "subtitle": "Describe what you need — a clear brief attracts strong proposals.",
                "icon": "fa-plus", "done": jobs >= 1,
                "href": "/client/projects/create", "cta": "Post a project",
            },
            {
                "key": "first_proposal", "title": "Review proposals",
                "subtitle": "Verified creators apply — compare and shortlist your favourites.",
                "icon": "fa-inbox", "done": proposals >= 1,
                "href": "/client/projects", "cta": "View projects",
            },
            {
                "key": "escrow", "title": "Fund & collaborate",
                "subtitle": "Funds stay in secure escrow and release only when you approve.",
                "icon": "fa-shield-halved", "done": escrows >= 1,
                "href": "/client/payments", "cta": "See payments",
            },
        ]

    total = len(steps)
    completed = sum(1 for s in steps if s["done"])
    next_step = next((s for s in steps if not s["done"]), None)

    return {
        "role": "creator" if is_creator else "client",
        "steps": steps,
        "completed_count": completed,
        "total": total,
        "all_done": completed == total,
        "next_key": next_step["key"] if next_step else None,
    }
