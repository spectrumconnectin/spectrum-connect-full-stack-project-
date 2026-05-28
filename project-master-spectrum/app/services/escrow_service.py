"""
Escrow Service
==============
Business logic for the Spectrum Guarantee escrow system.

Responsibilities
----------------
1. create_escrow        – client opens an escrow for a project.
2. fund_milestone       – client deposits funds for a specific milestone.
3. release_milestone    – client approves work and releases funds to creator.
4. refund_escrow        – full project cancellation — refund all funded milestones.
5. get_escrow_by_id     – fetch full escrow detail.
6. get_my_escrows       – list all escrows for current user (as client or creator).
7. get_escrow_summary   – compact summary for dashboard widgets.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.escrow import Escrow, EscrowMilestone
from app.models.schema import User, Transaction


class EscrowService:

    # ------------------------------------------------------------------ #
    # Create                                                               #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def create_escrow(
        client_id: str,
        creator_id: str,
        milestones: List[Dict[str, Any]],
        project_id: Optional[str] = None,
        job_post_id: Optional[str] = None,
        description: Optional[str] = None,
        currency: str = "USD",
    ) -> Dict[str, Any]:
        """
        Client creates an escrow for a project.

        Parameters
        ----------
        milestones : list of {"title": str, "amount": float}
        """
        if not milestones:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one milestone is required.",
            )

        # Validate creator exists
        creator = await User.get(PydanticObjectId(creator_id))
        if not creator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Creator not found.",
            )

        # Build milestone objects
        milestone_docs = []
        total = 0.0
        for m in milestones:
            amount = float(m.get("amount", 0))
            if amount <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Milestone amount must be > 0 (got {amount}).",
                )
            milestone_docs.append(EscrowMilestone(
                title=m["title"],
                amount=amount,
                currency=currency,
                deadline_id=m.get("deadline_id"),
            ))
            total += amount

        escrow = Escrow(
            client_id=PydanticObjectId(client_id),
            creator_id=PydanticObjectId(creator_id),
            project_id=PydanticObjectId(project_id) if project_id else None,
            job_post_id=PydanticObjectId(job_post_id) if job_post_id else None,
            total_amount=round(total, 2),
            currency=currency,
            milestones=milestone_docs,
            description=description,
        )
        await escrow.insert()

        return {
            "success": True,
            "escrow_id": str(escrow.id),
            "total_amount": escrow.total_amount,
            "currency": escrow.currency,
            "milestone_count": len(milestone_docs),
            "status": escrow.status,
            "message": "Escrow created. Fund milestones to begin work.",
        }

    # ------------------------------------------------------------------ #
    # Fund milestone                                                       #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def fund_milestone(
        escrow_id: str,
        milestone_id: str,
        client_id: str,
    ) -> Dict[str, Any]:
        """
        Client funds a specific milestone (simulates payment capture).
        In production this would trigger a Stripe PaymentIntent capture.
        """
        escrow = await Escrow.get(PydanticObjectId(escrow_id))
        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow not found.")

        if str(escrow.client_id) != client_id:
            raise HTTPException(status_code=403, detail="Only the client can fund milestones.")

        if escrow.status not in {"active"}:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot fund milestone on escrow with status '{escrow.status}'.",
            )

        # Find the milestone
        milestone = next(
            (m for m in escrow.milestones if m.milestone_id == milestone_id), None
        )
        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found in this escrow.")

        if milestone.status != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Milestone is already '{milestone.status}'. Only pending milestones can be funded.",
            )

        milestone.status = "funded"
        milestone.funded_at = datetime.utcnow()

        escrow.funded_amount = round(
            escrow.funded_amount + milestone.amount, 2
        )
        escrow.updated_at = datetime.utcnow()
        await escrow.save()

        return {
            "success": True,
            "escrow_id": escrow_id,
            "milestone_id": milestone_id,
            "amount_funded": milestone.amount,
            "total_funded": escrow.funded_amount,
            "message": f"Milestone '{milestone.title}' funded. Creator can now begin work.",
        }

    # ------------------------------------------------------------------ #
    # Release milestone                                                    #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def release_milestone(
        escrow_id: str,
        milestone_id: str,
        client_id: str,
    ) -> Dict[str, Any]:
        """
        Client approves completed work and releases milestone funds to creator.
        Creates an immutable Transaction record.
        """
        escrow = await Escrow.get(PydanticObjectId(escrow_id))
        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow not found.")

        if str(escrow.client_id) != client_id:
            raise HTTPException(status_code=403, detail="Only the client can release milestones.")

        if escrow.status not in {"active"}:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot release on escrow with status '{escrow.status}'.",
            )

        milestone = next(
            (m for m in escrow.milestones if m.milestone_id == milestone_id), None
        )
        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found.")

        if milestone.status != "funded":
            raise HTTPException(
                status_code=400,
                detail=f"Milestone must be 'funded' before release (current: '{milestone.status}').",
            )

        now = datetime.utcnow()
        tx_id = str(uuid.uuid4())

        # Create transaction record
        transaction = Transaction(
            transaction_id=tx_id,
            from_user_id=escrow.client_id,
            to_user_id=escrow.creator_id,
            type="payment",
            amount=milestone.amount,
            currency=escrow.currency,
            platform_fee=0.0,          # Commission calculated separately
            payment_processing_fee=0.0,
            net_amount=milestone.amount,
            status="completed",
            initiated_at=now,
            processed_at=now,
            completed_at=now,
        )
        await transaction.insert()

        # Update milestone
        milestone.status = "released"
        milestone.released_at = now
        milestone.release_transaction_id = tx_id

        # Update escrow totals
        escrow.released_amount = round(escrow.released_amount + milestone.amount, 2)
        escrow.updated_at = now

        # Check if all milestones are terminal (released/refunded)
        all_done = all(
            m.status in {"released", "refunded"}
            for m in escrow.milestones
        )
        if all_done:
            escrow.status = "completed"
            escrow.completed_at = now

        await escrow.save()

        return {
            "success": True,
            "escrow_id": escrow_id,
            "milestone_id": milestone_id,
            "amount_released": milestone.amount,
            "transaction_id": tx_id,
            "escrow_status": escrow.status,
            "message": f"${milestone.amount} released to creator for '{milestone.title}'.",
        }

    # ------------------------------------------------------------------ #
    # Refund escrow (full cancel)                                         #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def refund_escrow(
        escrow_id: str,
        requesting_user_id: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Refund all funded-but-unreleased milestones back to the client.
        Can be called by client or admin.
        """
        escrow = await Escrow.get(PydanticObjectId(escrow_id))
        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow not found.")

        is_client = str(escrow.client_id) == requesting_user_id
        # Admin check would use user_role — simplified here
        if not is_client:
            raise HTTPException(
                status_code=403,
                detail="Only the client can request a full refund.",
            )

        if escrow.status in {"completed", "refunded", "cancelled"}:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot refund escrow with status '{escrow.status}'.",
            )

        refund_total = 0.0
        now = datetime.utcnow()

        for milestone in escrow.milestones:
            if milestone.status == "funded":
                milestone.status = "refunded"
                milestone.refunded_at = now
                refund_total += milestone.amount

        escrow.refunded_amount = round(escrow.refunded_amount + refund_total, 2)
        escrow.status = "refunded"
        escrow.updated_at = now
        await escrow.save()

        return {
            "success": True,
            "escrow_id": escrow_id,
            "refund_total": refund_total,
            "escrow_status": "refunded",
            "message": f"${refund_total} refunded to client. Escrow closed.",
        }

    # ------------------------------------------------------------------ #
    # Read                                                                 #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def get_escrow_by_id(
        escrow_id: str,
        requesting_user_id: str,
    ) -> Dict[str, Any]:
        """Fetch full escrow detail. Only client or creator can view."""
        escrow = await Escrow.get(PydanticObjectId(escrow_id))
        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow not found.")

        if requesting_user_id not in {
            str(escrow.client_id), str(escrow.creator_id)
        }:
            raise HTTPException(
                status_code=403,
                detail="Access denied. You are not a party to this escrow.",
            )

        client  = await User.get(escrow.client_id)
        creator = await User.get(escrow.creator_id)

        return {
            "escrow_id": str(escrow.id),
            "status": escrow.status,
            "total_amount": escrow.total_amount,
            "funded_amount": escrow.funded_amount,
            "released_amount": escrow.released_amount,
            "refunded_amount": escrow.refunded_amount,
            "currency": escrow.currency,
            "description": escrow.description,
            "project_id": str(escrow.project_id) if escrow.project_id else None,
            "client": {
                "user_id": str(client.id),
                "username": client.username,
                "profile_picture": client.profile.profile_picture if client.profile else None,
            } if client else None,
            "creator": {
                "user_id": str(creator.id),
                "username": creator.username,
                "profile_picture": creator.profile.profile_picture if creator.profile else None,
            } if creator else None,
            "milestones": [
                {
                    "milestone_id": m.milestone_id,
                    "title": m.title,
                    "amount": m.amount,
                    "status": m.status,
                    "funded_at": m.funded_at,
                    "released_at": m.released_at,
                    "refunded_at": m.refunded_at,
                    "release_transaction_id": m.release_transaction_id,
                    "deadline_id": m.deadline_id,
                }
                for m in escrow.milestones
            ],
            "created_at": escrow.created_at,
            "updated_at": escrow.updated_at,
            "completed_at": escrow.completed_at,
        }

    @staticmethod
    async def get_my_escrows(
        user_id: str,
        role: str = "both",         # "client" | "creator" | "both"
        status_filter: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """List all escrows for the current user."""
        uid = PydanticObjectId(user_id)

        if role == "client":
            query = Escrow.find(Escrow.client_id == uid)
        elif role == "creator":
            query = Escrow.find(Escrow.creator_id == uid)
        else:
            query = Escrow.find({"$or": [{"client_id": uid}, {"creator_id": uid}]})

        if status_filter:
            query = query.find(Escrow.status == status_filter)

        total = await query.count()
        escrows_raw = (
            await query.sort(-Escrow.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        escrows = []
        for e in escrows_raw:
            funded_milestones   = sum(1 for m in e.milestones if m.status == "funded")
            released_milestones = sum(1 for m in e.milestones if m.status == "released")

            escrows.append({
                "escrow_id": str(e.id),
                "status": e.status,
                "total_amount": e.total_amount,
                "funded_amount": e.funded_amount,
                "released_amount": e.released_amount,
                "currency": e.currency,
                "project_id": str(e.project_id) if e.project_id else None,
                "client_id": str(e.client_id),
                "creator_id": str(e.creator_id),
                "milestone_count": len(e.milestones),
                "funded_milestones": funded_milestones,
                "released_milestones": released_milestones,
                "created_at": e.created_at,
            })

        return {
            "escrows": escrows,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }