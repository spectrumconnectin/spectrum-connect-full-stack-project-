"""
Dispute Service
===============
Business logic for raising, managing, and resolving disputes.

Responsibilities
----------------
1. create_dispute     – either party raises a dispute on an escrow milestone.
2. submit_evidence    – either party adds supporting evidence.
3. assign_reviewer    – admin self-assigns the dispute.
4. resolve_dispute    – admin issues resolution; moves escrow funds accordingly.
5. get_dispute_by_id  – full dispute detail.
6. get_my_disputes    – list disputes for current user.
7. get_all_disputes   – admin view with filters.

Resolution types
----------------
full_refund         – all milestone funds returned to client
partial_refund      – split decided by admin (resolution_amount to client)
release_to_creator  – funds released to creator despite dispute
split               – custom split between both parties
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.escrow import Escrow, Dispute, DisputeEvidence, GuaranteeFund
from app.models.schema import User, Transaction
import uuid


class DisputeService:

    # ------------------------------------------------------------------ #
    # Raise a dispute                                                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def create_dispute(
        escrow_id: str,
        raised_by_id: str,
        reason: str,
        details: Optional[str] = None,
        milestone_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Either client or creator raises a dispute on an escrow.

        - Marks the escrow (and specific milestone) as 'disputed'.
        - Only one open dispute per escrow is allowed.
        """
        escrow = await Escrow.get(PydanticObjectId(escrow_id))
        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow not found.")

        raised_by = PydanticObjectId(raised_by_id)
        is_client  = escrow.client_id == raised_by
        is_creator = escrow.creator_id == raised_by

        if not (is_client or is_creator):
            raise HTTPException(
                status_code=403,
                detail="Only parties to the escrow can raise a dispute.",
            )

        if escrow.status in {"completed", "refunded", "cancelled"}:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot raise a dispute on a '{escrow.status}' escrow.",
            )

        # Check for existing open dispute
        existing = await Dispute.find_one({
            "escrow_id": escrow.id,
            "status": {"$in": ["open", "under_review"]},
        })
        if existing:
            raise HTTPException(
                status_code=400,
                detail="An open dispute already exists for this escrow.",
            )

        raised_against = escrow.creator_id if is_client else escrow.client_id

        # Mark specific milestone as disputed
        if milestone_id:
            for m in escrow.milestones:
                if m.milestone_id == milestone_id and m.status == "funded":
                    m.status = "disputed"
                    break

        escrow.status = "disputed"
        escrow.updated_at = datetime.utcnow()
        await escrow.save()

        dispute = Dispute(
            escrow_id=escrow.id,
            project_id=escrow.project_id,
            milestone_id=milestone_id,
            raised_by=raised_by,
            raised_against=raised_against,
            reason=reason,
            details=details,
        )
        await dispute.insert()

        return {
            "success": True,
            "dispute_id": str(dispute.id),
            "escrow_id": escrow_id,
            "status": "open",
            "message": "Dispute raised. Our team will review within 2-3 business days.",
        }

    # ------------------------------------------------------------------ #
    # Submit evidence                                                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def submit_evidence(
        dispute_id: str,
        submitted_by_id: str,
        evidence_type: str,
        url: str,
        description: str,
    ) -> Dict[str, Any]:
        """Either party submits supporting evidence."""
        dispute = await Dispute.get(PydanticObjectId(dispute_id))
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found.")

        uid = PydanticObjectId(submitted_by_id)
        if uid not in {dispute.raised_by, dispute.raised_against}:
            raise HTTPException(
                status_code=403,
                detail="Only parties to the dispute can submit evidence.",
            )

        if dispute.status not in {"open", "under_review"}:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot add evidence to a '{dispute.status}' dispute.",
            )

        evidence = DisputeEvidence(
            submitted_by=uid,
            evidence_type=evidence_type,
            url=url,
            description=description,
        )
        dispute.evidence.append(evidence)
        dispute.updated_at = datetime.utcnow()
        await dispute.save()

        return {
            "success": True,
            "dispute_id": dispute_id,
            "evidence_count": len(dispute.evidence),
            "message": "Evidence submitted successfully.",
        }

    # ------------------------------------------------------------------ #
    # Admin — assign                                                       #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def assign_reviewer(
        dispute_id: str,
        admin_user_id: str,
    ) -> Dict[str, Any]:
        """Admin self-assigns an open dispute for review."""
        dispute = await Dispute.get(PydanticObjectId(dispute_id))
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found.")

        if dispute.status != "open":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot assign a dispute with status '{dispute.status}'.",
            )

        dispute.assigned_reviewer_id = PydanticObjectId(admin_user_id)
        dispute.status = "under_review"
        dispute.updated_at = datetime.utcnow()
        await dispute.save()

        return {
            "success": True,
            "dispute_id": dispute_id,
            "new_status": "under_review",
            "message": "Dispute assigned and under review.",
        }

    # ------------------------------------------------------------------ #
    # Admin — resolve                                                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def resolve_dispute(
        dispute_id: str,
        admin_user_id: str,
        resolution_type: str,
        resolution_notes: str,
        resolution_amount: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Admin resolves the dispute.

        resolution_type options
        -----------------------
        full_refund        → all disputed milestone funds returned to client
        partial_refund     → resolution_amount returned to client, rest to creator
        release_to_creator → full milestone amount released to creator
        split              → custom split (resolution_amount to client)
        """
        valid_types = {
            "full_refund", "partial_refund",
            "release_to_creator", "split",
        }
        if resolution_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid resolution_type. Must be one of: {valid_types}",
            )

        dispute = await Dispute.get(PydanticObjectId(dispute_id))
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found.")

        if dispute.status not in {"open", "under_review"}:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot resolve a '{dispute.status}' dispute.",
            )

        escrow = await Escrow.get(dispute.escrow_id)
        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow not found.")

        now = datetime.utcnow()

        # Find the disputed milestone amount
        disputed_amount = 0.0
        if dispute.milestone_id:
            for m in escrow.milestones:
                if m.milestone_id == dispute.milestone_id:
                    disputed_amount = m.amount
                    break
        else:
            # All funded milestones are disputed
            disputed_amount = sum(
                m.amount for m in escrow.milestones
                if m.status in {"funded", "disputed"}
            )

        # Execute resolution
        if resolution_type == "full_refund":
            await DisputeService._apply_full_refund(escrow, dispute, now)
            actual_resolution_amount = disputed_amount
            new_dispute_status = "resolved_client_favor"

        elif resolution_type == "release_to_creator":
            await DisputeService._apply_release_to_creator(escrow, dispute, now)
            actual_resolution_amount = disputed_amount
            new_dispute_status = "resolved_creator_favor"

        elif resolution_type in {"partial_refund", "split"}:
            if resolution_amount is None:
                raise HTTPException(
                    status_code=400,
                    detail="resolution_amount is required for partial_refund or split.",
                )
            await DisputeService._apply_split(
                escrow, dispute, resolution_amount, disputed_amount, now
            )
            actual_resolution_amount = resolution_amount
            new_dispute_status = "resolved_client_favor"  # partial win for client
        else:
            actual_resolution_amount = 0.0
            new_dispute_status = "resolved_client_favor"

        # Update dispute
        dispute.status = new_dispute_status
        dispute.resolution_type = resolution_type
        dispute.resolution_notes = resolution_notes
        dispute.resolution_amount = actual_resolution_amount
        dispute.assigned_reviewer_id = PydanticObjectId(admin_user_id)
        dispute.resolved_at = now
        dispute.updated_at = now
        await dispute.save()

        return {
            "success": True,
            "dispute_id": dispute_id,
            "new_status": new_dispute_status,
            "resolution_type": resolution_type,
            "resolution_amount": actual_resolution_amount,
            "escrow_status": escrow.status,
            "message": f"Dispute resolved: {resolution_type.replace('_', ' ')}.",
        }

    # ── Resolution helpers ────────────────────────────────────────────────

    @staticmethod
    async def _apply_full_refund(
        escrow: Escrow, dispute: Dispute, now: datetime
    ):
        """Refund all disputed/funded milestones to client."""
        for m in escrow.milestones:
            if m.status in {"disputed", "funded"}:
                m.status = "refunded"
                m.refunded_at = now
                escrow.refunded_amount = round(escrow.refunded_amount + m.amount, 2)

        escrow.status = "refunded"
        escrow.updated_at = now
        await escrow.save()

    @staticmethod
    async def _apply_release_to_creator(
        escrow: Escrow, dispute: Dispute, now: datetime
    ):
        """Release disputed milestones to creator despite the dispute."""
        tx_id = str(uuid.uuid4())
        released = 0.0

        for m in escrow.milestones:
            if m.status in {"disputed", "funded"}:
                m.status = "released"
                m.released_at = now
                m.release_transaction_id = tx_id
                released += m.amount

        escrow.released_amount = round(escrow.released_amount + released, 2)

        all_done = all(
            m.status in {"released", "refunded"} for m in escrow.milestones
        )
        escrow.status = "completed" if all_done else "active"
        escrow.completed_at = now if all_done else None
        escrow.updated_at = now
        await escrow.save()

        # Create transaction
        transaction = Transaction(
            transaction_id=tx_id,
            from_user_id=escrow.client_id,
            to_user_id=escrow.creator_id,
            type="payment",
            amount=released,
            currency=escrow.currency,
            platform_fee=0.0,
            payment_processing_fee=0.0,
            net_amount=released,
            status="completed",
            initiated_at=now,
            processed_at=now,
            completed_at=now,
        )
        await transaction.insert()

    @staticmethod
    async def _apply_split(
        escrow: Escrow,
        dispute: Dispute,
        client_amount: float,
        total_disputed: float,
        now: datetime,
    ):
        """Split disputed amount: client_amount to client, rest to creator."""
        creator_amount = round(total_disputed - client_amount, 2)
        tx_id = str(uuid.uuid4())

        for m in escrow.milestones:
            if m.status in {"disputed", "funded"}:
                m.status = "released"
                m.released_at = now
                m.release_transaction_id = tx_id

        escrow.refunded_amount = round(escrow.refunded_amount + client_amount, 2)
        escrow.released_amount = round(escrow.released_amount + creator_amount, 2)
        escrow.updated_at = now

        all_done = all(
            m.status in {"released", "refunded"} for m in escrow.milestones
        )
        escrow.status = "completed" if all_done else "active"
        escrow.completed_at = now if all_done else None
        await escrow.save()

        if creator_amount > 0:
            transaction = Transaction(
                transaction_id=tx_id,
                from_user_id=escrow.client_id,
                to_user_id=escrow.creator_id,
                type="payment",
                amount=creator_amount,
                currency=escrow.currency,
                platform_fee=0.0,
                payment_processing_fee=0.0,
                net_amount=creator_amount,
                status="completed",
                initiated_at=now,
                processed_at=now,
                completed_at=now,
            )
            await transaction.insert()

    # ------------------------------------------------------------------ #
    # Read                                                                 #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def get_dispute_by_id(
        dispute_id: str,
        requesting_user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """Full dispute detail. Parties + admins can view."""
        dispute = await Dispute.get(PydanticObjectId(dispute_id))
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found.")

        uid = PydanticObjectId(requesting_user_id)
        if not is_admin and uid not in {dispute.raised_by, dispute.raised_against}:
            raise HTTPException(status_code=403, detail="Access denied.")

        raiser   = await User.get(dispute.raised_by)
        against  = await User.get(dispute.raised_against)
        reviewer = (
            await User.get(dispute.assigned_reviewer_id)
            if dispute.assigned_reviewer_id else None
        )

        return {
            "dispute_id": str(dispute.id),
            "escrow_id": str(dispute.escrow_id),
            "project_id": str(dispute.project_id) if dispute.project_id else None,
            "milestone_id": dispute.milestone_id,
            "status": dispute.status,
            "reason": dispute.reason,
            "details": dispute.details,
            "raised_by": {
                "user_id": str(raiser.id),
                "username": raiser.username,
            } if raiser else None,
            "raised_against": {
                "user_id": str(against.id),
                "username": against.username,
            } if against else None,
            "assigned_reviewer": {
                "user_id": str(reviewer.id),
                "username": reviewer.username,
            } if reviewer else None,
            "evidence": [
                {
                    "submitted_by": str(e.submitted_by),
                    "evidence_type": e.evidence_type,
                    "url": e.url,
                    "description": e.description,
                    "uploaded_at": e.uploaded_at,
                }
                for e in dispute.evidence
            ],
            "resolution_type": dispute.resolution_type,
            "resolution_notes": dispute.resolution_notes,
            "resolution_amount": dispute.resolution_amount,
            "guarantee_fund_used": dispute.guarantee_fund_used,
            "created_at": dispute.created_at,
            "resolved_at": dispute.resolved_at,
        }

    @staticmethod
    async def get_my_disputes(
        user_id: str,
        status_filter: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """List all disputes the user is a party to."""
        uid = PydanticObjectId(user_id)
        query = Dispute.find(
            {"$or": [{"raised_by": uid}, {"raised_against": uid}]}
        )
        if status_filter:
            query = query.find(Dispute.status == status_filter)

        total = await query.count()
        disputes_raw = (
            await query.sort(-Dispute.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        disputes = []
        for d in disputes_raw:
            disputes.append({
                "dispute_id": str(d.id),
                "escrow_id": str(d.escrow_id),
                "status": d.status,
                "reason": d.reason,
                "raised_by": str(d.raised_by),
                "raised_against": str(d.raised_against),
                "resolution_type": d.resolution_type,
                "created_at": d.created_at,
                "resolved_at": d.resolved_at,
                "evidence_count": len(d.evidence),
            })

        return {
            "disputes": disputes,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }

    @staticmethod
    async def get_all_disputes(
        status_filter: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Admin — list all disputes with optional status filter."""
        query = Dispute.find()
        if status_filter:
            query = query.find(Dispute.status == status_filter)

        total = await query.count()
        disputes_raw = (
            await query.sort(-Dispute.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        disputes = []
        for d in disputes_raw:
            raiser = await User.get(d.raised_by)
            disputes.append({
                "dispute_id": str(d.id),
                "escrow_id": str(d.escrow_id),
                "status": d.status,
                "reason": d.reason,
                "raised_by_username": raiser.username if raiser else "unknown",
                "is_assigned": d.assigned_reviewer_id is not None,
                "evidence_count": len(d.evidence),
                "created_at": d.created_at,
                "resolved_at": d.resolved_at,
            })

        return {
            "disputes": disputes,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }