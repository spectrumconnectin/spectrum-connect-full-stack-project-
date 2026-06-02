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
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth.auth import get_admin_user
from app.models.schema import User

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
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "display_name": (u.profile.display_name or "") if u.profile else "",
        "profile_picture": (u.profile.profile_picture or "") if u.profile else "",
        "trust_score": u.spectrum_id.trust_score if u.spectrum_id else 0,
        "trust_tier": u.spectrum_id.tier if u.spectrum_id else "bronze",
    }


# ── Platform Stats ─────────────────────────────────────────────────────────────

@router.get("/stats", summary="Platform-wide metrics")
async def get_platform_stats(admin: User = Depends(get_admin_user)):
    """Return headline metrics for the admin dashboard."""
    from app.models.escrow import EscrowTransaction
    from app.models.etf_points import EtfPoints

    total_users = await User.count()
    creators = await User.find(User.account_type == "creator").count()
    clients = await User.find(User.account_type == "client").count()
    admins = await User.find(User.user_role.in_(["admin", "moderator"])).count()
    verified = await User.find(User.is_verified == True).count()
    suspended = await User.find(User.is_active == False).count()

    # Users joined in the last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users_30d = await User.find(User.created_at >= thirty_days_ago).count()

    # Escrow / financial stats
    try:
        all_escrow = await EscrowTransaction.find_all().to_list()
        total_volume = sum(float(e.amount or 0) for e in all_escrow)
        active_escrow = sum(1 for e in all_escrow if e.status in ("funded", "in_progress"))
        completed_escrow = sum(1 for e in all_escrow if e.status == "released")
        disputed_escrow = sum(1 for e in all_escrow if e.status == "disputed")
        total_fees = sum(float(e.platform_fee or 0) for e in all_escrow)
    except Exception:
        total_volume = active_escrow = completed_escrow = disputed_escrow = total_fees = 0

    # ETF stats
    try:
        all_etf = await EtfPoints.find_all().to_list()
        total_points_awarded = sum(int(e.lifetime_points or 0) for e in all_etf)
        platinum_users = sum(1 for e in all_etf if e.level == "platinum")
        gold_users = sum(1 for e in all_etf if e.level == "gold")
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
            "total_volume_usd": round(total_volume, 2),
            "platform_fees_usd": round(total_fees, 2),
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
    query = User.find()
    all_users = await query.to_list()

    # Apply filters in Python (simple, works across MongoDB versions)
    if search:
        q = search.lower()
        all_users = [u for u in all_users if
            q in (u.email or "").lower() or
            q in (u.username or "").lower() or
            q in ((u.profile.display_name or "") if u.profile else "").lower()]
    if account_type:
        all_users = [u for u in all_users if u.account_type == account_type]
    if user_role:
        all_users = [u for u in all_users if u.user_role == user_role]
    if is_verified is not None:
        all_users = [u for u in all_users if u.is_verified == is_verified]
    if is_active is not None:
        all_users = [u for u in all_users if u.is_active == is_active]

    total = len(all_users)
    # Sort newest first
    all_users.sort(key=lambda u: u.created_at or datetime.min, reverse=True)
    start = (page - 1) * page_size
    page_users = all_users[start: start + page_size]

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
    u.is_active = False
    await u.save()
    return {"id": user_id, "is_active": False}


@router.patch("/users/{user_id}/activate", summary="Reactivate suspended user")
async def activate_user(user_id: str, admin: User = Depends(get_admin_user)):
    from bson import ObjectId
    u = await User.get(ObjectId(user_id))
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
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
        all_jobs = await JobPost.find_all().to_list()
    except Exception:
        return {"total": 0, "page": page, "page_size": page_size, "has_more": False, "jobs": []}

    if search:
        q = search.lower()
        all_jobs = [j for j in all_jobs if q in (j.title or "").lower() or q in (j.description or "").lower()]
    if job_status:
        all_jobs = [j for j in all_jobs if j.status == job_status]

    all_jobs.sort(key=lambda j: j.created_at or datetime.min, reverse=True)
    total = len(all_jobs)
    start = (page - 1) * page_size
    page_jobs = all_jobs[start: start + page_size]

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
                "created_at": j.created_at.isoformat() if j.created_at else None,
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
    from app.models.escrow import DisputeCase
    try:
        all_disputes = await DisputeCase.find_all().to_list()
    except Exception:
        return {"total": 0, "page": page, "page_size": page_size, "has_more": False, "disputes": []}

    if dispute_status:
        all_disputes = [d for d in all_disputes if d.status == dispute_status]

    all_disputes.sort(key=lambda d: d.created_at or datetime.min, reverse=True)
    total = len(all_disputes)
    start = (page - 1) * page_size

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
                "opened_by": str(d.opened_by) if d.opened_by else None,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in all_disputes[start: start + page_size]
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
    from app.models.escrow import EscrowTransaction
    try:
        all_tx = await EscrowTransaction.find_all().to_list()
    except Exception:
        return {"total": 0, "page": page, "page_size": page_size, "has_more": False, "transactions": []}

    if tx_status:
        all_tx = [t for t in all_tx if t.status == tx_status]

    all_tx.sort(key=lambda t: t.created_at or datetime.min, reverse=True)
    total = len(all_tx)
    start = (page - 1) * page_size

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": start + page_size < total,
        "transactions": [
            {
                "id": str(t.id),
                "status": t.status,
                "amount": float(t.amount or 0),
                "currency": t.currency,
                "platform_fee": float(t.platform_fee or 0),
                "client_id": str(t.client_id) if t.client_id else None,
                "creator_id": str(t.creator_id) if t.creator_id else None,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in all_tx[start: start + page_size]
        ],
    }


# ── ETF Stats ──────────────────────────────────────────────────────────────────

@router.get("/etf/stats", summary="ETF points platform summary")
async def get_etf_stats(admin: User = Depends(get_admin_user)):
    from app.models.etf_points import EtfPoints
    try:
        all_etf = await EtfPoints.find_all().to_list()
    except Exception:
        return {}

    levels = {"bronze": 0, "silver": 0, "gold": 0, "platinum": 0}
    total_lifetime = 0
    total_redeemed = 0
    for e in all_etf:
        lvl = (e.level or "bronze").lower()
        if lvl in levels:
            levels[lvl] += 1
        total_lifetime += int(e.lifetime_points or 0)
        total_redeemed += int(e.redeemed_points or 0)

    return {
        "total_accounts": len(all_etf),
        "total_lifetime_points": total_lifetime,
        "total_redeemed_points": total_redeemed,
        "level_breakdown": levels,
    }
