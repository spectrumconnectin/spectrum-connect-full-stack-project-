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
    result = {
        "earned": earned,
        "withdrawn": withdrawn,
        "available": max(0.0, available),
        "currency": "USD",
        "min_withdrawal": settings.PAYOUT_MIN_AMOUNT,
        "payouts_enabled": paypal_service.is_enabled(),
    }

    # What the available balance is actually worth to this creator in their own
    # currency, honouring the rates their projects were locked at. Shown so a
    # creator paid in LKR sees the figure they will receive rather than a USD
    # number they have to convert in their head.
    user = await User.get(user_id)
    payout_ccy = (getattr(user, "bank_currency", None)
                  or getattr(user, "preferred_currency", None)) if user else None

    if payout_ccy and payout_ccy.upper() != "USD" and result["available"] > 0:
        quote = await payout_amount_for(user_id, result["available"], payout_ccy)
        if quote.get("ok"):
            result["payout_currency"] = quote["currency"]
            result["payout_available"] = quote["amount"]
            result["payout_fully_locked"] = quote["fully_locked"]
            result["payout_blended_rate"] = quote["blended_rate"]

    return result


async def locked_rate_profile(
    user_id: PydanticObjectId,
    target_currency: str,
) -> Dict[str, Any]:
    """How much of a creator's earnings were locked to a project rate.

    A creator shown "you earned $500, which is LKR 165,000" must receive that
    LKR figure, not whatever the rate happens to be on the day they cash out.
    Each earning carries its own locked rate, so what matters for a withdrawal
    is the mix.

    Returns two ratios taken over *earnings*, which stay valid however much has
    since been withdrawn, because a withdrawal draws down the balance
    proportionally:

      locked_share  — the fraction of earnings that carry a locked rate
      blended_rate  — target currency per 1 USD across those locked earnings

    Applying them to any withdrawal amount pays out exactly the locked total
    once the balance is fully drawn, with no per-earning drawdown ledger to
    keep in step.
    """
    agg = await Transaction.aggregate([
        {"$match": {
            "to_user_id": user_id, "status": "completed",
            "type": {"$in": _EARNING_TYPES},
            "payout_currency": target_currency.upper(),
            "payout_currency_amount": {"$gt": 0},
        }},
        {"$group": {
            "_id": None,
            "usd": {"$sum": "$net_amount"},
            "target": {"$sum": "$payout_currency_amount"},
        }},
    ]).to_list()

    total_agg = await Transaction.aggregate([
        {"$match": {"to_user_id": user_id, "status": "completed",
                    "type": {"$in": _EARNING_TYPES}}},
        {"$group": {"_id": None, "usd": {"$sum": "$net_amount"}}},
    ]).to_list()

    locked_usd = round(agg[0]["usd"], 2) if agg else 0.0
    locked_target = round(agg[0]["target"], 2) if agg else 0.0
    total_usd = round(total_agg[0]["usd"], 2) if total_agg else 0.0

    return {
        "currency": target_currency.upper(),
        "locked_usd": locked_usd,
        "locked_target": locked_target,
        # Share of all earnings that carry a locked rate. Earnings without one
        # (older projects, or projects priced in the creator's own currency)
        # convert live instead.
        "locked_share": (locked_usd / total_usd) if total_usd > 0 else 0.0,
        "blended_rate": (locked_target / locked_usd) if locked_usd > 0 else None,
    }


async def payout_amount_for(
    user_id: PydanticObjectId,
    usd_amount: float,
    target_currency: str,
) -> Dict[str, Any]:
    """Work out what a creator actually receives for a USD withdrawal.

    The locked portion is paid at the rate they were promised; anything not
    locked converts at today's rate.
    """
    from app.services import fx_service

    profile = await locked_rate_profile(user_id, target_currency)
    target = target_currency.upper()

    locked_usd_part = usd_amount * profile["locked_share"]
    unlocked_usd_part = usd_amount - locked_usd_part

    locked_target_part = (
        locked_usd_part * profile["blended_rate"] if profile["blended_rate"] else 0.0
    )

    live_rate = None
    unlocked_target_part = 0.0
    if unlocked_usd_part > 0.005:
        live_rate = await fx_service.rate_for("USD", target)
        if live_rate is None:
            # Without a rate we cannot say what the unlocked part is worth, and
            # guessing would mispay. Report it so the caller can refuse rather
            # than quietly underpay.
            return {"ok": False, "reason": "no_rate", "currency": target}
        unlocked_target_part = unlocked_usd_part * live_rate

    total_target = fx_service.round_money(locked_target_part + unlocked_target_part, target)

    return {
        "ok": True,
        "currency": target,
        "amount": total_target,
        "locked_usd": round(locked_usd_part, 2),
        "locked_amount": fx_service.round_money(locked_target_part, target),
        "unlocked_usd": round(unlocked_usd_part, 2),
        "unlocked_amount": fx_service.round_money(unlocked_target_part, target),
        "blended_rate": profile["blended_rate"],
        "live_rate": live_rate,
        # True when every dollar being withdrawn was locked to a project rate,
        # so the figure is exactly what the creator was promised.
        "fully_locked": profile["locked_share"] >= 0.9999,
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
    if method not in ("paypal", "stripe", "airwallex"):
        raise HTTPException(status_code=400, detail="Unknown payout method.")

    # ── Per-method preconditions / destination ──────────────────────────────
    if method == "paypal":
        if not paypal_service.is_enabled():
            raise HTTPException(status_code=503, detail="PayPal payouts are not enabled yet.")
        if not user.paypal_payout_email:
            raise HTTPException(status_code=400, detail="Add your PayPal email before withdrawing.")
        destination_label = user.paypal_payout_email
    elif method == "airwallex":
        from app.services import airwallex_service
        if not airwallex_service.is_enabled():
            raise HTTPException(status_code=503, detail="Bank transfers are not enabled yet.")
        if not getattr(user, "airwallex_beneficiary_id", None):
            raise HTTPException(
                status_code=400,
                detail="Add your bank details before withdrawing.",
            )
        destination_label = (
            f"{user.bank_name or 'your bank'} {user.bank_account_masked or ''}".strip()
        )
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

    # Preflight the platform balance for bank payouts. A Stripe transfer draws
    # from the balance held in the payout currency — Stripe will not convert a
    # EUR balance to settle a USD transfer. Without this the transfer fails
    # *after* the creator's funds have been reserved, and they see a raw Stripe
    # error. Checking first leaves their balance untouched and says something
    # they can act on. A balance we cannot read is not treated as empty: a
    # failed status call must not block an otherwise valid payout.
    if method == "stripe":
        pb = stripe_connect_service.platform_balance()
        if pb.get("ok") and pb["available"] < amount:
            logger.error(
                "Bank payout blocked — platform holds %.2f %s (currencies held: %s), "
                "need %.2f. Check STRIPE_PAYOUT_CURRENCY matches a funded balance.",
                pb["available"], pb["currency"], pb.get("held_currencies"), amount,
            )
            raise HTTPException(
                status_code=503,
                detail=(
                    "Bank payouts are temporarily unavailable. Your balance is safe — "
                    "use PayPal, or try again shortly."
                ),
            )

    now = datetime.utcnow()
    tx_id = str(uuid.uuid4())

    # 2. Reserve funds.
    # Work out what the creator receives in their own currency before any money
    # moves, so the figure is recorded on the withdrawal itself and a failure to
    # price it stops the payout rather than silently converting at today's rate.
    payout_quote = None
    target_ccy = (user.bank_currency or "").upper() if method == "airwallex" else ""
    if target_ccy and target_ccy != "USD":
        payout_quote = await payout_amount_for(user.id, amount, target_ccy)
        if not payout_quote.get("ok"):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Exchange rates are unavailable right now, so we can't confirm "
                    "what you'd receive. Your balance is unchanged — try again shortly."
                ),
            )

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
        # What was actually sent to their bank, and at what blended rate — the
        # record a creator's "why did I receive this much?" question is answered
        # from months later.
        payout_currency=payout_quote["currency"] if payout_quote else None,
        payout_currency_amount=payout_quote["amount"] if payout_quote else None,
        payout_fx_rate=(
            (payout_quote["amount"] / amount) if payout_quote and amount else None
        ),
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
        elif method == "airwallex":
            from app.services import airwallex_service
            if payout_quote:
                # We know exactly what this creator is owed in their currency,
                # because their earnings were locked to project rates. Pay that
                # figure and let the platform absorb what it costs to send —
                # this number is genuinely in their currency, which is what
                # makes payment_amount the right form here.
                result = await airwallex_service.create_transfer(
                    beneficiary_id=user.airwallex_beneficiary_id,
                    payment_amount=payout_quote["amount"],
                    idempotency_key=f"payout_{tx_id}",
                    source_currency="USD",
                    target_currency=payout_quote["currency"],
                )
            else:
                # Nothing was promised at a locked rate, so debit the USD and
                # let Airwallex convert at its rate on the day.
                result = await airwallex_service.create_transfer(
                    beneficiary_id=user.airwallex_beneficiary_id,
                    source_amount=amount,
                    idempotency_key=f"payout_{tx_id}",
                    source_currency="USD",
                    target_currency=(user.bank_currency or "LKR"),
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
        dest = destination_label or (
            user.paypal_payout_email if method == "paypal" else "your bank account"
        )
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
