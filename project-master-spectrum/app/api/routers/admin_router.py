"""
Admin Router
============
All endpoints are protected by get_admin_user (role: admin | moderator).

Endpoints
---------
GET  /admin/stats                    Platform-wide metrics
GET  /admin/users                    Paginated user list with filters
GET  /admin/users/{user_id}          Full user detail
PATCH /admin/users/{user_id}/role    Change user_role
PATCH /admin/users/{user_id}/suspend Suspend account
PATCH /admin/users/{user_id}/activate Reactivate account
PATCH /admin/users/{user_id}/verify  Toggle is_verified
GET  /admin/jobs                     All job postings
PATCH /admin/jobs/{job_id}/status    Change job status
GET  /admin/disputes                 All disputes
GET  /admin/transactions             All escrow transactions
GET  /admin/etf/stats                ETF points summary
GET  /admin/revenue                  Platform revenue breakdown (fees by month/project)
POST /admin/notifications/send       Broadcast notification to users (all/clients/creators/custom)
GET  /admin/notifications/history    List last 100 admin-sent notifications
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth.auth import get_admin_user
from app.models.schema import User


def _safe_regex(raw: str) -> str:
    """Escape user input before embedding in a MongoDB $regex to prevent ReDoS."""
    return re.escape(raw[:200])

router = APIRouter(prefix="/admin", tags=["Admin Panel"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_summary(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "username": u.username,
        "account_type": u.account_type,
        "user_role": u.user_role,
        "is_verified": u.is_verified,
        "is_active": getattr(u, "is_active", True),
        "created_at": u.id.generation_time.isoformat() if u.id else None,
        "display_name": (u.profile.display_name or "") if u.profile else "",
        "profile_picture": (u.profile.profile_picture or "") if u.profile else "",
        "trust_score": u.spectrum_id.trust_score if u.spectrum_id else 0,
        "trust_tier": u.spectrum_id.tier if u.spectrum_id else "bronze",
    }


# ── Platform Stats ─────────────────────────────────────────────────────────────

@router.get("/stats", summary="Platform-wide metrics")
async def get_platform_stats(admin: User = Depends(get_admin_user)):
    """Return headline metrics for the admin dashboard."""
    from app.models.etf_points import EtfPoints

    # User counts — use DB-level count queries instead of loading all documents.
    import asyncio as _aio
    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        # New-user cutoff is encoded in ObjectId generation time; use a filter
        # on _id >= ObjectId.from_datetime(thirty_days_ago) if supported, else count docs.
        (
            total_users,
            creators,
            clients,
            admins,
            verified,
            suspended,
        ) = await _aio.gather(
            User.find().count(),
            User.find({"account_type": {"$in": ["crew", "both"]}}).count(),
            User.find({"account_type": {"$in": ["producer", "both"]}}).count(),
            User.find({"user_role": {"$in": ["admin", "moderator"]}}).count(),
            User.find({"is_verified": True}).count(),
            User.find({"is_active": False}).count(),
        )
        # Approximate new-user count via ObjectId timestamp prefix
        from bson import ObjectId as _BsonOID
        cutoff_id = _BsonOID.from_datetime(thirty_days_ago)
        new_users_30d = await User.find({"_id": {"$gte": cutoff_id}}).count()
    except Exception:
        total_users = creators = clients = admins = verified = suspended = new_users_30d = 0

    # Financial stats — use MongoDB aggregation pipeline to sum amounts server-side.
    try:
        from app.models.schema import Transaction as TxModel
        from app.models.escrow import Escrow as EscrowModel

        # Aggregate sums in one round-trip instead of loading all transactions
        pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {
                "_id": None,
                "total_volume":    {"$sum": "$amount"},
                "total_fees":      {"$sum": "$platform_fee"},
                "client_fee_usd":  {"$sum": "$client_fee"},
                "creator_fee_usd": {"$sum": "$creator_fee"},
            }},
        ]
        agg_result = await TxModel.get_pymongo_collection().aggregate(pipeline).to_list(None)
        if agg_result:
            total_volume    = round(agg_result[0].get("total_volume",    0), 2)
            total_fees      = round(agg_result[0].get("total_fees",      0), 2)
            client_fee_usd  = round(agg_result[0].get("client_fee_usd",  0), 2)
            creator_fee_usd = round(agg_result[0].get("creator_fee_usd", 0), 2)
        else:
            total_volume = total_fees = client_fee_usd = creator_fee_usd = 0.0

        # Escrow status counts
        active_escrow, completed_escrow, disputed_escrow = await _aio.gather(
            EscrowModel.find({"status": {"$in": ["active", "funded", "in_progress"]}}).count(),
            EscrowModel.find({"status": "completed"}).count(),
            EscrowModel.find({"status": "disputed"}).count(),
        )
    except Exception:
        total_volume = active_escrow = completed_escrow = disputed_escrow = 0
        total_fees = client_fee_usd = creator_fee_usd = 0

    # ETF stats — aggregate in DB
    try:
        etf_pipeline = [
            {"$group": {
                "_id": None,
                "total_lifetime": {"$sum": "$lifetime_points"},
                "platinum_users": {"$sum": {"$cond": [{"$eq": ["$level", "platinum"]}, 1, 0]}},
                "gold_users":     {"$sum": {"$cond": [{"$eq": ["$level", "gold"]},     1, 0]}},
            }}
        ]
        etf_result = await EtfPoints.get_pymongo_collection().aggregate(etf_pipeline).to_list(None)
        if etf_result:
            total_points_awarded = int(etf_result[0].get("total_lifetime", 0))
            platinum_users       = int(etf_result[0].get("platinum_users", 0))
            gold_users           = int(etf_result[0].get("gold_users",     0))
        else:
            total_points_awarded = platinum_users = gold_users = 0
    except Exception:
        total_points_awarded = platinum_users = gold_users = 0

    return {
        "users": {
            "total": total_users,
            "creators": creators,
            "clients": clients,
            "admins": admins,
            "verified": verified,
            "suspended": suspended,
            "new_last_30_days": new_users_30d,
        },
        "escrow": {
            "total_volume_usd": total_volume,
            "platform_fees_usd": total_fees,
            "client_fee_usd": client_fee_usd,
            "creator_fee_usd": creator_fee_usd,
            "active_count": active_escrow,
            "completed_count": completed_escrow,
            "disputed_count": disputed_escrow,
        },
        "etf": {
            "total_points_awarded": total_points_awarded,
            "platinum_users": platinum_users,
            "gold_users": gold_users,
        },
    }


# ── User Management ────────────────────────────────────────────────────────────

@router.get("/users", summary="List all users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    account_type: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None),
    is_verified: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(None),
    admin: User = Depends(get_admin_user),
):
    # Build DB-level filter dict — push filtering to MongoDB instead of loading
    # all users into memory (which is a DoS risk as the user base grows).
    raw_filter: dict = {}
    if search:
        safe_search = _safe_regex(search)
        raw_filter["$or"] = [
            {"email": {"$regex": safe_search, "$options": "i"}},
            {"username": {"$regex": safe_search, "$options": "i"}},
            {"profile.display_name": {"$regex": safe_search, "$options": "i"}},
        ]
    if account_type:
        raw_filter["account_type"] = account_type
    if user_role:
        raw_filter["user_role"] = user_role
    if is_verified is not None:
        raw_filter["is_verified"] = is_verified
    if is_active is not None:
        raw_filter["is_active"] = is_active

    query = User.find(raw_filter)
    total = await query.count()

    start = (page - 1) * page_size
    page_users = (
        await query.sort([("_id", -1)]).skip(start).limit(page_size).to_list()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": start + page_size < total,
        "users": [_user_summary(u) for u in page_users],
    }


@router.get("/users/{user_id}", summary="Full user detail")
async def get_user_detail(user_id: str, admin: User = Depends(get_admin_user)):
    from bson import ObjectId
    try:
        u = await User.get(ObjectId(user_id))
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    detail = _user_summary(u)
    if u.profile:
        detail["profile"] = {
            "bio": u.profile.bio,
            "tagline": u.profile.tagline,
            "location": str(u.profile.location) if u.profile.location else None,
            "skills": [s.name for s in (u.profile.skills or [])],
            "hourly_rate_min": u.profile.hourly_rate_min,
            "hourly_rate_max": u.profile.hourly_rate_max,
            "portfolio_item_count": len(u.profile.portfolio_items or []),
        }
    return detail


class RoleUpdate(BaseModel):
    user_role: str  # user | admin | moderator


@router.patch("/users/{user_id}/role", summary="Change user role")
async def update_user_role(user_id: str, body: RoleUpdate, admin: User = Depends(get_admin_user)):
    if body.user_role not in {"user", "admin", "moderator"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid role")
    from bson import ObjectId
    u = await User.get(ObjectId(user_id))
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    u.user_role = body.user_role
    await u.save()
    return {"id": user_id, "user_role": u.user_role}


@router.patch("/users/{user_id}/suspend", summary="Suspend user account")
async def suspend_user(user_id: str, admin: User = Depends(get_admin_user)):
    from bson import ObjectId
    u = await User.get(ObjectId(user_id))
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if u.user_role in {"admin", "moderator"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot suspend another admin")
    # is_active is not on the User model — store via settings or skip if not supported
    if hasattr(u, "is_active"):
        u.is_active = False
        await u.save()

    # Immediately revoke presence so the banned user shows Offline everywhere
    try:
        from app.services.presence_service import PresenceService
        await PresenceService.set_offline(str(u.id))
    except Exception:
        pass

    return {"id": user_id, "is_active": False}


@router.patch("/users/{user_id}/activate", summary="Reactivate suspended user")
async def activate_user(user_id: str, admin: User = Depends(get_admin_user)):
    from bson import ObjectId
    u = await User.get(ObjectId(user_id))
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if hasattr(u, "is_active"):
        u.is_active = True
        await u.save()
    return {"id": user_id, "is_active": True}


@router.patch("/users/{user_id}/verify", summary="Toggle user verification")
async def toggle_verify_user(user_id: str, admin: User = Depends(get_admin_user)):
    from bson import ObjectId
    u = await User.get(ObjectId(user_id))
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    u.is_verified = not u.is_verified
    await u.save()
    return {"id": user_id, "is_verified": u.is_verified}


# ── Job/Project Management ─────────────────────────────────────────────────────

@router.get("/jobs", summary="List all job postings")
async def list_all_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    job_status: Optional[str] = Query(None, alias="status"),
    admin: User = Depends(get_admin_user),
):
    from app.models.schema import JobPost
    try:
        raw_filter: dict = {}
        if job_status:
            raw_filter["status"] = job_status
        if search:
            safe_search = _safe_regex(search)
            raw_filter["$or"] = [
                {"title": {"$regex": safe_search, "$options": "i"}},
                {"description": {"$regex": safe_search, "$options": "i"}},
            ]
        query = JobPost.find(raw_filter)
        total = await query.count()
        start = (page - 1) * page_size
        page_jobs = await query.sort([("_id", -1)]).skip(start).limit(page_size).to_list()
    except Exception:
        return {"total": 0, "page": page, "page_size": page_size, "has_more": False, "jobs": []}

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": start + page_size < total,
        "jobs": [
            {
                "id": str(j.id),
                "title": j.title,
                "status": j.status,
                "client_id": str(j.client_id),
                "department": j.department,
                "proposal_count": j.proposal_count,
                "created_at": j.id.generation_time.isoformat() if j.id else None,
            }
            for j in page_jobs
        ],
    }


class JobStatusUpdate(BaseModel):
    status: str  # open | closed | removed


@router.patch("/jobs/{job_id}/status", summary="Update job status (admin)")
async def update_job_status(job_id: str, body: JobStatusUpdate, admin: User = Depends(get_admin_user)):
    from app.models.schema import JobPost
    from bson import ObjectId
    j = await JobPost.get(ObjectId(job_id))
    if not j:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    j.status = body.status
    await j.save()
    return {"id": job_id, "status": j.status}


# ── Disputes ───────────────────────────────────────────────────────────────────

@router.get("/disputes", summary="List all disputes")
async def list_all_disputes(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    dispute_status: Optional[str] = Query(None, alias="status"),
    admin: User = Depends(get_admin_user),
):
    from app.models.escrow import Dispute as DisputeModel
    try:
        query = DisputeModel.find()
        if dispute_status:
            query = query.find(DisputeModel.status == dispute_status)
        total = await query.count()
        start = (page - 1) * page_size
        page_disputes = await query.sort(-DisputeModel.created_at).skip(start).limit(page_size).to_list()
    except Exception:
        return {"total": 0, "page": page, "page_size": page_size, "has_more": False, "disputes": []}

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": start + page_size < total,
        "disputes": [
            {
                "id": str(d.id),
                "escrow_id": str(d.escrow_id) if d.escrow_id else None,
                "status": d.status,
                "reason": d.reason,
                "raised_by": str(d.raised_by) if getattr(d, "raised_by", None) else None,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in page_disputes
        ],
    }


# ── Transactions ───────────────────────────────────────────────────────────────

@router.get("/transactions", summary="List all escrow transactions")
async def list_all_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    tx_status: Optional[str] = Query(None, alias="status"),
    admin: User = Depends(get_admin_user),
):
    from app.models.schema import Transaction as TxModel
    try:
        raw_filter: dict = {}
        if tx_status:
            raw_filter["status"] = tx_status
        query = TxModel.find(raw_filter)
        total = await query.count()
        start = (page - 1) * page_size
        page_tx = await query.sort(-TxModel.initiated_at).skip(start).limit(page_size).to_list()
    except Exception:
        return {"total": 0, "page": page, "page_size": page_size, "has_more": False, "transactions": []}

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": start + page_size < total,
        "transactions": [
            {
                "id": str(t.id),
                "status": t.status,
                "type": t.type,
                "amount": float(t.amount or 0),
                "currency": t.currency,
                "platform_fee": float(t.platform_fee or 0),
                "client_fee": float(t.client_fee or 0),
                "creator_fee": float(t.creator_fee or 0),
                "commission_version": t.commission_version,
                "client_id": str(t.from_user_id) if t.from_user_id else None,
                "creator_id": str(t.to_user_id) if t.to_user_id else None,
                "created_at": t.initiated_at.isoformat() if t.initiated_at else None,
            }
            for t in page_tx
        ],
    }


# ── ETF Stats ──────────────────────────────────────────────────────────────────

@router.get("/etf/stats", summary="ETF points platform summary")
async def get_etf_stats(admin: User = Depends(get_admin_user)):
    from app.models.etf_points import EtfPoints
    try:
        pipeline = [
            {"$group": {
                "_id": None,
                "total_accounts":  {"$sum": 1},
                "total_lifetime":  {"$sum": "$lifetime_points"},
                "total_redeemed":  {"$sum": "$redeemed_points"},
                "bronze":   {"$sum": {"$cond": [{"$eq": [{"$toLower": "$level"}, "bronze"]},   1, 0]}},
                "silver":   {"$sum": {"$cond": [{"$eq": [{"$toLower": "$level"}, "silver"]},   1, 0]}},
                "gold":     {"$sum": {"$cond": [{"$eq": [{"$toLower": "$level"}, "gold"]},     1, 0]}},
                "platinum": {"$sum": {"$cond": [{"$eq": [{"$toLower": "$level"}, "platinum"]}, 1, 0]}},
                "diamond":  {"$sum": {"$cond": [{"$eq": [{"$toLower": "$level"}, "diamond"]},  1, 0]}},
            }}
        ]
        result = await EtfPoints.get_pymongo_collection().aggregate(pipeline).to_list(None)
        if not result:
            return {"total_accounts": 0, "total_lifetime_points": 0, "total_redeemed_points": 0, "level_breakdown": {}}
        r = result[0]
        return {
            "total_accounts":        r.get("total_accounts", 0),
            "total_lifetime_points": int(r.get("total_lifetime", 0)),
            "total_redeemed_points": int(r.get("total_redeemed", 0)),
            "level_breakdown": {
                "bronze":   r.get("bronze",   0),
                "silver":   r.get("silver",   0),
                "gold":     r.get("gold",     0),
                "platinum": r.get("platinum", 0),
                "diamond":  r.get("diamond",  0),
            },
        }
    except Exception:
        return {}


# ── Revenue Reporting ──────────────────────────────────────────────────────────

@router.get("/revenue", summary="Platform revenue breakdown")
async def get_revenue_report(admin: User = Depends(get_admin_user)):
    """
    Detailed fee revenue report:
    - Monthly breakdown of client fees vs creator fees for the last 12 months
    - All-time totals
    - Top 10 projects by revenue
    - Current commission version / rate info
    """
    from app.models.schema import Transaction as TxModel
    from app.services.commission_service import DEFAULT_COMMISSION_VERSION

    # ── Monthly aggregation — done in DB with $group, not in Python ──────────
    try:
        monthly_pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m", "date": "$initiated_at"}},
                "client_fees":  {"$sum": "$client_fee"},
                "creator_fees": {"$sum": "$creator_fee"},
                "total_fees":   {"$sum": "$platform_fee"},
                "volume":       {"$sum": "$amount"},
                "count":        {"$sum": 1},
            }},
            {"$sort": {"_id": 1}},
        ]
        monthly_raw = await TxModel.get_pymongo_collection().aggregate(monthly_pipeline).to_list(None)
    except Exception:
        monthly_raw = []

    # Take last 12 months
    monthly_list = [
        {
            "month": r["_id"],
            "client_fees":  round(r.get("client_fees",  0), 2),
            "creator_fees": round(r.get("creator_fees", 0), 2),
            "total_fees":   round(r.get("total_fees",   0), 2),
            "volume":       round(r.get("volume",       0), 2),
            "count":        r.get("count", 0),
        }
        for r in monthly_raw[-12:]
    ]

    # ── All-time totals — one aggregation query ───────────────────────────────
    try:
        totals_pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {
                "_id": None,
                "client_fees":    {"$sum": "$client_fee"},
                "creator_fees":   {"$sum": "$creator_fee"},
                "platform_total": {"$sum": "$platform_fee"},
                "volume":         {"$sum": "$amount"},
                "count":          {"$sum": 1},
            }},
        ]
        totals_raw = await TxModel.get_pymongo_collection().aggregate(totals_pipeline).to_list(None)
        r = totals_raw[0] if totals_raw else {}
        totals = {
            "client_fees":       round(r.get("client_fees",    0), 2),
            "creator_fees":      round(r.get("creator_fees",   0), 2),
            "platform_total":    round(r.get("platform_total", 0), 2),
            "volume":            round(r.get("volume",         0), 2),
            "transaction_count": r.get("count", 0),
        }
    except Exception:
        totals = {"client_fees": 0, "creator_fees": 0, "platform_total": 0, "volume": 0, "transaction_count": 0}

    # ── Top 10 transactions by platform_fee ───────────────────────────────────
    try:
        top_tx = await TxModel.find({"status": "completed"}).sort(-TxModel.platform_fee).limit(10).to_list()
        top_projects = [
            {
                "id": str(t.id),
                "amount": float(t.amount or 0),
                "platform_fee": float(t.platform_fee or 0),
                "client_fee": float(t.client_fee or 0),
                "creator_fee": float(t.creator_fee or 0),
                "client_id": str(t.from_user_id) if t.from_user_id else None,
                "creator_id": str(t.to_user_id) if t.to_user_id else None,
                "created_at": t.initiated_at.isoformat() if t.initiated_at else None,
                "status": t.status,
            }
            for t in top_tx
        ]
    except Exception:
        top_projects = []

    return {
        "monthly": monthly_list,
        "totals": totals,
        "top_projects": top_projects,
        "commission_info": {
            "version": DEFAULT_COMMISSION_VERSION,
            "client_rate_pct": 4.0,
            "creator_rate_pct": 8.0,
            "total_rate_pct": 12.0,
            "note": "Client pays +4% on top of project amount. Creator receives amount minus 8%.",
        },
    }


# ── Notifications ──────────────────────────────────────────────────────────────

class NotificationSendBody(BaseModel):
    recipient: str          # "all" | "clients" | "creators" | "custom"
    user_ids: list[str] = []  # only used when recipient == "custom"
    title: str
    message: str
    type: str = "system"    # message | system | payment | review | connection
    category: str = "info"  # info | success | warning | alert
    action_url: Optional[str] = None
    action_text: Optional[str] = None


@router.post("/notifications/send", summary="Broadcast notification to users")
async def send_admin_notification(
    body: NotificationSendBody,
    admin: User = Depends(get_admin_user),
):
    """
    Create a Notification document for every matching user.
    recipient values:
      - "all"      → every active user
      - "clients"  → account_type == "client"
      - "creators" → account_type == "creator"
      - "custom"   → only the user_ids listed in the body
    """
    from beanie.operators import In
    from app.models.schema import Notification

    # ── resolve target users ──────────────────────────────────────────────────
    if body.recipient == "custom":
        if not body.user_ids:
            raise HTTPException(status_code=400, detail="user_ids required for custom recipient")
        from bson import ObjectId as BsonObjectId
        from beanie import PydanticObjectId
        oids = []
        for uid in body.user_ids:
            try:
                oids.append(PydanticObjectId(uid))
            except Exception:
                pass
        targets = await User.find(In(User.id, oids)).to_list()
    elif body.recipient == "clients":
        targets = await User.find(User.account_type == "client", User.is_active == True).to_list()
    elif body.recipient == "creators":
        targets = await User.find(User.account_type == "creator", User.is_active == True).to_list()
    else:  # "all"
        targets = await User.find(User.is_active == True).to_list()

    if not targets:
        raise HTTPException(status_code=404, detail="No matching users found")

    # ── create notification documents in bulk ─────────────────────────────────
    now = datetime.utcnow()
    docs = [
        Notification(
            user_id=u.id,
            type=body.type,
            category=body.category,
            title=body.title,
            message=body.message,
            action_url=body.action_url,
            action_text=body.action_text,
            actor_name=admin.username,
            is_read=False,
        )
        for u in targets
    ]
    await Notification.insert_many(docs)

    return {
        "success": True,
        "sent_to": len(docs),
        "recipient": body.recipient,
        "title": body.title,
        "sent_at": now.isoformat(),
    }


@router.get("/notifications/history", summary="List last 100 admin-sent notifications")
async def get_notification_history(
    limit: int = Query(default=100, le=200),
    admin: User = Depends(get_admin_user),
):
    """
    Returns the most-recent admin-originated (type='system') notifications
    sorted newest-first, deduplicated by title+sent_at minute so bulk sends
    appear as one row.
    """
    from app.models.schema import Notification

    try:
        recent = (
            await Notification.find(Notification.type == "system")
            .sort(-Notification.id)
            .limit(limit)
            .to_list()
        )
        seen: set[str] = set()
        rows = []
        for n in recent:
            key = f"{n.title}|{n.id.generation_time.strftime('%Y-%m-%dT%H:%M') if hasattr(n.id, 'generation_time') else str(n.id)}"
            if key in seen:
                continue
            seen.add(key)
            rows.append({
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "category": n.category,
                "actor_name": n.actor_name,
                "sent_at": n.id.generation_time.isoformat() if hasattr(n.id, "generation_time") else None,
            })
        return {"history": rows, "total": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load history: {str(e)}")
