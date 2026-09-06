"""
Project role staffing
=====================

Owns the accounting for "how many seats of this role are filled".

The authoritative answer is always the accepted applications for a role — not
a counter. `ProjectRole.filled_count` is a cache kept in sync by recount_fills()
after every hire, rejection or withdrawal. Incrementing/decrementing counters at
each call site is what makes seat counts drift (a rejection that skips the
decrement leaves a role permanently "full"), so nothing outside this module
should write filled_count.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import HTTPException, status

from app.models.schema import Application, JobPost, ProjectRole

# Applications occupying a seat. "accepted" is the only status that consumes
# one — shortlisted/interviewing are still under consideration.
SEAT_HOLDING_STATUSES = {"accepted"}


async def _accepted_counts_by_role(job_id) -> Dict[Optional[str], int]:
    """Accepted applications per role_id for one job."""
    apps = await Application.find(
        Application.project_id == job_id,
        Application.status == "accepted",
    ).to_list()

    counts: Dict[Optional[str], int] = {}
    for app in apps:
        counts[app.role_id] = counts.get(app.role_id, 0) + 1
    return counts


async def recount_fills(job: JobPost, *, save: bool = True) -> JobPost:
    """Recompute every role's filled_count from accepted applications.

    Safe to call after any application status change. Also refreshes the
    workspace roles_required/roles_filled counters the dashboards read.
    """
    if not job.roles:
        return job

    counts = await _accepted_counts_by_role(job.id)

    for role in job.roles:
        role.filled_count = counts.get(role.role_id, 0)
        role.sync_status()

    summary = job.roles_summary()
    if job.workspace:
        job.workspace.roles_required = summary["total_seats"]
        job.workspace.roles_filled = summary["filled_seats"]

    if save:
        await job.save()
    return job


def resolve_role(job: JobPost, role_id: Optional[str]) -> Optional[ProjectRole]:
    """Resolve the role an application targets.

    Single-role projects don't need the applicant to name a role: when the job
    has exactly one role and none was given, that role is implied. Multi-role
    projects require an explicit role_id — otherwise an applicant lands in an
    unassigned bucket the client can't staff from.
    """
    if not job.roles:
        return None  # legacy job post — whole-project application

    if role_id:
        role = job.get_role(role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That role does not exist on this project.",
            )
        return role

    if len(job.roles) == 1:
        return job.roles[0]

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            "This project has multiple roles — specify which role you are "
            "applying for."
        ),
    )


def assert_open_for_applications(role: ProjectRole) -> None:
    """Block applications to a role that is closed or already staffed."""
    if role.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The {role.title} role is no longer accepting applications.",
        )
    if role.is_full:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"All {role.title} positions on this project are filled.",
        )


async def assert_seat_available(job: JobPost, role: ProjectRole, *, exclude_application_id=None) -> None:
    """Block a hire when the role has no seat left.

    Counted live rather than trusting filled_count, so two clients approving
    the last seat concurrently can't both succeed.
    """
    apps = await Application.find(
        Application.project_id == job.id,
        Application.role_id == role.role_id,
        Application.status == "accepted",
    ).to_list()

    taken = [a for a in apps if a.id != exclude_application_id]
    if len(taken) >= role.count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"All {role.count} {role.title} position(s) are already filled. "
                "Reject or withdraw an existing hire to free a seat."
            ),
        )


def derive_job_status(job: JobPost, current_status: str) -> str:
    """Project status implied by role staffing.

    A multi-role project is only 'pending_funding' once every seat is filled;
    while seats remain open it stays 'in_review' so it keeps attracting
    applicants for the roles that are still empty. Terminal states are left
    alone.
    """
    if current_status in ("completed", "cancelled", "closed", "in_progress"):
        return current_status

    if not job.roles:
        return current_status

    summary = job.roles_summary()
    if summary["fully_staffed"]:
        return "pending_funding"
    if summary["filled_seats"] > 0:
        return "in_review"
    return "open" if current_status == "in_review" else current_status


async def role_breakdown(job: JobPost) -> List[dict]:
    """Per-role staffing view: seats, fills, and applicant counts.

    Powers the client's "Director: Filled · Camera Operator: 1/2 · Editor: Open"
    header and the per-role applicant tabs.
    """
    roles = job.roles or []
    if not roles:
        return []

    apps = await Application.find(Application.project_id == job.id).to_list()

    by_role: Dict[Optional[str], List[Application]] = {}
    for app in apps:
        by_role.setdefault(app.role_id, []).append(app)

    breakdown = []
    for role in roles:
        role_apps = by_role.get(role.role_id, [])
        breakdown.append({
            "role_id": role.role_id,
            "title": role.title,
            "description": role.description,
            "skills": role.skills or [],
            "deliverables": role.deliverables or [],
            "count": role.count,
            "filled_count": role.filled_count,
            "seats_remaining": role.seats_remaining,
            "status": role.status,
            "budget_allocation": role.budget_allocation,
            "budget_per_seat": role.budget_per_seat(),
            "duration_days": role.duration_days,
            "start_date": role.start_date.isoformat() if role.start_date else None,
            "deadline": role.deadline.isoformat() if role.deadline else None,
            "applicant_count": len(role_apps),
            "pending_count": len([
                a for a in role_apps
                if a.status in ("submitted", "shortlisted", "interviewing")
            ]),
            "hired_count": len([a for a in role_apps if a.status == "accepted"]),
        })
    return breakdown


def validate_role_budgets(roles: List[ProjectRole], total_budget: Optional[float]) -> None:
    """Reject role allocations that exceed the project budget.

    Catching this at creation avoids a client hiring a full team they can't
    fund, then discovering the shortfall at the escrow step.
    """
    if total_budget is None:
        return

    allocated = sum(r.budget_allocation for r in roles if r.budget_allocation is not None)
    if allocated > total_budget:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Role budgets total {allocated:,.2f}, which exceeds the project "
                f"budget of {total_budget:,.2f}."
            ),
        )
