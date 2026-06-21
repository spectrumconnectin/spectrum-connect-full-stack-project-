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

from app.core.config import settings
from app.models.escrow import Escrow, EscrowMilestone
from app.models.schema import User, Transaction
from app.services.commission_service import calc_commission, calc_refund_reversal


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

        # A client cannot escrow against themselves.
        if str(creator_id) == str(client_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot create an escrow with yourself as the creator.",
            )

        # AUTHORIZATION: if this escrow is tied to a job post, the requesting
        # user must own that job. Prevents creating escrows against jobs the
        # user does not control (parameter tampering on job_post_id).
        if job_post_id:
            from app.models.schema import JobPost
            try:
                job = await JobPost.get(PydanticObjectId(job_post_id))
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid job_post_id.")
            if not job:
                raise HTTPException(status_code=404, detail="Job post not found.")
            if str(job.client_id) != str(client_id):
                raise HTTPException(
                    status_code=403,
                    detail="You do not own this job post.",
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
        stripe_payment_intent: Optional[str] = None,
        stripe_fee: Optional[float] = None,
        amount_paid: Optional[float] = None,
        expected_cents: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Mark a milestone as funded after Stripe Checkout confirms payment.
        Called exclusively by the Stripe webhook handler.

        The status flip is performed as an atomic claim so duplicate webhook
        deliveries (Stripe retries) cannot double-increment funded_amount.
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

        # Defense-in-depth: re-derive the expected charge from the milestone and
        # confirm it matches what the checkout session was created for. Guards
        # against a milestone amount being mutated between session creation and
        # capture.
        fees = calc_commission(milestone.amount, currency=escrow.currency)
        expected_from_milestone = int(round(float(fees.to_dict()["client_total"]) * 100))
        if expected_cents is not None and expected_cents != expected_from_milestone:
            raise HTTPException(
                status_code=400,
                detail="Captured amount does not match the milestone's current price.",
            )

        now = datetime.utcnow()
        coll = escrow.get_motor_collection()

        # ── Atomic claim: pending → funded for THIS milestone only ────────────
        set_fields = {
            "milestones.$[m].status": "funded",
            "milestones.$[m].funded_at": now,
            "updated_at": now,
        }
        if stripe_payment_intent:
            set_fields["milestones.$[m].stripe_payment_intent"] = stripe_payment_intent
        if stripe_fee is not None:
            set_fields["milestones.$[m].stripe_fee"] = stripe_fee
        if amount_paid is not None:
            set_fields["milestones.$[m].amount_paid"] = amount_paid

        claimed = await coll.find_one_and_update(
            {
                "_id": escrow.id,
                "status": "active",
                "milestones": {
                    "$elemMatch": {"milestone_id": milestone_id, "status": "pending"}
                },
            },
            {
                "$set": set_fields,
                "$inc": {"funded_amount": round(float(milestone.amount), 2)},
            },
            array_filters=[{"m.milestone_id": milestone_id}],
        )
        if claimed is None:
            # A concurrent/duplicate webhook already funded it.
            raise HTTPException(
                status_code=400,
                detail="Milestone is already funded (duplicate funding prevented).",
            )

        # Refresh the in-memory copy so the response/ETF block below is accurate.
        milestone.status = "funded"
        milestone.funded_at = now
        escrow.funded_amount = round(escrow.funded_amount + float(milestone.amount), 2)

        # ETF Points — client funded a milestone (engagement signal).
        # Blocked when client and creator are the same account (self-job).
        try:
            from app.services.etf_points_service import EtfPointsService
            await EtfPointsService.award_points(
                user_id=escrow.client_id,
                action="milestone.funded",
                source_type="escrow_milestone",
                source_id=f"{escrow_id}:{milestone_id}",
                counterparty_id=escrow.creator_id,
                description=f"Funded milestone: {milestone.title}",
            )
        except Exception:
            pass

        # `fees` was already computed above for the amount verification. No
        # Transaction is written at the funding step — funds are only held in
        # escrow here; the charge transaction is recorded on release.
        return {
            "success": True,
            "escrow_id": escrow_id,
            "milestone_id": milestone_id,
            "amount_funded": milestone.amount,
            "total_funded": escrow.funded_amount,
            "fees": fees.to_dict(),
            "client_charge": fees.to_dict()["client_total"],
            "message": (
                f"Milestone '{milestone.title}' funded. "
                f"Client charged ${fees.to_dict()['client_total']:.2f} "
                f"(${milestone.amount:.2f} subtotal + ${fees.to_dict()['client_fee']:.2f} platform fee). "
                "Creator can now begin work."
            ),
        }

    # ------------------------------------------------------------------ #
    # Release milestone                                                    #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def release_milestone(
        escrow_id: str,
        milestone_id: str,
        client_id: str,
        is_auto_release: bool = False,
    ) -> Dict[str, Any]:
        """
        Client approves completed work and releases milestone funds to creator.
        Creates an immutable Transaction record.

        Concurrency model
        ------------------
        All mutations to the escrow document are done via targeted atomic
        operators (positional arrayFilters + $inc), never a full-document
        ``save()`` of a possibly-stale in-memory copy. This makes the release
        safe under concurrent releases of *different* milestones on the same
        escrow and under the auto-release job racing a manual release.

        Set is_auto_release=True to bypass the client_id ownership check and
        the manual review gate (used by the auto-release background job).
        """
        escrow = await Escrow.get(PydanticObjectId(escrow_id))
        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow not found.")

        if not is_auto_release and str(escrow.client_id) != client_id:
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

        # A milestone is releasable from funded (client pays early), approved, or
        # delivered. Disputed/refunded/released/pending are not releasable.
        releasable_statuses = ("funded", "approved", "delivered")
        if milestone.status not in releasable_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Milestone cannot be released from status '{milestone.status}'.",
            )

        # Payment-protection gate: manual releases from 'delivered' state require the
        # client to have opened the Drive link AND confirmed the review.
        # Auto-releases (is_auto_release=True) bypass this guard — the 48h window
        # gives the client ample time; auto-release is a fallback, not a shortcut.
        if milestone.status == "delivered" and not is_auto_release:
            if not getattr(milestone, "drive_link_opened_at", None):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Payment cannot be released without reviewing the delivery. "
                        "Open the Google Drive link on the Delivery Review page first."
                    ),
                )
            if not getattr(milestone, "client_reviewed_at", None):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Please confirm you have reviewed the delivered work before releasing payment. "
                        "Go to the Delivery Review page and confirm your review."
                    ),
                )

        now = datetime.utcnow()
        tx_id = str(uuid.uuid4())
        amount = float(milestone.amount)
        coll = escrow.get_motor_collection()

        # ── Atomic claim ──────────────────────────────────────────────────────
        # Flip ONLY this milestone (matched by $elemMatch so milestone_id and
        # status apply to the SAME array element) from a releasable status to a
        # transient 'releasing' status. If it no longer matches — because a
        # concurrent request, the auto-release job, or a previous click already
        # claimed it — we abort with 409 and never create a duplicate payment.
        claimed = await coll.find_one_and_update(
            {
                "_id": escrow.id,
                "status": "active",
                "milestones": {
                    "$elemMatch": {
                        "milestone_id": milestone_id,
                        "status": {"$in": list(releasable_statuses)},
                    }
                },
            },
            {"$set": {"milestones.$[m].status": "releasing", "updated_at": now}},
            array_filters=[{"m.milestone_id": milestone_id}],
        )
        if claimed is None:
            raise HTTPException(
                status_code=409,
                detail="Milestone is already being released or has already been paid. Duplicate release prevented.",
            )

        # Apply v1 8/4 commission split — see app/services/commission_service.py.
        fees = calc_commission(amount, currency=escrow.currency)
        fees_dict = fees.to_dict()

        # Record the real Stripe processing fee captured at funding time; fall
        # back to the standard rate only for legacy milestones that pre-date
        # Stripe linkage.
        stripe_fee = getattr(milestone, "stripe_fee", None)
        if stripe_fee is None:
            stripe_fee = round(fees_dict["client_total"] * 0.029 + 0.30, 2)

        # Create the immutable transaction. The unique index on transaction_id is
        # the final backstop against duplicate-payment writes.
        transaction = Transaction(
            transaction_id=tx_id,
            from_user_id=escrow.client_id,
            to_user_id=escrow.creator_id,
            type="payment",
            amount=amount,
            currency=escrow.currency,
            platform_fee=fees_dict["platform_take"],
            creator_fee=fees_dict["creator_fee"],
            client_fee=fees_dict["client_fee"],
            commission_version=fees_dict["commission_version"],
            payment_processing_fee=stripe_fee,
            net_amount=fees_dict["creator_payout"],
            payment_provider="stripe",
            external_transaction_id=getattr(milestone, "stripe_payment_intent", None),
            status="completed",
            initiated_at=now,
            processed_at=now,
            completed_at=now,
        )
        try:
            await transaction.insert()
        except Exception:
            # Transaction write failed (e.g. duplicate tx_id) — roll the claim
            # back so the milestone can be retried, then surface the error.
            await coll.update_one(
                {"_id": escrow.id},
                {"$set": {"milestones.$[m].status": milestone.status}},
                array_filters=[{"m.milestone_id": milestone_id}],
            )
            raise HTTPException(status_code=500, detail="Failed to record payment transaction.")

        # ── Finalize atomically ───────────────────────────────────────────────
        # Mark released + bump released_amount in one targeted update. No
        # full-document save, so concurrent releases of sibling milestones can't
        # clobber each other.
        await coll.update_one(
            {"_id": escrow.id},
            {
                "$set": {
                    "milestones.$[m].status": "released",
                    "milestones.$[m].released_at": now,
                    "milestones.$[m].release_transaction_id": tx_id,
                    "milestones.$[m].auto_released": bool(is_auto_release),
                    "updated_at": now,
                },
                "$inc": {"released_amount": round(amount, 2)},
            },
            array_filters=[{"m.milestone_id": milestone_id}],
        )

        # ── Completion check ──────────────────────────────────────────────────
        # Re-read the fresh document and, if every milestone is now terminal,
        # flip the escrow to completed. The status guard makes this idempotent.
        fresh = await Escrow.get(escrow.id)
        escrow_status = fresh.status if fresh else "active"
        if fresh and all(m.status in {"released", "refunded"} for m in fresh.milestones):
            await coll.update_one(
                {"_id": escrow.id, "status": "active"},
                {"$set": {"status": "completed", "completed_at": now}},
            )
            escrow_status = "completed"

        # Expose the computed status to the rest of the method via the in-memory
        # object (used by the ETF bonus block below and the response).
        escrow.status = escrow_status
        escrow.released_amount = round((fresh.released_amount if fresh else escrow.released_amount), 2)

        # ETF Points — milestone release awards both parties (client for
        # paying on time, creator for delivering). Blocked on self-deal.
        try:
            from app.services.etf_points_service import EtfPointsService
            await EtfPointsService.award_points(
                user_id=escrow.client_id,
                action="milestone.released.client",
                source_type="escrow_milestone",
                source_id=f"{escrow_id}:{milestone_id}",
                counterparty_id=escrow.creator_id,
                description=f"Released milestone: {milestone.title}",
            )
            await EtfPointsService.award_points(
                user_id=escrow.creator_id,
                action="milestone.released.creator",
                source_type="escrow_milestone",
                source_id=f"{escrow_id}:{milestone_id}",
                counterparty_id=escrow.client_id,
                description=f"Delivered milestone: {milestone.title}",
            )
            # If the whole escrow just completed, award both sides the
            # project-completion bonus once (escrow_id is the dedup source).
            if escrow.status == "completed":
                await EtfPointsService.award_points(
                    user_id=escrow.client_id,
                    action="project.completed.client",
                    source_type="escrow",
                    source_id=str(escrow_id),
                    counterparty_id=escrow.creator_id,
                    description="Completed project on Spectrum Connect",
                )
                await EtfPointsService.award_points(
                    user_id=escrow.creator_id,
                    action="project.completed.creator",
                    source_type="escrow",
                    source_id=str(escrow_id),
                    counterparty_id=escrow.client_id,
                    description="Completed project on Spectrum Connect",
                )
        except Exception:
            pass

        return {
            "success": True,
            "escrow_id": escrow_id,
            "milestone_id": milestone_id,
            "amount_released": milestone.amount,
            "creator_payout": fees_dict["creator_payout"],
            "fees": fees_dict,
            "transaction_id": tx_id,
            "escrow_status": escrow.status,
            "message": (
                f"${fees_dict['creator_payout']:.2f} released to creator for "
                f"'{milestone.title}' "
                f"(${milestone.amount:.2f} subtotal - ${fees_dict['creator_fee']:.2f} platform fee)."
            ),
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

        now = datetime.utcnow()
        coll = escrow.get_motor_collection()

        # ── Atomic claim against concurrent double-refund / refund-vs-release ──
        # Flip the escrow from a non-terminal state to a transient 'refunding'
        # status. This blocks concurrent refunds (they no longer match) and
        # release_milestone (which requires status == 'active').
        claimed = await coll.find_one_and_update(
            {"_id": escrow.id, "status": {"$nin": ["completed", "refunded", "cancelled", "refunding"]}},
            {"$set": {"status": "refunding", "updated_at": now}},
        )
        if claimed is None:
            raise HTTPException(
                status_code=409,
                detail="This escrow is already being refunded or is in a terminal state.",
            )

        # Re-read fresh after claiming so milestone statuses are current.
        escrow = await Escrow.get(PydanticObjectId(escrow_id))

        refund_total = 0.0
        client_fee_refund_total = 0.0

        for milestone in escrow.milestones:
            if milestone.status == "funded":
                milestone.status = "refunded"
                milestone.refunded_at = now
                refund_total += milestone.amount
                # Per spec §7: never released funds → fully reverse client_fee
                # collected at funding time.
                m_fees = calc_commission(milestone.amount, currency=escrow.currency)
                client_fee_refund_total += float(m_fees.client_fee)

        escrow.refunded_amount = round(escrow.refunded_amount + refund_total, 2)
        escrow.status = "refunded"
        escrow.updated_at = now
        await escrow.save()

        client_refund_total = round(refund_total + client_fee_refund_total, 2)

        # Record refund transaction so the ledger reflects the reversal.
        if refund_total > 0:
            await Transaction(
                transaction_id=str(uuid.uuid4()),
                from_user_id=escrow.creator_id,        # funds leaving creator's escrow side
                to_user_id=escrow.client_id,           # back to client
                type="refund",
                amount=refund_total,
                currency=escrow.currency,
                platform_fee=-round(client_fee_refund_total, 2),  # negative — refunded back
                client_fee=-round(client_fee_refund_total, 2),
                creator_fee=0.0,
                commission_version=getattr(settings, "COMM_VERSION", "v1.split.8_4"),
                payment_processing_fee=0.0,
                net_amount=client_refund_total,
                status="completed",
                initiated_at=now,
                processed_at=now,
                completed_at=now,
            ).insert()

        return {
            "success": True,
            "escrow_id": escrow_id,
            "refund_total": refund_total,
            "client_fee_refund": round(client_fee_refund_total, 2),
            "client_total_refund": client_refund_total,
            "escrow_status": "refunded",
            "message": (
                f"${client_refund_total:.2f} refunded to client "
                f"(${refund_total:.2f} subtotal + ${client_fee_refund_total:.2f} platform fee). "
                "Escrow closed."
            ),
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

        # Pre-compute per-milestone fees so the UI can show the breakdown
        # without re-implementing the calc client-side.
        milestone_payload = []
        for m in escrow.milestones:
            m_fees = calc_commission(m.amount, currency=escrow.currency).to_dict()
            milestone_payload.append({
                "milestone_id": m.milestone_id,
                "title": m.title,
                "amount": m.amount,
                "status": m.status,
                "funded_at": m.funded_at,
                "released_at": m.released_at,
                "refunded_at": m.refunded_at,
                "release_transaction_id": m.release_transaction_id,
                "deadline_id": m.deadline_id,
                "fees": m_fees,
            })

        # Whole-escrow fee summary (sum of per-milestone fees).
        client_fee_total = round(sum(m["fees"]["client_fee"] for m in milestone_payload), 2)
        creator_fee_total = round(sum(m["fees"]["creator_fee"] for m in milestone_payload), 2)
        client_charge_total = round(escrow.total_amount + client_fee_total, 2)
        creator_payout_total = round(escrow.total_amount - creator_fee_total, 2)

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
            "milestones": milestone_payload,
            "fees_summary": {
                "subtotal": escrow.total_amount,
                "client_fee_total": client_fee_total,
                "creator_fee_total": creator_fee_total,
                "platform_take_total": round(client_fee_total + creator_fee_total, 2),
                "client_charge_total": client_charge_total,
                "creator_payout_total": creator_payout_total,
                "commission_version": getattr(settings, "COMM_VERSION", "v1.split.8_4"),
            },
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
                "job_post_id": str(e.job_post_id) if e.job_post_id else None,
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