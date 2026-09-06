"""
Project-level escrow allocation
===============================

A multi-role project is funded as a whole ("the budget is $1,000") but paid out
per person: the director, each camera operator and the editor each hold their
own escrow, deliver on their own schedule, and are approved and paid
independently. One person's revision request must never hold up someone else's
payout.

The per-creator Escrow document already supports that — it keys on
(job_post_id, creator_id), so several can coexist for one project. What was
missing is the step that turns "the project budget, split across roles" into
those individual escrows. That is what this module does:

    project budget
      └─ role.budget_allocation        (set by the client at project creation)
           └─ role.budget_per_seat     (that role's budget ÷ its seats)
                └─ one Escrow per hired creator
                     └─ milestones, from the role's deliverables

Money is not moved here. Allocation creates the escrows; funding each milestone
still goes through the existing Stripe path, and release still goes through
EscrowService.release_milestone.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from app.models.escrow import Escrow
from app.models.schema import Application, JobPost, User


def _split_amount(total: float, parts: int) -> List[float]:
    """Split an amount into `parts`, to the cent, summing exactly to the total.

    Naive rounding loses or invents cents (100/3 → 33.33 × 3 = 99.99), so the
    final part absorbs the remainder.
    """
    if parts <= 0:
        return []
    if parts == 1:
        return [round(total, 2)]

    each = round(total / parts, 2)
    amounts = [each] * (parts - 1)
    amounts.append(round(total - each * (parts - 1), 2))
    return amounts


def _milestones_for(role, amount: float) -> List[Dict[str, Any]]:
    """Turn a role's deliverables into milestones covering its allocation.

    Each deliverable becomes a separately deliverable, separately payable
    milestone. A role with no listed deliverables gets a single milestone for
    the whole amount.
    """
    deliverables = [d for d in (role.deliverables or []) if d and d.strip()] if role else []

    if not deliverables:
        title = f"{role.title} — full delivery" if role else "Full delivery"
        return [{"title": title, "amount": round(amount, 2)}]

    return [
        {"title": d.strip(), "amount": part}
        for d, part in zip(deliverables, _split_amount(amount, len(deliverables)))
    ]


async def _hired_members(job: JobPost) -> List[Application]:
    return await Application.find(
        Application.project_id == job.id,
        Application.status == "accepted",
    ).to_list()


async def _existing_escrows(job: JobPost) -> Dict[str, Escrow]:
    """Escrows already created for this project, keyed by creator id."""
    escrows = await Escrow.find(Escrow.job_post_id == job.id).to_list()
    return {str(e.creator_id): e for e in escrows}


async def build_allocation_plan(
    job: JobPost,
    overrides: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """Work out what each hired creator would be allocated, without writing.

    The client sees this before committing, because allocation decides who gets
    paid what. Amount precedence, highest first:

      1. an explicit override for this creator
      2. their role's budget ÷ that role's seats
      3. the budget they proposed when applying

    A member with none of those is returned with `needs_amount`, rather than
    being silently allocated nothing.
    """
    overrides = overrides or {}
    members = await _hired_members(job)
    existing = await _existing_escrows(job)

    entries: List[Dict[str, Any]] = []
    for app in members:
        creator_id = str(app.crew_id)
        role = job.get_role(app.role_id) if app.role_id else None

        override = overrides.get(creator_id)
        per_seat = role.budget_per_seat() if role else None
        amount = override if override is not None else (per_seat or app.proposed_budget)

        creator = await User.get(app.crew_id)
        prior = existing.get(creator_id)

        entries.append({
            "application_id": str(app.id),
            "creator_id": creator_id,
            "creator_name": (
                (creator.profile.display_name if creator and creator.profile else None)
                or (creator.username if creator else "Unknown")
            ),
            "role_id": app.role_id,
            "role": app.role,
            "amount": round(amount, 2) if amount else None,
            "amount_source": (
                "override" if override is not None
                else "role_budget" if per_seat
                else "proposed_budget" if app.proposed_budget
                else None
            ),
            "milestones": _milestones_for(role, amount) if amount else [],
            "needs_amount": not amount,
            # Already allocated members are reported but never re-created —
            # a second escrow for the same person would double-charge the client.
            "already_allocated": prior is not None,
            "escrow_id": str(prior.id) if prior else None,
        })

    to_allocate = [e for e in entries if not e["already_allocated"] and not e["needs_amount"]]
    planned_total = round(sum(e["amount"] for e in to_allocate), 2)
    committed_total = round(
        sum(existing[e["creator_id"]].total_amount for e in entries if e["already_allocated"]),
        2,
    )

    budget = job.budget.max if job.budget else None

    return {
        "job_id": str(job.id),
        "title": job.title,
        "currency": job.currency or "USD",
        "project_budget": budget,
        "planned_total": planned_total,
        "already_committed": committed_total,
        "grand_total": round(planned_total + committed_total, 2),
        "over_budget": (
            budget is not None and round(planned_total + committed_total, 2) > budget
        ),
        "members": entries,
        "allocatable_count": len(to_allocate),
        "needs_amount_count": len([e for e in entries if e["needs_amount"]]),
    }


async def allocate_project_escrows(
    job: JobPost,
    client_id: str,
    overrides: Optional[Dict[str, float]] = None,
    allow_over_budget: bool = False,
) -> Dict[str, Any]:
    """Create one escrow per hired creator who does not already have one.

    Safe to call repeatedly: members who already hold an escrow for this project
    are skipped rather than given a second one.
    """
    from app.services.escrow_service import EscrowService

    plan = await build_allocation_plan(job, overrides)

    if plan["over_budget"] and not allow_over_budget:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Allocations total {plan['grand_total']:,.2f}, which exceeds the "
                f"{plan['project_budget']:,.2f} project budget."
            ),
        )

    created: List[Dict[str, Any]] = []
    for entry in plan["members"]:
        if entry["already_allocated"] or entry["needs_amount"]:
            continue

        result = await EscrowService.create_escrow(
            client_id=client_id,
            creator_id=entry["creator_id"],
            milestones=entry["milestones"],
            job_post_id=str(job.id),
            currency=plan["currency"],
            description=(
                f"{entry['role']} on {job.title}" if entry["role"] else job.title
            ),
        )
        created.append({
            "creator_id": entry["creator_id"],
            "creator_name": entry["creator_name"],
            "role": entry["role"],
            "escrow_id": result["escrow_id"],
            "total_amount": result["total_amount"],
            "milestone_count": result["milestone_count"],
        })

    return {
        "success": True,
        "job_id": str(job.id),
        "created": created,
        "created_count": len(created),
        "skipped_existing": len([e for e in plan["members"] if e["already_allocated"]]),
        "skipped_no_amount": plan["needs_amount_count"],
        "message": (
            f"Created {len(created)} escrow allocation(s)."
            if created else "Nothing to allocate — every hired member already has an escrow."
        ),
    }


async def project_escrow_overview(job: JobPost) -> Dict[str, Any]:
    """Funding and payout state for the whole project, member by member.

    Each member's escrow advances on its own: the editor can be delivered,
    approved and paid while the camera operator is still shooting.
    """
    members = await _hired_members(job)
    escrows = await _existing_escrows(job)

    rows: List[Dict[str, Any]] = []
    totals = {"allocated": 0.0, "funded": 0.0, "released": 0.0, "refunded": 0.0}

    for app in members:
        creator_id = str(app.crew_id)
        escrow = escrows.get(creator_id)
        creator = await User.get(app.crew_id)
        role = job.get_role(app.role_id) if app.role_id else None

        if escrow:
            totals["allocated"] += escrow.total_amount or 0
            totals["funded"] += escrow.funded_amount or 0
            totals["released"] += escrow.released_amount or 0
            totals["refunded"] += escrow.refunded_amount or 0

        rows.append({
            "creator_id": creator_id,
            "creator_name": (
                (creator.profile.display_name if creator and creator.profile else None)
                or (creator.username if creator else "Unknown")
            ),
            "creator_avatar": (
                creator.profile.profile_picture if creator and creator.profile else None
            ),
            "role_id": app.role_id,
            "role": app.role,
            "role_budget_per_seat": role.budget_per_seat() if role else None,
            "escrow": {
                "escrow_id": str(escrow.id),
                "status": escrow.status,
                "total_amount": escrow.total_amount,
                "funded_amount": escrow.funded_amount,
                "released_amount": escrow.released_amount,
                "milestones": [
                    {
                        "milestone_id": m.milestone_id,
                        "title": m.title,
                        "amount": m.amount,
                        "status": m.status,
                        "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
                        "released_at": m.released_at.isoformat() if m.released_at else None,
                    }
                    for m in escrow.milestones
                ],
            } if escrow else None,
        })

    budget = job.budget.max if job.budget else None
    allocated = round(totals["allocated"], 2)

    return {
        "job_id": str(job.id),
        "title": job.title,
        "currency": job.currency or "USD",
        "project_budget": budget,
        "team_size": len(members),
        "allocated_total": allocated,
        "funded_total": round(totals["funded"], 2),
        "released_total": round(totals["released"], 2),
        "refunded_total": round(totals["refunded"], 2),
        "unallocated": round(budget - allocated, 2) if budget is not None else None,
        "awaiting_allocation": len([r for r in rows if r["escrow"] is None]),
        "members": rows,
    }
