"""
Earnings Router — Creator income, transactions, and payout stats.

Uses the Transaction model (schema.py).
  - to_user_id   → who received the money (creator)
  - from_user_id → who paid (client)
  - type         : payment | withdrawal | refund | subscription | bonus | team_split
  - status       : pending | processing | completed | failed | refunded | cancelled
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from typing import Optional
from bson import ObjectId
from datetime import datetime

from app.models.schema import User, Transaction
from app.auth.auth import get_current_user

router = APIRouter(prefix="/earnings", tags=["Earnings"])


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

    all_txns = await Transaction.find({"to_user_id": uid}).to_list()

    total_earned  = sum(t.net_amount for t in all_txns if t.status == "completed")
    pending       = sum(t.net_amount for t in all_txns if t.status in ("pending", "processing"))
    this_month_txns = [
        t for t in all_txns
        if t.status == "completed" and t.initiated_at and t.initiated_at.month == __import__("datetime").datetime.utcnow().month
    ]
    this_month = sum(t.net_amount for t in this_month_txns)

    # Monthly breakdown for chart (last 6 months)
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    monthly: dict[str, float] = {}
    for i in range(5, -1, -1):
        month_dt = now.replace(day=1) - timedelta(days=i * 30)
        key = month_dt.strftime("%b")
        monthly[key] = 0.0

    for t in all_txns:
        if t.status == "completed" and t.initiated_at:
            age = (now - t.initiated_at).days
            if age <= 180:
                key = t.initiated_at.strftime("%b")
                monthly[key] = monthly.get(key, 0.0) + t.net_amount

    return {
        "total_earned": round(total_earned, 2),
        "pending": round(pending, 2),
        "this_month": round(this_month, 2),
        "monthly_breakdown": [{"month": m, "amount": round(v, 2)} for m, v in monthly.items()],
        "transaction_count": len(all_txns),
    }


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
