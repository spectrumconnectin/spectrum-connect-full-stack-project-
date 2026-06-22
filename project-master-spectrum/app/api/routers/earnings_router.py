"""
Earnings Router — Creator income, transactions, and payout stats.

Uses the Transaction model (schema.py).
  - to_user_id   → who received the money (creator)
  - from_user_id → who paid (client)
  - type         : payment | withdrawal | refund | subscription | bonus | team_split
  - status       : pending | processing | completed | failed | refunded | cancelled
"""

import re

from fastapi import APIRouter, Depends, Query, Request, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.models.schema import User, Transaction
from app.auth.auth import get_current_user
from app.core.rate_limit import rate_limiter
from app.services import payout_service
from app.services.audit_service import log_event

router = APIRouter(prefix="/earnings", tags=["Earnings"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _fmt_txn(t: Transaction) -> dict:
    # New fee fields default to 0 when the Transaction was written before the
    # commission rollout, keeping historical reads safe.
    return {
        "id": str(t.id),
        "transaction_id": t.transaction_id,
        "type": t.type,
        "amount": t.amount,
        "net_amount": t.net_amount,
        "platform_fee": t.platform_fee,
        "creator_fee": getattr(t, "creator_fee", 0.0) or 0.0,
        "client_fee": getattr(t, "client_fee", 0.0) or 0.0,
        "commission_version": getattr(t, "commission_version", None),
        "currency": t.currency,
        "status": t.status,
        "payment_method": t.payment_method,
        "from_user_id": str(t.from_user_id) if t.from_user_id else None,
        "initiated_at": t.initiated_at.isoformat() if t.initiated_at else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "description": t.metadata.description if t.metadata else None,
        "project_title": t.metadata.project_title if t.metadata else None,
        "milestone_title": t.metadata.milestone_title if t.metadata else None,
    }


@router.get("/me", summary="Get creator's earning transactions")
async def get_my_earnings(
    status: Optional[str] = Query(None, description="Filter by status: completed, pending, processing, failed"),
    type: Optional[str] = Query(None, description="Filter by type: payment, withdrawal, refund, bonus"),
    limit: int = Query(40, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id

    # Build raw query — transactions received by this user
    raw_filter: dict = {"to_user_id": uid}
    if status:
        raw_filter["status"] = status
    if type:
        raw_filter["type"] = type

    txns = (
        await Transaction.find(raw_filter)
        .sort(-Transaction.initiated_at)
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    return [_fmt_txn(t) for t in txns]


@router.get("/stats", summary="Get creator's earnings summary stats")
async def get_earnings_stats(
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    six_months_ago = now.replace(day=1) - __import__("datetime").timedelta(days=5 * 30)

    # Use aggregation pipeline — one DB round-trip instead of loading all transactions
    pipeline = [
        {"$match": {"to_user_id": uid}},
        {"$group": {
            "_id": None,
            "total_earned":       {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, "$net_amount", 0]}},
            "pending":            {"$sum": {"$cond": [{"$in": ["$status", ["pending", "processing"]]}, "$net_amount", 0]}},
            "this_month":         {"$sum": {"$cond": [
                {"$and": [{"$eq": ["$status", "completed"]}, {"$gte": ["$initiated_at", month_start]}]},
                "$net_amount", 0
            ]}},
            "transaction_count":  {"$sum": 1},
        }},
    ]
    agg = await Transaction.aggregate(pipeline).to_list()
    if agg:
        total_earned       = round(agg[0].get("total_earned", 0), 2)
        pending            = round(agg[0].get("pending", 0), 2)
        this_month         = round(agg[0].get("this_month", 0), 2)
        transaction_count  = int(agg[0].get("transaction_count", 0))
    else:
        total_earned = pending = this_month = 0.0
        transaction_count = 0

    # Monthly breakdown for chart — aggregate per month label
    monthly_pipeline = [
        {"$match": {"to_user_id": uid, "status": "completed", "initiated_at": {"$gte": six_months_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%b", "date": "$initiated_at"}},
            "amount": {"$sum": "$net_amount"},
        }},
        {"$sort": {"_id": 1}},
    ]
    monthly_raw = await Transaction.aggregate(monthly_pipeline).to_list()
    monthly_map = {r["_id"]: round(r["amount"], 2) for r in monthly_raw}

    # Ensure all 6 months are represented (even empty ones)
    monthly_breakdown = []
    for i in range(5, -1, -1):
        import datetime as _dt_mod
        month_dt = now.replace(day=1) - _dt_mod.timedelta(days=i * 30)
        key = month_dt.strftime("%b")
        monthly_breakdown.append({"month": key, "amount": monthly_map.get(key, 0.0)})

    return {
        "total_earned":      total_earned,
        "pending":           pending,
        "this_month":        this_month,
        "monthly_breakdown": monthly_breakdown,
        "transaction_count": transaction_count,
    }


# ── Payouts (self-service PayPal withdrawals) ───────────────────────────────

class PayoutMethodUpdate(BaseModel):
    paypal_email: str


class WithdrawRequest(BaseModel):
    amount: float


@router.get("/balance", summary="Creator's withdrawable balance")
async def get_balance(current_user: User = Depends(get_current_user)):
    """Available balance plus the saved PayPal email and payout config state."""
    bal = await payout_service.get_balance(current_user.id)
    bal["paypal_email"] = current_user.paypal_payout_email
    return bal


@router.get("/payout-method", summary="Get saved PayPal payout email")
async def get_payout_method(current_user: User = Depends(get_current_user)):
    return {
        "paypal_email": current_user.paypal_payout_email,
        "payouts_enabled": payout_service.paypal_service.is_enabled(),
    }


@router.post("/payout-method", summary="Save/update PayPal payout email")
async def set_payout_method(
    body: PayoutMethodUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(rate_limiter("payout_method", limit=10, window_seconds=300)),
):
    email = (body.paypal_email or "").strip().lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid PayPal email address.")
    current_user.paypal_payout_email = email
    await current_user.save()
    await log_event(
        "payout.method_updated", actor=current_user, target_type="user",
        target_id=str(current_user.id), request=request,
        metadata={"paypal_email": email}, severity="info",
    )
    return {"success": True, "paypal_email": email}


@router.post("/withdraw", summary="Withdraw earnings to PayPal")
async def withdraw(
    body: WithdrawRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(rate_limiter("payout_withdraw", limit=5, window_seconds=300)),
):
    """Send the requested amount from the creator's available balance to their
    saved PayPal account. See payout_service for the full fail-safe flow."""
    result = await payout_service.request_withdrawal(current_user, body.amount)
    await log_event(
        "payout.withdrawn", actor=current_user, target_type="transaction",
        target_id=result.get("transaction_id"), request=request,
        metadata={"amount": result.get("amount"), "paypal_email": result.get("paypal_email"),
                  "batch_id": result.get("batch_id")},
        severity="warning",
    )
    return result


@router.get("/invoice/csv", summary="Download earnings report as CSV")
async def download_earnings_csv(
    current_user: User = Depends(get_current_user),
):
    """
    Download a CSV earnings report for the authenticated creator.
    Includes all completed transactions with amounts and fee breakdowns.
    Returns a text/csv response for direct browser download.
    """
    uid = current_user.id
    txns = (
        await Transaction.find({"to_user_id": uid, "status": "completed"})
        .sort(-Transaction.initiated_at)
        .to_list()
    )

    rows = [
        "Date,Transaction ID,Project,Milestone,Gross Amount,Platform Fee (8%),Net Payout,Currency"
    ]
    for t in txns:
        date_str = t.completed_at.strftime("%Y-%m-%d") if t.completed_at else (t.initiated_at.strftime("%Y-%m-%d") if t.initiated_at else "")
        project = (t.metadata.project_title if t.metadata and t.metadata.project_title else "").replace(",", " ")
        milestone = (t.metadata.milestone_title if t.metadata and t.metadata.milestone_title else "").replace(",", " ")
        creator_fee = getattr(t, "creator_fee", 0.0) or 0.0
        rows.append(
            f'{date_str},{t.transaction_id},{project},{milestone},'
            f'{t.amount:.2f},{creator_fee:.2f},{t.net_amount:.2f},{t.currency}'
        )

    now_str = datetime.utcnow().strftime("%Y%m%d")
    filename = f"spectrum_earnings_{now_str}.csv"
    return PlainTextResponse(
        content="\n".join(rows),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/invoice/client-csv", summary="Download client payment report as CSV")
async def download_client_payments_csv(
    current_user: User = Depends(get_current_user),
):
    """
    Download a CSV payment report for the authenticated client.
    Includes all payments made, with fee breakdowns.
    """
    uid = current_user.id
    txns = (
        await Transaction.find({"from_user_id": uid, "status": "completed"})
        .sort(-Transaction.initiated_at)
        .to_list()
    )

    rows = [
        "Date,Transaction ID,Project,Milestone,Project Amount,Platform Fee (4%),Total Charged,Currency"
    ]
    for t in txns:
        date_str = t.completed_at.strftime("%Y-%m-%d") if t.completed_at else (t.initiated_at.strftime("%Y-%m-%d") if t.initiated_at else "")
        project = (t.metadata.project_title if t.metadata and t.metadata.project_title else "").replace(",", " ")
        milestone = (t.metadata.milestone_title if t.metadata and t.metadata.milestone_title else "").replace(",", " ")
        client_fee = getattr(t, "client_fee", 0.0) or 0.0
        client_total = round(t.amount + client_fee, 2)
        rows.append(
            f'{date_str},{t.transaction_id},{project},{milestone},'
            f'{t.amount:.2f},{client_fee:.2f},{client_total:.2f},{t.currency}'
        )

    now_str = datetime.utcnow().strftime("%Y%m%d")
    filename = f"spectrum_payments_{now_str}.csv"
    return PlainTextResponse(
        content="\n".join(rows),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
