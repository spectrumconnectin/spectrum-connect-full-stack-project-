"""
Spectrum Guarantee — Escrow & Dispute Router
============================================

Escrow endpoints  (prefix: /escrow)
-------------------------------------
POST  /escrow/                              – client creates escrow
GET   /escrow/my-escrows                    – list my escrows
GET   /escrow/{escrow_id}                   – get escrow detail
POST  /escrow/{escrow_id}/fund-milestone    – client funds a milestone
POST  /escrow/{escrow_id}/release-milestone – client releases funds to creator
POST  /escrow/{escrow_id}/refund            – client requests full refund

Dispute endpoints (prefix: /disputes)
---------------------------------------
POST  /disputes/                            – raise a dispute
GET   /disputes/my-disputes                 – list my disputes
GET   /disputes/all            [Admin]      – list all disputes
GET   /disputes/{dispute_id}               – get dispute detail
POST  /disputes/{dispute_id}/evidence      – submit evidence
PATCH /disputes/{dispute_id}/assign  [Admin] – admin self-assigns
PATCH /disputes/{dispute_id}/resolve [Admin] – admin resolves
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from pydantic import BaseModel, Field

from app.models.schema import User
from app.auth.auth import get_current_user, get_admin_user
from app.services.escrow_service import EscrowService
from app.services.dispute_service import DisputeService
from app.api.schemas.escrow_schemas import (
    # Escrow
    CreateEscrowRequest,
    FundMilestoneRequest,
    ReleaseMilestoneRequest,
    RefundEscrowRequest,
    EscrowDetailResponse,
    EscrowListResponse,
    EscrowActionResponse,
    # Dispute
    CreateDisputeRequest,
    SubmitEvidenceRequest,
    ResolveDisputeRequest,
    DisputeDetailResponse,
    DisputeListResponse,
    DisputeActionResponse,
    AdminDisputeListResponse,
)

escrow_router  = APIRouter(prefix="/escrow",   tags=["Spectrum Guarantee — Escrow"],   redirect_slashes=False)
dispute_router = APIRouter(prefix="/disputes", tags=["Spectrum Guarantee — Disputes"], redirect_slashes=False)


# ═══════════════════════════════════════════════════════════════════════════════
# ESCROW ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@escrow_router.post("", summary="Create escrow for a project")
async def create_escrow(
    request: CreateEscrowRequest,
    current_user: User = Depends(get_current_user),
):
    """
    **Client creates an escrow** for a project with one or more milestones.

    - Each milestone has a title and amount.
    - Funds are NOT taken yet — client funds each milestone separately via `/fund-milestone`.
    - Only the client (producer) should call this endpoint.

    **Who:** Producer / Client
    """
    result = await EscrowService.create_escrow(
        client_id=str(current_user.id),
        creator_id=request.creator_id,
        milestones=[m.model_dump() for m in request.milestones],
        project_id=request.project_id,
        job_post_id=request.job_post_id,
        description=request.description,
        currency=request.currency,
    )
    return result


@escrow_router.get(
    "/my-escrows",
    response_model=EscrowListResponse,
    summary="List my escrows",
)
async def get_my_escrows(
    role: str = Query(
        "both",
        description="Filter by role: client | creator | both",
    ),
    status_filter: Optional[str] = Query(
        None,
        description="active | completed | disputed | refunded | cancelled",
    ),
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0,  ge=0),
    current_user: User = Depends(get_current_user),
):
    """
    List all escrows where you are the **client** or **creator** (or both).

    **Who:** Client OR Creator
    """
    result = await EscrowService.get_my_escrows(
        user_id=str(current_user.id),
        role=role,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return EscrowListResponse(**result)


@escrow_router.get(
    "/{escrow_id}",
    response_model=EscrowDetailResponse,
    summary="Get escrow detail",
)
async def get_escrow(
    escrow_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get full escrow detail including all milestones and their statuses.

    **Who:** Client OR Creator (both parties)
    """
    result = await EscrowService.get_escrow_by_id(
        escrow_id=escrow_id,
        requesting_user_id=str(current_user.id),
    )
    return EscrowDetailResponse(**result)


@escrow_router.post(
    "/{escrow_id}/fund-milestone",
    summary="Fund a milestone",
)
async def fund_milestone(
    escrow_id: str,
    request: FundMilestoneRequest,
    current_user: User = Depends(get_current_user),
):
    """
    **Client deposits funds** for a specific milestone.

    In production this triggers a Stripe PaymentIntent capture.
    The milestone moves from `pending` → `funded`.
    Creator can see the milestone is funded and begin work.

    **Who:** Client only
    """
    result = await EscrowService.fund_milestone(
        escrow_id=escrow_id,
        milestone_id=request.milestone_id,
        client_id=str(current_user.id),
    )
    # Notify creator + advance job to in_progress on first funding
    try:
        from app.services.notification_service import NotificationService
        from app.models.escrow import Escrow as EscrowDoc
        from app.models.schema import JobPost
        from beanie import PydanticObjectId as _OID

        esc = await EscrowDoc.get(_OID(escrow_id))
        if esc:
            milestone = next((m for m in esc.milestones if m.milestone_id == request.milestone_id), None)
            m_title  = milestone.title  if milestone else "Milestone"
            m_amount = float(milestone.amount) if milestone else 0.0
            await NotificationService.milestone_funded(
                creator_id=str(esc.creator_id),
                client_id=str(current_user.id),
                milestone_title=m_title,
                amount=m_amount,
                escrow_id=escrow_id,
            )
            # Advance the linked job from pending_funding → in_progress
            if esc.job_post_id:
                job = await JobPost.get(esc.job_post_id)
                if job and job.status in ("pending_funding", "open", "in_review"):
                    job.status = "in_progress"
                    await job.save()
    except Exception:
        pass
    return result


@escrow_router.post(
    "/{escrow_id}/release-milestone",
    summary="Release milestone funds to creator",
)
async def release_milestone(
    escrow_id: str,
    request: ReleaseMilestoneRequest,
    current_user: User = Depends(get_current_user),
):
    """
    **Client approves completed work** and releases milestone funds to the creator.

    - Milestone moves from `funded` → `released`.
    - An immutable `Transaction` record is created.
    - If all milestones are terminal, escrow status → `completed`.

    **Who:** Client only
    """
    result = await EscrowService.release_milestone(
        escrow_id=escrow_id,
        milestone_id=request.milestone_id,
        client_id=str(current_user.id),
    )
    # Notify creator of released payment + confirm to client + update job status
    try:
        from app.services.notification_service import NotificationService
        from app.services.etf_points_service import EtfPointsService
        from app.models.escrow import Escrow as EscrowDoc
        from app.models.schema import JobPost
        from beanie import PydanticObjectId as OID
        from datetime import datetime, timezone

        esc = await EscrowDoc.get(OID(escrow_id))
        if esc:
            milestone = next((m for m in esc.milestones if m.milestone_id == request.milestone_id), None)
            m_title = milestone.title if milestone else "Milestone"
            m_amount = float(milestone.amount) if milestone else 0.0

            await NotificationService.milestone_released(
                creator_id=str(esc.creator_id),
                client_id=str(current_user.id),
                milestone_title=m_title,
                amount=m_amount,
            )
            await NotificationService.payment_released_client(
                client_id=str(current_user.id),
                creator_id=str(esc.creator_id),
                milestone_title=m_title,
                amount=m_amount,
            )

            # Update job to 'completed' + stamp completed_at once ALL escrows for the
            # same job_post_id are completed/refunded (handles multi-creator crew projects).
            if esc.status == "completed" and esc.job_post_id:
                from datetime import datetime as _dt
                from app.models.escrow import Escrow as _EscrowModel
                # Stamp completed_at on this escrow
                esc.completed_at = _dt.utcnow()
                await esc.save()

                # For crew projects there may be multiple escrows for the same job.
                # Only mark the job complete when ALL of them are in a terminal state.
                sibling_escrows = await _EscrowModel.find(
                    _EscrowModel.job_post_id == esc.job_post_id
                ).to_list()
                all_terminal = all(
                    e.status in ("completed", "refunded", "cancelled")
                    for e in sibling_escrows
                )

                job = await JobPost.get(esc.job_post_id)
                if job and all_terminal:
                    job.status = "completed"
                    if hasattr(job, "closed_at"):
                        job.closed_at = _dt.utcnow()
                    await job.save()
                elif job and job.status not in ("completed", "cancelled"):
                    # At least one other escrow still active — keep job in progress
                    pass

                # Update creator stats: increment projects_completed + total_earnings
                try:
                    creator = await User.get(esc.creator_id)
                    if creator:
                        if not creator.stats:
                            from app.models.schema import UserStats
                            creator.stats = UserStats()
                        creator.stats.projects_completed = (creator.stats.projects_completed or 0) + 1
                        creator.stats.total_earnings = (creator.stats.total_earnings or 0.0) + float(esc.released_amount or 0)
                        await creator.save()
                except Exception:
                    pass

                # Send project_completed notification to both parties
                try:
                    from app.services.notification_service import NotificationService
                    await NotificationService.project_completed(
                        creator_id=str(esc.creator_id),
                        client_id=str(esc.client_id),
                        job_title=job.title if job else "Your project",
                        job_id=str(esc.job_post_id),
                    )
                except Exception:
                    pass

            # Post a payment confirmation message to project conversation
            try:
                from app.models.message import Conversation
                from app.services.message_service import MessageService
                convo = await Conversation.find_one({"job_id": str(esc.job_post_id)}) if esc.job_post_id else None
                if convo:
                    # Commission details for the payout message
                    from app.services.commission_service import calc_commission
                    fees = calc_commission(m_amount, currency=esc.currency)
                    creator_payout = fees.creator_payout
                    platform_fee   = fees.platform_take

                    chat_msg = (
                        f"💰 **Payment Released: {m_title}**\n\n"
                        f"Amount: ${m_amount:,.2f}\n"
                        f"Platform fee: ${platform_fee:,.2f}\n"
                        f"Creator earnings: ${creator_payout:,.2f}\n\n"
                        f"Thank you for working together on Spectrum Connect!"
                    )
                    await MessageService.send_message(
                        conversation_id=str(convo.id),
                        sender_id=str(current_user.id),
                        content=chat_msg,
                    )
            except Exception:
                pass

            # ── ETF: On-Time Delivery ─────────────────────────────────────────
            # Award bonus points if delivery happened before the milestone due date.
            # "delivered" status was set when creator submitted; check release is prompt.
            if milestone and milestone.released_at:
                # Check if there's a linked deadline/due_date we can compare against
                if milestone.deadline_id:
                    from app.models.project import ProjectDeadline
                    try:
                        dl = await ProjectDeadline.get(OID(milestone.deadline_id))
                        if dl and dl.due_date:
                            due = dl.due_date if dl.due_date.tzinfo else dl.due_date.replace(tzinfo=timezone.utc)
                            released = milestone.released_at if milestone.released_at.tzinfo else milestone.released_at.replace(tzinfo=timezone.utc)
                            if released <= due:
                                await EtfPointsService.award_points(
                                    user_id=esc.creator_id,
                                    action="on_time_delivery",
                                    source_type="escrow_milestone",
                                    source_id=f"{escrow_id}:{request.milestone_id}",
                                    counterparty_id=esc.client_id,
                                    description=f"On-time delivery: {m_title}",
                                )
                    except Exception:
                        pass

            # ── ETF: Repeat Client Bonus ──────────────────────────────────────
            # Award bonus if this client has funded a previous escrow with this creator.
            try:
                from app.models.escrow import Escrow as EscrowModel
                prior_count = await EscrowModel.find(
                    EscrowModel.client_id == esc.client_id,
                    EscrowModel.creator_id == esc.creator_id,
                    EscrowModel.status == "completed",
                ).count()
                if prior_count >= 1:  # At least one completed project before this one
                    await EtfPointsService.award_points(
                        user_id=esc.creator_id,
                        action="repeat_client.bonus",
                        source_type="escrow",
                        source_id=escrow_id,
                        counterparty_id=esc.client_id,
                        description="Repeat client bonus",
                    )
                    await EtfPointsService.award_points(
                        user_id=esc.client_id,
                        action="repeat_client.bonus",
                        source_type="escrow",
                        source_id=f"{escrow_id}:client",
                        counterparty_id=esc.creator_id,
                        description="Repeat creator engagement",
                    )
            except Exception:
                pass

    except Exception:
        pass
    return result


@escrow_router.post(
    "/{escrow_id}/refund",
    summary="Request full escrow refund",
)
async def refund_escrow(
    escrow_id: str,
    request: RefundEscrowRequest,
    current_user: User = Depends(get_current_user),
):
    """
    **Client requests a full refund** — returns all funded-but-unreleased milestone funds.

    Use this for project cancellations before work begins.
    If work is in progress, raise a **dispute** instead.

    **Who:** Client only
    """
    result = await EscrowService.refund_escrow(
        escrow_id=escrow_id,
        requesting_user_id=str(current_user.id),
        reason=request.reason,
    )
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# DISPUTE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@dispute_router.post("", summary="Raise a dispute")
async def create_dispute(
    request: CreateDisputeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    **Raise a dispute** on an escrow when there is a disagreement.

    Either the client (payment not satisfying) or creator (work done but not released)
    can raise a dispute. Our team reviews within 2-3 business days.

    **Who:** Client OR Creator (both parties to the escrow)
    """
    result = await DisputeService.create_dispute(
        escrow_id=request.escrow_id,
        raised_by_id=str(current_user.id),
        reason=request.reason,
        details=request.details,
        milestone_id=request.milestone_id,
    )
    # Notify the other party
    try:
        from app.services.notification_service import NotificationService
        from app.models.escrow import Escrow as _EscrowModel
        from beanie import PydanticObjectId as _OID
        esc = await _EscrowModel.get(_OID(request.escrow_id))
        if esc:
            other_id = str(esc.creator_id) if str(esc.client_id) == str(current_user.id) else str(esc.client_id)
            await NotificationService.dispute_opened(
                other_user_id=other_id,
                opener_id=str(current_user.id),
                reason=request.reason or "No reason provided",
                escrow_id=request.escrow_id,
            )
    except Exception:
        pass
    return result


@dispute_router.get(
    "/my-disputes",
    response_model=DisputeListResponse,
    summary="List my disputes",
)
async def get_my_disputes(
    status_filter: Optional[str] = Query(
        None,
        description="open | under_review | resolved_creator_favor | resolved_client_favor | escalated",
    ),
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """
    List all disputes you are a party to (raised by you or against you).

    **Who:** Client OR Creator
    """
    result = await DisputeService.get_my_disputes(
        user_id=str(current_user.id),
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return DisputeListResponse(**result)


@dispute_router.get(
    "/all",
    response_model=AdminDisputeListResponse,
    summary="[Admin] List all disputes",
)
async def get_all_disputes(
    status_filter: Optional[str] = Query(None),
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: User = Depends(get_admin_user),
):
    """
    Admin view of all disputes across the platform with optional status filter.

    **Who:** Admin only
    """
    result = await DisputeService.get_all_disputes(
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return AdminDisputeListResponse(**result)


@dispute_router.get(
    "/{dispute_id}",
    response_model=DisputeDetailResponse,
    summary="Get dispute detail",
)
async def get_dispute(
    dispute_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get full dispute detail including evidence and resolution.

    **Who:** Client OR Creator (parties) + Admin
    """
    is_admin = current_user.user_role in {"admin", "moderator"}
    result = await DisputeService.get_dispute_by_id(
        dispute_id=dispute_id,
        requesting_user_id=str(current_user.id),
        is_admin=is_admin,
    )
    return DisputeDetailResponse(**result)


@dispute_router.post(
    "/{dispute_id}/evidence",
    summary="Submit evidence for a dispute",
)
async def submit_evidence(
    dispute_id: str,
    request: SubmitEvidenceRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Submit supporting evidence for an open dispute.

    Upload your files/screenshots first, then submit the URL here.
    Both parties can submit multiple pieces of evidence.

    **Evidence types:** `screenshot` | `document` | `video` | `message_log` | `other`

    **Who:** Client OR Creator (both parties)
    """
    result = await DisputeService.submit_evidence(
        dispute_id=dispute_id,
        submitted_by_id=str(current_user.id),
        evidence_type=request.evidence_type,
        url=request.url,
        description=request.description,
    )
    return result


@dispute_router.patch(
    "/{dispute_id}/assign",
    response_model=DisputeActionResponse,
    summary="[Admin] Self-assign a dispute",
)
async def assign_dispute(
    dispute_id: str,
    admin: User = Depends(get_admin_user),
):
    """
    Admin self-assigns an open dispute for review.
    Sets status from `open` → `under_review`.

    **Who:** Admin only
    """
    result = await DisputeService.assign_reviewer(
        dispute_id=dispute_id,
        admin_user_id=str(admin.id),
    )
    return DisputeActionResponse(**result)


@dispute_router.patch(
    "/{dispute_id}/resolve",
    summary="[Admin] Resolve a dispute",
)
async def resolve_dispute(
    dispute_id: str,
    request: ResolveDisputeRequest,
    admin: User = Depends(get_admin_user),
):
    """
    Admin resolves a dispute and moves escrow funds accordingly.

    **Resolution types:**

    | Type | Effect |
    |---|---|
    | `full_refund` | All disputed funds returned to client |
    | `release_to_creator` | All disputed funds released to creator |
    | `partial_refund` | `resolution_amount` to client, rest to creator |
    | `split` | Custom split — `resolution_amount` to client, rest to creator |

    **Who:** Admin only
    """
    result = await DisputeService.resolve_dispute(
        dispute_id=dispute_id,
        admin_user_id=str(admin.id),
        resolution_type=request.resolution_type,
        resolution_notes=request.resolution_notes,
        resolution_amount=request.resolution_amount,
    )
    # Notify both parties of the resolution
    try:
        from app.services.notification_service import NotificationService
        from app.models.escrow import Dispute as _DisputeModel, Escrow as _EscrowResModel
        from beanie import PydanticObjectId as _OIDRes
        dispute = await _DisputeModel.get(_OIDRes(dispute_id))
        if dispute:
            escrow = await _EscrowResModel.get(dispute.escrow_id)
            outcome = request.resolution_type.replace("_", " ").title()
            if escrow:
                for uid in [str(escrow.client_id), str(escrow.creator_id)]:
                    await NotificationService.dispute_resolved(
                        user_id=uid,
                        outcome=outcome,
                        escrow_id=str(escrow.id),
                    )
    except Exception:
        pass
    return result

# ── Milestone delivery status endpoints ─────────────────────────────────────

class DeliverMilestoneRequest(BaseModel):
    google_drive_link: str = Field(..., description="Google Drive link to deliverables (required)")
    delivery_notes: Optional[str] = Field(None, description="Optional notes to the client")


def _validate_google_drive_link(link: str) -> bool:
    """Return True if the link looks like a valid Google Drive / Google Docs URL."""
    import re
    patterns = [
        r"^https://drive\.google\.com/",
        r"^https://docs\.google\.com/",
        r"^https://sheets\.google\.com/",
        r"^https://slides\.google\.com/",
    ]
    return any(re.match(p, link.strip()) for p in patterns)


@escrow_router.post(
    "/{escrow_id}/milestone/{milestone_id}/deliver",
    summary="Creator marks milestone as delivered",
)
async def deliver_milestone(
    escrow_id: str,
    milestone_id: str,
    body: DeliverMilestoneRequest,
    current_user: User = Depends(get_current_user),
):
    """Creator marks a funded milestone as delivered.
    A valid Google Drive link is **required** — submission is blocked without it.
    """
    from app.models.escrow import Escrow as EscrowDoc
    from beanie import PydanticObjectId
    from datetime import datetime

    # Validate Google Drive link before touching the DB
    if not body.google_drive_link or not body.google_drive_link.strip():
        raise HTTPException(
            status_code=400,
            detail="A Google Drive link is required to submit delivery. Please upload your work to Google Drive and share the link."
        )
    if not _validate_google_drive_link(body.google_drive_link):
        raise HTTPException(
            status_code=400,
            detail="Invalid Google Drive link. The link must start with https://drive.google.com/ or https://docs.google.com/"
        )

    esc = await EscrowDoc.get(PydanticObjectId(escrow_id))
    if not esc:
        raise HTTPException(status_code=404, detail="Escrow not found")
    if str(esc.creator_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the creator can mark delivery")
    milestone = next((m for m in esc.milestones if m.milestone_id == milestone_id), None)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    if milestone.status not in ("funded", "revision_requested"):
        raise HTTPException(status_code=400, detail=f"Cannot deliver a milestone with status '{milestone.status}'")

    now = datetime.utcnow()

    # Preserve previous delivery in history before overwriting (resubmission case)
    if milestone.google_drive_link:
        history = list(milestone.delivery_history or [])
        history.append({
            "version": len(history) + 1,
            "google_drive_link": milestone.google_drive_link,
            "delivery_notes": milestone.delivery_notes,
            "submitted_at": milestone.delivered_at.isoformat() if milestone.delivered_at else None,
        })
        milestone.delivery_history = history

    milestone.status = "delivered"
    milestone.google_drive_link = body.google_drive_link.strip()
    milestone.delivery_notes = body.delivery_notes
    milestone.delivered_at = now
    # 48-hour auto-release window starts now
    from datetime import timedelta
    milestone.auto_release_at = now + timedelta(hours=48)
    milestone.auto_released = False
    # Reset review-gating fields on each new delivery — client must re-open and re-confirm
    milestone.drive_link_opened_at = None
    milestone.client_reviewed_at = None
    await esc.save()

    # Check if ALL milestones are now delivered/approved/released → job status = "delivered"
    all_active_statuses = {m.status for m in esc.milestones}
    all_submitted = all_active_statuses.issubset({"delivered", "approved", "released", "refunded"})
    if all_submitted and esc.job_post_id:
        try:
            from app.models.schema import JobPost
            job = await JobPost.get(esc.job_post_id)
            if job and job.status == "in_progress":
                job.status = "delivered"
                await job.save()
        except Exception:
            pass

    # Notify client with 48-hour auto-release warning
    try:
        from app.services.notification_service import NotificationService
        await NotificationService.send(
            user_id=str(esc.client_id),
            type="escrow",
            category="action_required",
            title="🎉 Delivery received — review within 48 hours",
            message=(
                f"The creator has submitted work on '{milestone.title}'. "
                f"Review the Google Drive link and release payment or request a revision. "
                f"If no action is taken within 48 hours, payment will be automatically released."
            ),
            actor_id=str(current_user.id),
        )
        # Notify creator that delivery was received
        await NotificationService.send(
            user_id=str(esc.creator_id),
            type="escrow",
            category="info",
            title="Delivery received by client",
            message=f"Your delivery for '{milestone.title}' has been received. The client has 48 hours to review.",
            actor_id=str(esc.client_id),
        )
    except Exception:
        pass

    return {
        "success": True,
        "milestone_id": milestone_id,
        "status": "delivered",
        "auto_release_at": milestone.auto_release_at.isoformat() if milestone.auto_release_at else None,
    }


@escrow_router.post(
    "/{escrow_id}/milestone/{milestone_id}/approve",
    summary="Client approves delivered milestone (before releasing funds)",
)
async def approve_milestone(
    escrow_id: str,
    milestone_id: str,
    current_user: User = Depends(get_current_user),
):
    """Client marks work as approved — milestone moves to 'approved' and escrow
    becomes eligible for release.  Funds stay locked until client explicitly
    calls release-milestone."""
    from app.models.escrow import Escrow as EscrowDoc
    from beanie import PydanticObjectId
    esc = await EscrowDoc.get(PydanticObjectId(escrow_id))
    if not esc:
        raise HTTPException(status_code=404, detail="Escrow not found")
    if str(esc.client_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the client can approve milestones")
    milestone = next((m for m in esc.milestones if m.milestone_id == milestone_id), None)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    if milestone.status not in ("delivered",):
        raise HTTPException(status_code=400, detail=f"Only delivered milestones can be approved (current: '{milestone.status}')")

    # ── Review-gate: client must have opened the Drive link AND confirmed review ─
    if not milestone.drive_link_opened_at:
        raise HTTPException(
            status_code=400,
            detail=(
                "You must open and review the Google Drive delivery link before approving. "
                "Click 'Open Drive Link' on the delivery page first."
            ),
        )
    if not milestone.client_reviewed_at:
        raise HTTPException(
            status_code=400,
            detail=(
                "You must confirm that you have reviewed the delivered work before approving. "
                "Check the review confirmation box on the delivery page."
            ),
        )

    milestone.status = "approved"
    await esc.save()

    # Set job status to "approved" only when ALL escrows for the same job are done.
    # Crew projects have one escrow per creator — don't prematurely approve the job.
    try:
        from app.models.schema import JobPost
        from app.models.escrow import Escrow as _EscrowModel
        if esc.job_post_id:
            job = await JobPost.get(esc.job_post_id)
            this_esc_done = all(m.status in ("approved", "released", "refunded") for m in esc.milestones)
            if job and this_esc_done:
                siblings = await _EscrowModel.find(
                    _EscrowModel.job_post_id == esc.job_post_id
                ).to_list()
                all_escs_done = all(
                    e.status in ("completed", "refunded", "cancelled") or
                    all(m.status in ("approved", "released", "refunded") for m in e.milestones)
                    for e in siblings
                )
                if all_escs_done:
                    job.status = "approved"
                    await job.save()
    except Exception:
        pass

    # Notify creator their work was approved
    try:
        from app.services.notification_service import NotificationService
        await NotificationService.send(
            user_id=str(esc.creator_id),
            type="escrow",
            category="success",
            title=f"Work approved: {milestone.title}",
            message=f"The client has approved your work on '{milestone.title}'. Payment release is now in progress.",
            actor_id=str(current_user.id),
        )
        # Post to conversation
        from app.models.message import Conversation
        from app.services.message_service import MessageService
        convo = await Conversation.find_one({"job_id": str(esc.job_post_id)}) if esc.job_post_id else None
        if convo:
            await MessageService.send_message(
                conversation_id=str(convo.id),
                sender_id=str(current_user.id),
                content=f"✅ **Work Approved: {milestone.title}**\n\nYour work has been approved. Payment will be released shortly.",
            )
    except Exception:
        pass

    return {"success": True, "milestone_id": milestone_id, "status": "approved"}


@escrow_router.post(
    "/{escrow_id}/milestone/{milestone_id}/mark-opened",
    summary="Client records that they opened the Drive delivery link",
)
async def mark_drive_link_opened(
    escrow_id: str,
    milestone_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Records the timestamp when the client first opened the Google Drive delivery link.
    This is step 1 of the payment-protection review gate — must happen before
    the client can confirm review or approve the milestone.

    Idempotent: calling multiple times only records the first open time.
    """
    from app.models.escrow import Escrow as EscrowDoc
    from beanie import PydanticObjectId
    from datetime import datetime as _dt

    esc = await EscrowDoc.get(PydanticObjectId(escrow_id))
    if not esc:
        raise HTTPException(status_code=404, detail="Escrow not found")
    if str(esc.client_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the client can record a link open")

    milestone = next((m for m in esc.milestones if m.milestone_id == milestone_id), None)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    if milestone.status not in ("delivered", "revision_requested"):
        raise HTTPException(status_code=400, detail=f"Milestone is not in a deliverable state (current: '{milestone.status}')")

    # Idempotent: only record the first open
    if not milestone.drive_link_opened_at:
        milestone.drive_link_opened_at = _dt.utcnow()
        await esc.save()

    return {
        "success": True,
        "milestone_id": milestone_id,
        "drive_link_opened_at": milestone.drive_link_opened_at.isoformat(),
    }


@escrow_router.post(
    "/{escrow_id}/milestone/{milestone_id}/confirm-review",
    summary="Client confirms they have reviewed the delivered work",
)
async def confirm_review(
    escrow_id: str,
    milestone_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Records the timestamp when the client explicitly confirms they have reviewed
    the delivered work. This is step 2 of the payment-protection review gate.

    Requires the Drive link to have been opened first (drive_link_opened_at must be set).
    After this, the client can choose to Approve or Request Revisions.
    """
    from app.models.escrow import Escrow as EscrowDoc
    from beanie import PydanticObjectId
    from datetime import datetime as _dt

    esc = await EscrowDoc.get(PydanticObjectId(escrow_id))
    if not esc:
        raise HTTPException(status_code=404, detail="Escrow not found")
    if str(esc.client_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the client can confirm review")

    milestone = next((m for m in esc.milestones if m.milestone_id == milestone_id), None)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    if milestone.status not in ("delivered",):
        raise HTTPException(status_code=400, detail=f"Can only confirm review on delivered milestones (current: '{milestone.status}')")

    if not milestone.drive_link_opened_at:
        raise HTTPException(
            status_code=400,
            detail="You must open the Google Drive link before confirming review.",
        )

    milestone.client_reviewed_at = _dt.utcnow()
    await esc.save()

    return {
        "success": True,
        "milestone_id": milestone_id,
        "client_reviewed_at": milestone.client_reviewed_at.isoformat(),
    }


class RevisionRequest(BaseModel):
    feedback: Optional[str] = None  # client's explanation of what needs to change

@escrow_router.post(
    "/{escrow_id}/milestone/{milestone_id}/request-revision",
    summary="Client requests revision on delivered milestone",
)
async def request_revision(
    escrow_id: str,
    milestone_id: str,
    body: RevisionRequest = RevisionRequest(),
    current_user: User = Depends(get_current_user),
):
    """Client requests revision — milestone goes back to revision_requested.
    Optionally accepts feedback explaining what needs to change."""
    from app.models.escrow import Escrow as EscrowDoc
    from beanie import PydanticObjectId
    esc = await EscrowDoc.get(PydanticObjectId(escrow_id))
    if not esc:
        raise HTTPException(status_code=404, detail="Escrow not found")
    if str(esc.client_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the client can request revision")
    milestone = next((m for m in esc.milestones if m.milestone_id == milestone_id), None)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    if milestone.status != "delivered":
        raise HTTPException(status_code=400, detail="Can only request revision on delivered milestones")
    milestone.status = "revision_requested"
    milestone.revision_count = (milestone.revision_count or 0) + 1
    milestone.revision_notes = body.feedback or None
    await esc.save()

    # Update job status to revision_requested if not all milestones still delivered
    try:
        from app.models.schema import JobPost
        if esc.job_post_id:
            job = await JobPost.get(esc.job_post_id)
            if job and job.status in ("delivered", "in_progress"):
                job.status = "revision_requested"
                await job.save()
    except Exception:
        pass

    # Post feedback as a message in project conversation + notify creator
    try:
        from app.services.notification_service import NotificationService
        feedback_text = body.feedback or "Please review and make the requested changes."

        # Bell notification
        await NotificationService.send(
            user_id=str(esc.creator_id),
            type="escrow",
            category="action_required",
            title=f"Revision requested: {milestone.title}",
            message=feedback_text,
            actor_id=str(current_user.id),
        )

        # Post feedback message to the project conversation
        from app.models.message import Conversation
        from app.services.message_service import MessageService
        convo = await Conversation.find_one({"job_id": str(esc.job_post_id)}) if esc.job_post_id else None
        if convo:
            chat_msg = (
                f"🔄 **Revision Requested: {milestone.title}**\n\n"
                f"{feedback_text}"
            )
            await MessageService.send_message(
                conversation_id=str(convo.id),
                sender_id=str(current_user.id),
                content=chat_msg,
            )
    except Exception:
        pass

    return {"success": True, "milestone_id": milestone_id, "status": "revision_requested"}


# ── Auto-release endpoints ────────────────────────────────────────────────────

@escrow_router.post(
    "/trigger-auto-release",
    summary="Manually trigger auto-release check (admin/system)",
    tags=["Admin"],
)
async def trigger_auto_release(admin: User = Depends(get_admin_user)):
    """
    Manually runs the auto-release check immediately.
    In production this runs automatically every 30 minutes.
    Admin only.
    """
    from app.services.auto_release_service import run_auto_release_check
    result = await run_auto_release_check()
    return {"success": True, **result}


@escrow_router.get(
    "/{escrow_id}/delivery-status",
    summary="Get delivery status and auto-release countdown for a milestone",
)
async def get_delivery_status(
    escrow_id: str,
    milestone_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Returns delivery details and auto-release countdown for a specific milestone.
    Used by the client delivery review page.
    """
    from app.models.escrow import Escrow as EscrowDoc
    from beanie import PydanticObjectId
    from datetime import datetime as _dt

    esc = await EscrowDoc.get(PydanticObjectId(escrow_id))
    if not esc:
        raise HTTPException(status_code=404, detail="Escrow not found")

    # Only client or creator can view
    if str(esc.client_id) != str(current_user.id) and str(esc.creator_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorised")

    milestone = next((m for m in esc.milestones if m.milestone_id == milestone_id), None)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    now = _dt.utcnow()
    hours_remaining = None
    if milestone.auto_release_at and milestone.status == "delivered":
        diff = (milestone.auto_release_at - now).total_seconds()
        hours_remaining = max(0, diff / 3600)

    return {
        "milestone_id": milestone.milestone_id,
        "title": milestone.title,
        "amount": float(milestone.amount),
        "status": milestone.status,
        "google_drive_link": milestone.google_drive_link,
        "delivery_notes": milestone.delivery_notes,
        "delivered_at": milestone.delivered_at.isoformat() if milestone.delivered_at else None,
        "auto_release_at": milestone.auto_release_at.isoformat() if milestone.auto_release_at else None,
        "hours_remaining": round(hours_remaining, 2) if hours_remaining is not None else None,
        "auto_released": milestone.auto_released,
        "revision_count": milestone.revision_count,
        "revision_notes": milestone.revision_notes,
        "delivery_history": milestone.delivery_history or [],
        # Review-gating audit trail
        "drive_link_opened_at": milestone.drive_link_opened_at.isoformat() if milestone.drive_link_opened_at else None,
        "client_reviewed_at": milestone.client_reviewed_at.isoformat() if milestone.client_reviewed_at else None,
        "escrow_id": str(esc.id),
        "client_id": str(esc.client_id),
        "creator_id": str(esc.creator_id),
    }
