"""
Payout Service
==============
Creator balance accounting and self-service PayPal withdrawals.

Balance model
-------------
available = earned(completed inbound) − withdrawn(pending+processing+completed)

  earned     : Transaction.type in {payment, bonus, team_split}
               status == completed, to_user_id == creator → sum(net_amount)
  withdrawn  : Transaction.type == withdrawal
               from_user_id == creator, status in {pending, processing, completed}
               → sum(amount)

A failed withdrawal is NOT counted, so a rejected PayPal payout automatically
returns the funds to the available balance.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any, Dict

from beanie import PydanticObjectId
from fastapi import HTTPException

from app.core.config import settings
from app.models.schema import User, Transaction, TransactionMetadata
from app.services import paypal_service
from app.services import stripe_connect_service

logger = logging.getLogger(__name__)

_EARNING_TYPES = ["payment", "bonus", "team_split"]
_WITHDRAWN_STATUSES = ["pending", "processing", "completed"]


async def get_balance(user_id: PydanticObjectId) -> Dict[str, Any]:
    """Return earned / withdrawn / available figures for a creator."""
    earned_agg = await Transaction.aggregate([
        {"$match": {"to_user_id": user_id, "status": "completed",
                    "type": {"$in": _EARNING_TYPES}}},
        {"$group": {"_id": None, "total": {"$sum": "$net_amount"}}},
    ]).to_list()
    earned = round(earned_agg[0]["total"], 2) if earned_agg else 0.0

    withdrawn_agg = await Transaction.aggregate([
        {"$match": {"from_user_id": user_id, "type": "withdrawal",
                    "status": {"$in": _WITHDRAWN_STATUSES}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list()
    withdrawn = round(withdrawn_agg[0]["total"], 2) if withdrawn_agg else 0.0

    available = round(earned - withdrawn, 2)
    return {
        "earned": earned,
        "withdrawn": withdrawn,
        "available": max(0.0, available),
        "currency": "USD",
        "min_withdrawal": settings.PAYOUT_MIN_AMOUNT,
        "payouts_enabled": paypal_service.is_enabled(),
    }


async def _withdrawn_total(user_id: PydanticObjectId) -> float:
    agg = await Transaction.aggregate([
        {"$match": {"from_user_id": user_id, "type": "withdrawal",
                    "status": {"$in": _WITHDRAWN_STATUSES}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list()
    return round(agg[0]["total"], 2) if agg else 0.0


async def request_withdrawal(user: User, amount: float, method: str = "paypal") -> Dict[str, Any]:
    """
    Creator withdraws `amount` (USD) to their chosen destination.

    method = "paypal"  → PayPal Payout from the platform PayPal balance.
    method = "stripe"  → Stripe Connect transfer from the platform Stripe balance
                         to the creator's connected account (then to their bank).

    Flow (fail-safe ordering, shared across methods):
      1. Validate the method's config/destination, amount, and available balance.
      2. Reserve the funds by inserting a withdrawal Transaction (processing).
      3. Re-check the post-write withdrawn total to defeat concurrent requests;
         roll back and 409 if we just oversubscribed the balance.
      4. Send via the provider. Mark completed on success, failed on rejection
         (which frees the reserved funds again).
    """
    method = (method or "paypal").lower()
    if method not in ("paypal", "stripe"):
        raise HTTPException(status_code=400, detail="Unknown payout method.")

    # ── Per-method preconditions / destination ──────────────────────────────
    if method == "paypal":
        if not paypal_service.is_enabled():
            raise HTTPException(status_code=503, detail="PayPal payouts are not enabled yet.")
        if not user.paypal_payout_email:
            raise HTTPException(status_code=400, detail="Add your PayPal email before withdrawing.")
        destination_label = user.paypal_payout_email
    else:
        if not stripe_connect_service.is_enabled():
            raise HTTPException(status_code=503, detail="Bank payouts are not enabled yet.")
        if not getattr(user, "stripe_account_id", None):
            raise HTTPException(status_code=400, detail="Connect your bank before withdrawing.")
        # Confirm the connected account can actually receive payouts (live check).
        status = stripe_connect_service.get_account_status(user.stripe_account_id)
        if not status["payouts_enabled"]:
            raise HTTPException(status_code=400, detail="Finish connecting your bank before withdrawing.")
        destination_label = "your bank (via Stripe)"

    amount = round(float(amount), 2)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0.")
    if amount < settings.PAYOUT_MIN_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum withdrawal is ${settings.PAYOUT_MIN_AMOUNT:.2f}.",
        )

    balance = await get_balance(user.id)
    if amount > balance["available"]:
        raise HTTPException(
            status_code=400,
            detail=f"Amount exceeds your available balance of ${balance['available']:.2f}.",
        )

    # Block overlapping in-flight withdrawals for the same creator.
    inflight = await Transaction.find({
        "from_user_id": user.id, "type": "withdrawal",
        "status": {"$in": ["pending", "processing"]},
    }).count()
    if inflight:
        raise HTTPException(status_code=409, detail="You already have a withdrawal in progress.")

    now = datetime.utcnow()
    tx_id = str(uuid.uuid4())

    # 2. Reserve funds.
    txn = Transaction(
        transaction_id=tx_id,
        from_user_id=user.id,
        to_user_id=None,                      # leaving the platform
        type="withdrawal",
        amount=amount,
        net_amount=amount,
        currency="USD",
        status="processing",
        payment_method=method,
        payment_provider=method,
        initiated_at=now,
        metadata=TransactionMetadata(
            description=f"Withdrawal to {destination_label}",
        ),
    )
    await txn.insert()

    # 3. Concurrency re-check: if the reservation pushed total withdrawn past
    #    earned, a parallel request raced us — undo and abort.
    earned = balance["earned"]
    if await _withdrawn_total(user.id) > earned + 0.001:
        await txn.delete()
        raise HTTPException(status_code=409, detail="Concurrent withdrawal detected. Please retry.")

    # 4. Send via the chosen provider.
    try:
        if method == "paypal":
            result = await paypal_service.send_payout(
                receiver_email=user.paypal_payout_email,
                amount=amount,
                currency="USD",
                sender_batch_id=f"SC-{tx_id}",
                sender_item_id=tx_id,
            )
        else:
            result = stripe_connect_service.create_transfer(
                account_id=user.stripe_account_id,
                amount=amount,
                idempotency_key=f"payout_{tx_id}",
            )
    except Exception as e:
        # Transport/unknown error — leave as processing for manual reconciliation
        # rather than silently freeing funds that may have been sent.
        logger.exception("Payout transport error (%s) for txn %s", method, tx_id)
        txn.failure_reason = f"transport_error: {e}"[:300]
        await txn.save()
        raise HTTPException(status_code=502, detail="Could not reach the payment provider. Your balance is unchanged; please retry shortly.")

    if result.get("ok"):
        ext_id = result.get("batch_id") or result.get("transfer_id")
        txn.status = "completed"
        txn.processed_at = now
        txn.completed_at = datetime.utcnow()
        txn.external_transaction_id = ext_id
        await txn.save()
        dest = user.paypal_payout_email if method == "paypal" else "your bank account"
        return {
            "success": True,
            "transaction_id": tx_id,
            "amount": amount,
            "method": method,
            "destination": dest,
            "external_id": ext_id,
            "status": "completed",
            "message": (f"${amount:.2f} is on its way to {dest}."
                        if method == "paypal"
                        else f"${amount:.2f} is on its way to your bank (1–2 business days)."),
        }

    # Rejected by the provider → mark failed (frees the reserved funds).
    txn.status = "failed"
    txn.failure_reason = str(result.get("error"))[:300]
    await txn.save()
    raise HTTPException(status_code=502, detail=f"Payout was rejected: {result.get('error')}")
