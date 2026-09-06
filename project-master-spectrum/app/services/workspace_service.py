"""
Team workspace
==============

Once a client has hired several people for a project, those people need a
shared place to work: one group chat, a roster of who is on the team and in
what role, the deliverables each person owes, and a read on how far along the
project is.

The shape of the workspace differs by who is looking:

  * the client sees every member, every milestone and the money position
  * a hired creator sees the same roster and the same chat — collaboration is
    the point — but their own tasks are separated out from the team's, and they
    never see anyone else's escrow amounts

Nothing here duplicates state. The roster is derived from accepted
applications, tasks from each member's escrow milestones, and progress from
those milestones' statuses, so the workspace cannot drift from the hiring and
payment records it describes.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from app.models.escrow import Escrow
from app.models.message import Conversation
from app.models.schema import Application, JobPost, User

# Milestone states that count as the creator having finished their part. The
# money may still be moving (approved but not yet released), but the work is in.
DONE_STATUSES = {"approved", "released"}
IN_FLIGHT_STATUSES = {"delivered", "revision_requested"}


async def _team_applications(job: JobPost) -> List[Application]:
    return await Application.find(
        Application.project_id == job.id,
        Application.status == "accepted",
    ).to_list()


async def is_member(job: JobPost, user_id: str) -> bool:
    """True for the client or anyone hired onto the project.

    The workspace is not owner-only: a hired camera operator needs the roster
    and the group chat as much as the client does.
    """
    if str(job.client_id) == str(user_id):
        return True
    apps = await _team_applications(job)
    return any(str(a.crew_id) == str(user_id) for a in apps)


async def ensure_team_conversation(
    job: JobPost,
    initial_message: Optional[str] = None,
) -> Optional[Conversation]:
    """Find or create the project's single group conversation.

    One conversation per project, not one per hire: the team chat is the point.
    New hires are added to the existing conversation rather than spawning a
    second one, which is why this looks the conversation up by job rather than
    by an exact participant list.
    """
    from app.services.message_service import MessageService

    apps = await _team_applications(job)
    participants = [str(job.client_id)] + [str(a.crew_id) for a in apps]
    participants = list(dict.fromkeys(participants))  # de-dupe, keep order

    # A solo project has no team to convene.
    if len(participants) < 2:
        return None

    existing = await Conversation.find_one(Conversation.job_id == str(job.id))

    if existing:
        missing = [p for p in participants if p not in existing.participants]
        if missing:
            existing.participants = existing.participants + missing
            for p in missing:
                existing.unread_counts.setdefault(p, 0)
            if len(existing.participants) > 2:
                existing.conversation_type = "job"
            await existing.save()
        return existing

    conversation, _ = await MessageService.create_conversation(
        creator_id=str(job.client_id),
        participant_ids=participants,
        job_id=str(job.id),
        initial_message=initial_message,
    )
    return conversation


def _milestone_row(m, *, include_amount: bool) -> Dict[str, Any]:
    row = {
        "milestone_id": m.milestone_id,
        "title": m.title,
        "status": m.status,
        "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
        "released_at": m.released_at.isoformat() if m.released_at else None,
        "google_drive_link": m.google_drive_link,
        "revision_count": m.revision_count,
    }
    # A creator sees what they owe and what they are owed; they have no business
    # seeing what a teammate was paid.
    if include_amount:
        row["amount"] = m.amount
    return row


def _progress_from(milestones: List[Any]) -> Dict[str, Any]:
    """Completion measured in milestones, not guesses."""
    total = len(milestones)
    if not total:
        return {"percent": 0, "done": 0, "in_flight": 0, "total": 0}

    done = len([m for m in milestones if m.status in DONE_STATUSES])
    in_flight = len([m for m in milestones if m.status in IN_FLIGHT_STATUSES])
    return {
        "percent": round(done / total * 100),
        "done": done,
        "in_flight": in_flight,
        "total": total,
    }


async def get_workspace(job: JobPost, viewer_id: str) -> Dict[str, Any]:
    """Assemble the workspace for one viewer.

    Raises 403 for anyone who is neither the client nor a hired member.
    """
    apps = await _team_applications(job)
    is_client = str(job.client_id) == str(viewer_id)
    viewer_apps = [a for a in apps if str(a.crew_id) == str(viewer_id)]

    if not is_client and not viewer_apps:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this project's team.",
        )

    escrows = {
        str(e.creator_id): e
        for e in await Escrow.find(Escrow.job_post_id == job.id).to_list()
    }

    members: List[Dict[str, Any]] = []
    all_milestones: List[Any] = []

    for app in apps:
        creator_id = str(app.crew_id)
        creator = await User.get(app.crew_id)
        profile = creator.profile if creator else None
        escrow = escrows.get(creator_id)
        role = job.get_role(app.role_id) if app.role_id else None

        milestones = escrow.milestones if escrow else []
        all_milestones.extend(milestones)

        # Amounts are visible to the client, and to the member for their own row.
        show_money = is_client or creator_id == str(viewer_id)

        members.append({
            "creator_id": creator_id,
            "application_id": str(app.id),
            "name": (
                (profile.display_name if profile else None)
                or (creator.username if creator else "Unknown")
            ),
            "avatar": profile.profile_picture if profile else None,
            "headline": profile.headline if profile else None,
            "role_id": app.role_id,
            "role": app.role,
            "is_you": creator_id == str(viewer_id),
            "hired_at": app.accepted_at.isoformat() if app.accepted_at else None,
            "deadline_at": app.deadline_at.isoformat() if app.deadline_at else None,
            "deliverables": (role.deliverables or []) if role else [],
            "progress": _progress_from(milestones),
            "milestones": [_milestone_row(m, include_amount=show_money) for m in milestones],
            "escrow": {
                "escrow_id": str(escrow.id),
                "status": escrow.status,
                "total_amount": escrow.total_amount,
                "funded_amount": escrow.funded_amount,
                "released_amount": escrow.released_amount,
            } if (escrow and show_money) else None,
            # Each party reviews the other once the work is done; surfaced here
            # so the workspace can prompt for it without a second round trip.
            "review_given": bool(app.client_rating) if is_client else bool(app.creator_rating),
        })

    conversation = await Conversation.find_one(Conversation.job_id == str(job.id))

    # A member's own tasks, pulled out of the team view. Everyone still sees the
    # full roster — they just shouldn't have to hunt for their own work in it.
    my_tasks: List[Dict[str, Any]] = []
    if viewer_apps:
        for app in viewer_apps:
            escrow = escrows.get(str(app.crew_id))
            for m in (escrow.milestones if escrow else []):
                my_tasks.append({
                    **_milestone_row(m, include_amount=True),
                    "role": app.role,
                    "escrow_id": str(escrow.id) if escrow else None,
                })

    return {
        "job_id": str(job.id),
        "title": job.title,
        "description": job.description,
        "status": job.status,
        "currency": job.currency or "USD",
        "deadline": job.deadline.isoformat() if job.deadline else None,
        "viewer": {
            "user_id": str(viewer_id),
            "is_client": is_client,
            "role": viewer_apps[0].role if viewer_apps else None,
        },
        "roles_summary": job.roles_summary() if job.roles else None,
        "team": members,
        "team_size": len(members),
        "my_tasks": my_tasks,
        "progress": _progress_from(all_milestones),
        "conversation_id": str(conversation.id) if conversation else None,
        # Deliverables the team has actually submitted, newest first — the
        # project's shared output, gathered from every member's milestones.
        "deliveries": sorted(
            [
                {
                    "milestone_id": m.milestone_id,
                    "title": m.title,
                    "google_drive_link": m.google_drive_link,
                    "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
                    "status": m.status,
                    "creator_id": cid,
                }
                for cid, e in escrows.items()
                for m in e.milestones
                if m.google_drive_link
            ],
            key=lambda d: d["delivered_at"] or "",
            reverse=True,
        ),
    }
