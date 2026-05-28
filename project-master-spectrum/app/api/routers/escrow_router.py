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

escrow_router  = APIRouter(prefix="/escrow",   tags=["Spectrum Guarantee — Escrow"])
dispute_router = APIRouter(prefix="/disputes", tags=["Spectrum Guarantee — Disputes"])


# ═══════════════════════════════════════════════════════════════════════════════
# ESCROW ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@escrow_router.post("/", summary="Create escrow for a project")
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

@dispute_router.post("/", summary="Raise a dispute")
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
    return result