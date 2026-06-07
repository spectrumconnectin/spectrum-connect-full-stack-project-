"""
Admin Router
============
All endpoints are protected by get_admin_user (role: admin | moderator).

Endpoints
---------
GET  /admin/stats                    Platform-wide metrics
GET  /admin/stats/overview           Totals: users, jobs, projects, revenue, MRR
GET  /admin/stats/timeseries         Chart data: ?metric=signups|jobs|revenue|disputes&days=30
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
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth.auth import get_admin_user, get_superadmin_user
from app.models.schema import User


def _safe_regex(raw: str) -> str:
    """Escape user input before embedding in a MongoDB $regex to prevent ReDoS."""
    return re.escape(raw[:200])

router = APIRouter(prefix="/admin", tags=["Admin Panel"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_status(u: User) -> str:
    """Maps User fields → UI status chip: suspended | verified | unverified."""
    if not u.is_active or u.suspended_at is not None:
        return "suspended"
    if u.is_verified:
        return "verified"
    return "unverified"


def _compute_role(u: User) -> str:
    """Maps account_type + user_role → UI role badge."""
    if u.user_role == "admin":
        return "Admin"
    if u.user_role == "moderator":
        return "Moderator"
    mapping = {"crew": "Creator", "producer": "Client", "both": "Both"}
    return mapping.get(u.account_type, u.account_type.capitalize())


def _user_summary(u: User) -> dict:
    # Joined date: always derive from ObjectId generation_time — it is embedded
    # in every MongoDB document's _id and is always accurate, regardless of
    # whether the created_at field exists on old documents.
    joined = (
        u.id.generation_time.replace(tzinfo=None).isoformat()
        if u.id else None
    )

    return {
        "id": str(u.id),
        "email": u.email,
        "username": u.username,
        "display_name": (u.profile.display_name or "") if u.profile else "",
        "profile_picture": (u.profile.profile_picture or "") if u.profile else "",
        "account_type": u.account_type,
        "user_role": u.user_role,
        "role": _compute_role(u),                          # UI role badge
        "status": _compute_status(u),                      # UI status chip
        "country": (
            u.profile.location.country
            if u.profile and u.profile.location and u.profile.location.country
            else None
        ),
        "is_verified": u.is_verified,
        "is_active": u.is_active,
        "joined": joined,                                   # UI "Joined" column
        "last_login": u.last_login.isoformat() if u.last_login else None,
        "trust_score": u.spectrum_id.trust_score if u.spectrum_id else 0,
        "trust_tier": u.spectrum_id.tier if u.spectrum_id else "bronze",
    }


# ── Platform Stats ─────────────────────────────────────────────────────────────

@router.get("/stats", summary="Platform-wide metrics")
async def get_platform_stats(admin: User = Depends(get_admin_user)):
    """Return headline metrics for the admin dashboard."""
    from app.models.etf_points import EtfPoints
    import asyncio as _aio
    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        (
            total_users, creators, clients, admins, verified, suspended,
        ) = await _aio.gather(
            User.find().count(),
            User.find({"account_type": {"$in": ["crew", "both"]}}).count(),
            User.find({"account_type": {"$in": ["producer", "both"]}}).count(),
            User.find({"user_role": {"$in": ["admin", "moderator"]}}).count(),
            User.find({"is_verified": True}).count(),
            User.find({"is_active": False}).count(),
        )
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
        agg_result = await TxModel.aggregate(pipeline).to_list()
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
        etf_result = await EtfPoints.aggregate(etf_pipeline).to_list()
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


# ── Overview & Timeseries ─────────────────────────────────────────────────────

@router.get("/stats/overview", summary="Dashboard overview — totals and today's counts")
async def get_stats_overview(admin: User = Depends(get_admin_user)):
    """
    Returns all numbers needed for the 6 dashboard stat cards + recent activity stub.

    Cards mapped to UI:
      users     → "Total users"       (total + today)
      jobs      → "Active jobs"       (open + today)
      projects  → "Active projects"   (active + new_this_week)
      revenue   → "Escrowed"          (total_escrowed_usd + escrow_project_count)
      disputes  → "Open disputes"     (open + awaiting_reply)
      reports   → "Reports waiting"   (waiting + high_priority)
    """
    from app.models.schema import JobPost
    from app.models.project import Project
    from app.models.escrow import Escrow, Dispute
    from app.models.review_queue import ReviewQueue

    now         = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = now - timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Users ──────────────────────────────────────────────────────────────────
    all_users      = await User.find_all().to_list()
    total_users    = len(all_users)
    users_today    = sum(
        1 for u in all_users
        if u.id and u.id.generation_time.replace(tzinfo=None) >= today_start
    )
    verified_users = sum(1 for u in all_users if u.is_verified)
    deleted_users  = sum(1 for u in all_users if u.deleted_at is not None)

    # ── Jobs ───────────────────────────────────────────────────────────────────
    try:
        all_jobs   = await JobPost.find_all().to_list()
        total_jobs = len(all_jobs)
        open_jobs  = sum(1 for j in all_jobs if j.status == "open")
        jobs_today = sum(
            1 for j in all_jobs
            if j.id and j.id.generation_time.replace(tzinfo=None) >= today_start
        )
    except Exception:
        total_jobs = open_jobs = jobs_today = 0

    # ── Projects ───────────────────────────────────────────────────────────────
    try:
        all_projects       = await Project.find_all().to_list()
        total_projects     = len(all_projects)
        active_projects    = sum(1 for p in all_projects if p.status in ("active", "in_progress"))
        completed_projects = sum(1 for p in all_projects if p.status == "completed")
        # "12 new this week" card subtitle
        projects_this_week = sum(
            1 for p in all_projects
            if p.id and p.id.generation_time.replace(tzinfo=None) >= week_start
        )
    except Exception:
        total_projects = active_projects = completed_projects = projects_this_week = 0

    # ── Revenue / Escrow ───────────────────────────────────────────────────────
    # "Escrowed $48,210 across 124 projects"
    try:
        all_escrows          = await Escrow.find_all().to_list()
        total_escrowed       = sum(float(e.total_amount or 0) for e in all_escrows)
        total_released       = sum(float(e.released_amount or 0) for e in all_escrows)
        # count distinct escrows that still have funded/active funds
        escrow_project_count = sum(1 for e in all_escrows if e.status in ("active", "funded"))
        mrr = sum(
            float(e.released_amount or 0)
            for e in all_escrows
            if e.updated_at and e.updated_at >= month_start and e.status == "completed"
        )
    except Exception:
        total_escrowed = total_released = mrr = 0.0
        escrow_project_count = 0

    # ── Disputes ───────────────────────────────────────────────────────────────
    # "Open disputes 4 · 2 awaiting reply"
    # "awaiting_reply" = disputes where the assigned reviewer hasn't responded
    # (status: open means no reviewer yet / awaiting admin reply)
    try:
        all_disputes    = await Dispute.find_all().to_list()
        open_disputes   = sum(1 for d in all_disputes if d.status in ("open", "under_review"))
        total_disputes  = len(all_disputes)
        # awaiting_reply = open disputes with no assigned reviewer yet
        awaiting_reply  = sum(
            1 for d in all_disputes
            if d.status == "open" and d.assigned_reviewer_id is None
        )
    except Exception:
        open_disputes = total_disputes = awaiting_reply = 0

    # ── Reports ────────────────────────────────────────────────────────────────
    # "Reports waiting 3 · 1 high priority"
    # Reports = user-submitted abuse reports (ReviewQueue with type="report")
    # Until the dedicated Reports collection is built, we use ReviewQueue pending count.
    try:
        all_reviews      = await ReviewQueue.find_all().to_list()
        pending_reviews  = sum(1 for r in all_reviews if r.status == "pending")
        total_reviews    = len(all_reviews)
        # High priority = pending reviews older than 48 hours
        cutoff_48h       = now - timedelta(hours=48)
        high_priority    = sum(
            1 for r in all_reviews
            if r.status == "pending"
            and r.id
            and r.id.generation_time.replace(tzinfo=None) <= cutoff_48h
        )
    except Exception:
        pending_reviews = total_reviews = high_priority = 0

    return {
        "users": {
            "total": total_users,
            "today": users_today,
            "verified": verified_users,
            "deleted": deleted_users,
        },
        "jobs": {
            "total": total_jobs,
            "open": open_jobs,
            "today": jobs_today,
        },
        "projects": {
            "total": total_projects,
            "active": active_projects,
            "completed": completed_projects,
            "new_this_week": projects_this_week,
        },
        "revenue": {
            "total_escrowed_usd": round(total_escrowed, 2),
            "total_released_usd": round(total_released, 2),
            "mrr_usd": round(mrr, 2),
            "escrow_project_count": escrow_project_count,
        },
        "disputes": {
            "open": open_disputes,
            "total": total_disputes,
            "awaiting_reply": awaiting_reply,
        },
        "reports": {
            "waiting": pending_reviews,
            "total": total_reviews,
            "high_priority": high_priority,
        },
    }


_TIMESERIES_METRICS = {"signups", "jobs", "revenue", "disputes"}


@router.get("/stats/timeseries", summary="Time-series chart data for a given metric")
async def get_stats_timeseries(
    metric: str = Query("signups", description="signups | jobs | revenue | disputes"),
    days: int = Query(30, ge=1, le=365, description="Number of past days to include"),
    admin: User = Depends(get_admin_user),
):
    """
    Returns one data point per calendar day for the requested metric, oldest-first.

    Response shape:
    {
      "metric": "signups",
      "days": 30,
      "data": [
        { "date": "2025-05-05", "value": 14 },
        ...
      ]
    }

    Supported metrics:
      signups   — new user registrations per day  (via ObjectId.generation_time)
      jobs      — new job posts per day           (via ObjectId.generation_time)
      revenue   — escrow funds released per day   (via Escrow.updated_at)
      disputes  — new disputes opened per day     (via Dispute.created_at)
    """
    if metric not in _TIMESERIES_METRICS:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=422,
            detail=f"Invalid metric '{metric}'. Choose from: {sorted(_TIMESERIES_METRICS)}",
        )

    now       = datetime.utcnow()
    start_day = (now - timedelta(days=days - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # Zero-filled bucket dict keyed by "YYYY-MM-DD"
    buckets: dict[str, float] = {
        (start_day + timedelta(days=i)).strftime("%Y-%m-%d"): 0.0
        for i in range(days)
    }

    def _day_key(dt: Optional[datetime]) -> Optional[str]:
        """Return YYYY-MM-DD if dt falls within the window, else None."""
        if dt is None:
            return None
        # Strip tzinfo so comparison with naive start_day works
        naive = dt.replace(tzinfo=None) if dt.tzinfo else dt
        if naive >= start_day:
            return naive.strftime("%Y-%m-%d")
        return None

    if metric == "signups":
        records = await User.find_all().to_list()
        for r in records:
            # ObjectId.generation_time is timezone-aware (UTC) — strip tzinfo
            gen_time = r.id.generation_time.replace(tzinfo=None) if r.id else None
            key = _day_key(gen_time)
            if key and key in buckets:
                buckets[key] += 1

    elif metric == "jobs":
        from app.models.schema import JobPost
        try:
            records = await JobPost.find_all().to_list()
            for r in records:
                gen_time = r.id.generation_time.replace(tzinfo=None) if r.id else None
                key = _day_key(gen_time)
                if key and key in buckets:
                    buckets[key] += 1
        except Exception:
            pass

    elif metric == "revenue":
        from app.models.escrow import Escrow
        try:
            records = await Escrow.find_all().to_list()
            for r in records:
                if r.status != "completed":
                    continue
                key = _day_key(r.updated_at)
                if key and key in buckets:
                    buckets[key] += float(r.released_amount or 0)
        except Exception:
            pass

    elif metric == "disputes":
        from app.models.escrow import Dispute
        try:
            records = await Dispute.find_all().to_list()
            for r in records:
                key = _day_key(r.created_at)
                if key and key in buckets:
                    buckets[key] += 1
        except Exception:
            pass

    data = [
        {"date": date, "value": round(value, 2)}
        for date, value in sorted(buckets.items())
    ]

    return {"metric": metric, "days": days, "data": data}


# ── User Management ────────────────────────────────────────────────────────────

@router.get("/users", summary="List all users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by email or username"),
    role: Optional[str] = Query(None, description="Creator | Client | Moderator | Admin"),
    status: Optional[str] = Query(None, description="suspended | verified | unverified"),
    admin: User = Depends(get_admin_user),
):
    raw_filter: dict = {}
    if search:
        safe_search = _safe_regex(search)
        raw_filter["$or"] = [
            {"email": {"$regex": safe_search, "$options": "i"}},
            {"username": {"$regex": safe_search, "$options": "i"}},
            {"profile.display_name": {"$regex": safe_search, "$options": "i"}},
        ]

    query = User.find(raw_filter)
    total = await query.count()
    start = (page - 1) * page_size
    page_users = await query.sort([("_id", -1)]).skip(start).limit(page_size).to_list()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": start + page_size < total,
        "users": [_user_summary(u) for u in page_users],
    }


@router.get("/users/export", summary="Export users list as CSV")
async def export_users_csv(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    admin: User = Depends(get_admin_user),
):
    """Download filtered users as a CSV file. Accepts same filters as GET /admin/users."""
    import csv
    import io
    from fastapi.responses import StreamingResponse

    all_users = await User.find_all().to_list()

    if search:
        q = search.lower()
        all_users = [
            u for u in all_users
            if q in (u.email or "").lower() or q in (u.username or "").lower()
        ]
    if role:
        all_users = [u for u in all_users if _compute_role(u).lower() == role.lower()]
    if status:
        all_users = [u for u in all_users if _compute_status(u) == status.lower()]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Username", "Email", "Role", "Country", "Status", "Joined", "Last Login"])

    for u in all_users:
        s = _user_summary(u)
        writer.writerow([
            s["username"],
            s["email"],
            s["role"],
            s["country"] or "",
            s["status"],
            s["joined"] or "",
            s["last_login"] or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users_export.csv"},
    )


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


@router.patch("/users/{user_id}/role", summary="Change user role (no auth)")
async def update_user_role(user_id: str, body: RoleUpdate, admin: User = Depends(get_admin_user)):
    if body.user_role not in {"user", "admin", "moderator"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid role")
    from bson import ObjectId
    from app.services.audit_service import log_event
    u = await User.get(ObjectId(user_id))
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    old_role = u.user_role
    u.user_role = body.user_role
    await u.save()
    await log_event(
        "admin.user.promoted",
        actor=admin,
        target_type="user",
        target_id=user_id,
        metadata={"old_role": old_role, "new_role": body.user_role, "target_username": u.username},
        severity="critical",
    )
    return {"id": user_id, "user_role": u.user_role}


@router.patch("/users/{user_id}/suspend", summary="Suspend user account")
async def suspend_user(user_id: str, admin: User = Depends(get_admin_user)):
    from bson import ObjectId
    from app.services.audit_service import log_event
    u = await User.get(ObjectId(user_id))
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if u.user_role in {"admin", "moderator"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot suspend another admin")
    u.is_active = False
    u.suspended_at = datetime.utcnow()
    await u.save()
    await log_event(
        "admin.user.suspended",
        actor=admin,
        target_type="user",
        target_id=user_id,
        metadata={"target_username": u.username, "target_email": u.email},
        severity="critical",
    )
    return {"id": user_id, "status": "suspended"}


@router.patch("/users/{user_id}/activate", summary="Reactivate suspended user")
async def activate_user(user_id: str, admin: User = Depends(get_admin_user)):
    from bson import ObjectId
    from app.services.audit_service import log_event
    u = await User.get(ObjectId(user_id))
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    u.is_active = True
    u.suspended_at = None
    await u.save()
    await log_event(
        "admin.user.activated",
        actor=admin,
        target_type="user",
        target_id=user_id,
        metadata={"target_username": u.username},
        severity="warning",
    )
    return {"id": user_id, "status": _compute_status(u)}


@router.patch("/users/{user_id}/verify", summary="Toggle user verification")
async def toggle_verify_user(user_id: str, admin: User = Depends(get_admin_user)):
    from bson import ObjectId
    u = await User.get(ObjectId(user_id))
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    u.is_verified = not u.is_verified
    await u.save()
    return {"id": user_id, "is_verified": u.is_verified}


@router.delete("/users/{user_id}", summary="[Admin] Soft delete user + redact PII (GDPR)")
async def soft_delete_user(
    user_id: str,
    admin: User = Depends(get_superadmin_user),
):
    """
    Soft-delete a user account and redact all PII fields (GDPR right to erasure).

    What happens:
    - deleted_at is stamped (marks account as deleted)
    - is_active set to False
    - email, username, phone, OAuth tokens, profile, login history are redacted
    - Audit log events are KEPT for fraud history
    - Account cannot log in or be recovered after this

    Requires: superadmin role only.
    """
    from bson import ObjectId
    from app.services.audit_service import log_event

    try:
        u = await User.get(ObjectId(user_id))
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid user ID.")
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if u.deleted_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User is already deleted.")
    if u.user_role == "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot delete an admin account.")

    # Save identifiers for audit log before redacting
    original_email    = u.email
    original_username = u.username

    redacted_id = f"deleted_{user_id}"

    # ── Redact PII ─────────────────────────────────────────────────────────────
    u.email               = f"{redacted_id}@deleted.invalid"
    u.username            = redacted_id
    u.password_hash       = "[redacted]"
    u.phone_number        = None
    u.phone_country_code  = None
    u.oauth               = None
    u.login_history       = None
    u.password_reset_token_hash = None
    u.is_active           = False
    u.deleted_at          = datetime.utcnow()

    # Redact profile PII but keep skill/category data for platform stats
    if u.profile:
        u.profile.first_name      = None
        u.profile.last_name       = None
        u.profile.display_name    = "[deleted]"
        u.profile.bio             = None
        u.profile.tagline         = None
        u.profile.profile_picture = None
        u.profile.cover_image     = None
        u.profile.website         = None
        u.profile.social_links    = None
        u.profile.intro_video     = None

    await u.save()

    await log_event(
        "admin.user.deleted",
        actor=admin,
        target_type="user",
        target_id=user_id,
        metadata={
            "original_email":    original_email,
            "original_username": original_username,
            "reason":            "GDPR erasure / admin action",
        },
        severity="critical",
    )

    return {
        "success":    True,
        "user_id":    user_id,
        "deleted_at": u.deleted_at.isoformat(),
        "message":    "User soft-deleted and PII redacted.",
    }


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
                "created_at": j.id.generation_time.replace(tzinfo=None).isoformat() if j.id else None,
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


@router.get("/jobs/{job_id}", summary="Full job detail")
async def get_job_detail(job_id: str, admin: User = Depends(get_admin_user)):
    from app.models.schema import JobPost
    from bson import ObjectId
    try:
        j = await JobPost.get(ObjectId(job_id))
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    if not j:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")

    return {
        "id": str(j.id),
        "title": j.title,
        "description": j.description,
        "status": j.status,
        "visibility": j.visibility,
        "department": j.department,
        "role": j.role,
        "tags": j.tags,
        "skills": j.skills,
        "crew_size": j.crew_size,
        "complexity": j.complexity,
        "experience_level": j.experience_level,
        "budget_type": j.budget_type,
        "budget": {
            "min": j.budget.min if j.budget else None,
            "max": j.budget.max if j.budget else None,
            "currency": j.budget.currency if j.budget else "USD",
        } if j.budget else None,
        "client_id": str(j.client_id),
        "proposal_count": j.proposal_count,
        "view_count": j.view_count,
        "hired_crew": [str(c) for c in (j.hired_crew or [])],
        "start_date": j.start_date.isoformat() if j.start_date else None,
        "deadline": j.deadline.isoformat() if j.deadline else None,
        "published_at": j.published_at.isoformat() if j.published_at else None,
        "closed_at": j.closed_at.isoformat() if j.closed_at else None,
        "created_at": j.id.generation_time.replace(tzinfo=None).isoformat() if j.id else None,
    }


class JobVisibilityUpdate(BaseModel):
    visibility: str  # public | private | invited_only | hidden | featured


@router.patch("/jobs/{job_id}/visibility", summary="Update job visibility (hide/show/feature)")
async def update_job_visibility(job_id: str, body: JobVisibilityUpdate, admin: User = Depends(get_admin_user)):
    from app.models.schema import JobPost
    from bson import ObjectId
    if body.visibility not in {"public", "private", "invited_only", "hidden", "featured"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid visibility value")
    j = await JobPost.get(ObjectId(job_id))
    if not j:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    j.visibility = body.visibility
    await j.save()
    return {"id": job_id, "visibility": j.visibility}


@router.delete("/jobs/{job_id}", summary="Hard delete a job (admin only)")
async def delete_job(job_id: str, admin: User = Depends(get_superadmin_user)):
    from app.models.schema import JobPost
    from bson import ObjectId
    j = await JobPost.get(ObjectId(job_id))
    if not j:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    await j.delete()
    return {"id": job_id, "deleted": True}


# ── Project Management ─────────────────────────────────────────────────────────

@router.get("/projects", summary="List all projects")
async def list_all_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by title or description"),
    status: Optional[str] = Query(None, description="draft | active | in_progress | review | completed | on_hold | archived"),
    category: Optional[str] = Query(None, description="film | music | design | documentary etc."),
    admin: User = Depends(get_admin_user),
):
    from app.models.project import Project
    try:
        all_projects = await Project.find_all().to_list()
    except Exception:
        return {"total": 0, "page": page, "page_size": page_size, "has_more": False, "projects": []}

    if search:
        q = search.lower()
        all_projects = [p for p in all_projects if
            q in (p.title or "").lower() or
            q in (p.description or "").lower()]
    if status:
        all_projects = [p for p in all_projects if p.status == status]
    if category:
        all_projects = [p for p in all_projects if (p.category or "").lower() == category.lower()]

    all_projects.sort(key=lambda p: p.created_at or datetime.min, reverse=True)
    total = len(all_projects)
    start = (page - 1) * page_size

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": start + page_size < total,
        "projects": [
            {
                "id": str(p.id),
                "title": p.title,
                "status": p.status,
                "category": p.category,
                "client_id": p.client_id,
                "progress_percentage": p.progress_percentage,
                "team_size": len(p.team_members),
                "total_roles": p.total_roles,
                "filled_roles": p.filled_roles,
                "budget_min": p.budget_min,
                "budget_max": p.budget_max,
                "is_public": p.is_public,
                "is_featured": p.is_featured,
                "start_date": p.start_date.isoformat() if p.start_date else None,
                "end_date": p.end_date.isoformat() if p.end_date else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in all_projects[start: start + page_size]
        ],
    }


@router.get("/projects/{project_id}", summary="Full project detail")
async def get_project_detail(project_id: str, admin: User = Depends(get_admin_user)):
    from app.models.project import Project, ProjectDeadline
    from bson import ObjectId
    try:
        p = await Project.get(ObjectId(project_id))
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    # Load deadlines for this project
    try:
        deadlines = await ProjectDeadline.find(
            ProjectDeadline.project_id == project_id
        ).sort(-ProjectDeadline.due_date).to_list()
    except Exception:
        deadlines = []

    return {
        "id": str(p.id),
        "title": p.title,
        "description": p.description,
        "status": p.status,
        "category": p.category,
        "client_id": p.client_id,
        "progress_percentage": p.progress_percentage,
        "is_public": p.is_public,
        "is_featured": p.is_featured,
        "budget_min": p.budget_min,
        "budget_max": p.budget_max,
        "location": p.location,
        "tags": p.tags,
        "job_post_id": p.job_post_id,
        "total_roles": p.total_roles,
        "filled_roles": p.filled_roles,
        "team_members": [
            {
                "user_id": m.user_id,
                "username": m.username,
                "role": m.role,
                "avatar_url": m.avatar_url,
                "invitation_status": m.invitation_status,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            }
            for m in p.team_members
        ],
        "deadlines": [
            {
                "id": str(d.id),
                "title": d.title,
                "due_date": d.due_date.isoformat() if d.due_date else None,
                "priority": d.priority,
                "status": d.status,
                "assigned_to": d.assigned_to,
            }
            for d in deadlines
        ],
        "start_date": p.start_date.isoformat() if p.start_date else None,
        "end_date": p.end_date.isoformat() if p.end_date else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.get("/projects/{project_id}/timeline", summary="Full activity timeline for a project")
async def get_project_timeline(
    project_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    activity_type: Optional[str] = Query(None, description="user_joined | milestone_completed | status_changed | file_uploaded | deadline_approaching"),
    admin: User = Depends(get_admin_user),
):
    from app.models.project import ActivityLog, Project
    from bson import ObjectId

    # Verify project exists
    try:
        p = await Project.get(ObjectId(project_id))
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    try:
        all_logs = await ActivityLog.find(
            ActivityLog.project_id == project_id
        ).sort(-ActivityLog.created_at).to_list()
    except Exception:
        all_logs = []

    if activity_type:
        all_logs = [l for l in all_logs if l.activity_type == activity_type]

    total = len(all_logs)
    start = (page - 1) * page_size

    return {
        "project_id": project_id,
        "project_title": p.title,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": start + page_size < total,
        "timeline": [
            {
                "id": str(log.id),
                "activity_type": log.activity_type,
                "message": log.message,
                "actor_id": log.actor_id,
                "actor_name": log.actor_name,
                "actor_avatar": log.actor_avatar,
                "metadata": log.metadata,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in all_logs[start: start + page_size]
        ],
    }


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
                "raised_against": str(d.raised_against) if getattr(d, "raised_against", None) else None,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in page_disputes
        ],
    }


# ── Transactions (Payments page) ───────────────────────────────────────────────

@router.get("/transactions", summary="List all escrow transactions")
async def list_all_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    tx_status: Optional[str] = Query(None, alias="status"),
    admin: User = Depends(get_admin_user),
):
    from app.models.escrow import Escrow
    try:
        query = Escrow.find()
        if tx_status:
            query = query.find(Escrow.status == tx_status)
        total = await query.count()
        start = (page - 1) * page_size
        page_tx = await query.sort(-Escrow.created_at).skip(start).limit(page_size).to_list()
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
                "total_amount": float(t.total_amount or 0),
                "funded_amount": float(t.funded_amount or 0),
                "released_amount": float(t.released_amount or 0),
                "refunded_amount": float(t.refunded_amount or 0),
                "currency": t.currency,
                "client_id": str(t.client_id) if t.client_id else None,
                "creator_id": str(t.creator_id) if t.creator_id else None,
                "project_id": str(t.project_id) if t.project_id else None,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in page_tx
        ],
    }


@router.get("/transactions/{escrow_id}", summary="[Admin] Full escrow detail with milestones")
async def get_transaction_detail(
    escrow_id: str,
    admin: User = Depends(get_admin_user),
):
    from app.models.escrow import Escrow
    from beanie import PydanticObjectId
    try:
        escrow = await Escrow.get(PydanticObjectId(escrow_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid escrow ID.")
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found.")

    client  = await User.get(escrow.client_id)
    creator = await User.get(escrow.creator_id)

    return {
        "id":              str(escrow.id),
        "status":          escrow.status,
        "description":     escrow.description,
        "currency":        escrow.currency,
        "total_amount":    float(escrow.total_amount or 0),
        "funded_amount":   float(escrow.funded_amount or 0),
        "released_amount": float(escrow.released_amount or 0),
        "refunded_amount": float(escrow.refunded_amount or 0),
        "client": {
            "id":       str(escrow.client_id),
            "username": client.username if client else "unknown",
            "email":    client.email    if client else "unknown",
        },
        "creator": {
            "id":       str(escrow.creator_id),
            "username": creator.username if creator else "unknown",
            "email":    creator.email    if creator else "unknown",
        },
        "project_id":    str(escrow.project_id)  if escrow.project_id  else None,
        "job_post_id":   str(escrow.job_post_id) if escrow.job_post_id else None,
        "milestones": [
            {
                "milestone_id": m.milestone_id,
                "title":        m.title,
                "amount":       float(m.amount),
                "status":       m.status,
                "funded_at":    m.funded_at.isoformat()   if m.funded_at   else None,
                "released_at":  m.released_at.isoformat() if m.released_at else None,
                "refunded_at":  m.refunded_at.isoformat() if m.refunded_at else None,
            }
            for m in (escrow.milestones or [])
        ],
        "created_at":    escrow.created_at.isoformat()    if escrow.created_at    else None,
        "completed_at":  escrow.completed_at.isoformat()  if escrow.completed_at  else None,
    }


@router.post("/transactions/{escrow_id}/refund", summary="[Admin] Force full refund on an escrow")
async def admin_force_refund(
    escrow_id: str,
    body: dict,
    admin: User = Depends(get_admin_user),
):
    from app.models.escrow import Escrow
    from beanie import PydanticObjectId
    reason = body.get("reason", "Admin-initiated refund.")
    try:
        escrow = await Escrow.get(PydanticObjectId(escrow_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid escrow ID.")
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found.")
    if escrow.status in ("refunded", "completed"):
        raise HTTPException(status_code=400, detail=f"Escrow is already {escrow.status}.")

    refund_total = 0.0
    for m in (escrow.milestones or []):
        if m.status == "funded":
            m.status = "refunded"
            m.refunded_at = datetime.utcnow()
            refund_total += float(m.amount)

    escrow.refunded_amount = float(escrow.refunded_amount or 0) + refund_total
    escrow.status = "refunded"
    escrow.updated_at = datetime.utcnow()
    await escrow.save()

    return {
        "success":       True,
        "escrow_id":     str(escrow.id),
        "refund_amount": refund_total,
        "new_status":    "refunded",
        "reason":        reason,
        "message":       f"Refund of {refund_total} {escrow.currency} processed successfully.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 12: AUDIT LOG
# ══════════════════════════════════════════════════════════════════════════════

from fastapi.responses import StreamingResponse
import csv
import io


@router.get("/audit", summary="[Admin] Paginated audit log")
async def list_audit_log(
    event_type: Optional[str] = Query(None, description="e.g. user.login, admin.user.suspended"),
    severity:   Optional[str] = Query(None, description="debug | info | warning | error | critical"),
    actor_id:   Optional[str] = Query(None, description="Filter by actor user ID"),
    target_id:  Optional[str] = Query(None, description="Filter by target ID"),
    since:      Optional[str] = Query(None, description="ISO datetime — return entries after this"),
    limit:  int = Query(50, ge=1, le=100),
    offset: int = Query(0,  ge=0),
    admin: User = Depends(get_admin_user),
):
    from app.models.audit_log import AuditLog
    from beanie import PydanticObjectId

    filters = []
    if event_type:
        filters.append(AuditLog.event_type == event_type)
    if severity:
        filters.append(AuditLog.severity == severity)
    if actor_id:
        try:
            filters.append(AuditLog.actor_id == PydanticObjectId(actor_id))
        except Exception:
            pass
    if target_id:
        filters.append(AuditLog.target_id == target_id)
    if since:
        try:
            from datetime import datetime
            since_dt = datetime.fromisoformat(since)
            filters.append(AuditLog.created_at >= since_dt)
        except Exception:
            pass

    query = AuditLog.find(*filters) if filters else AuditLog.find()
    total = await query.count()
    entries = (
        await query.sort(-AuditLog.created_at).skip(offset).limit(limit).to_list()
    )

    return {
        "total":  total,
        "limit":  limit,
        "offset": offset,
        "has_more": (offset + limit) < total,
        "logs": [
            {
                "id":             str(e.id),
                "event_type":     e.event_type,
                "severity":       e.severity,
                "actor_id":       str(e.actor_id)    if e.actor_id    else None,
                "actor_username": e.actor_username,
                "actor_role":     e.actor_role,
                "target_type":    e.target_type,
                "target_id":      e.target_id,
                "ip_address":     e.ip_address,
                "request_path":   e.request_path,
                "request_method": e.request_method,
                "metadata":       e.metadata,
                "created_at":     e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ],
    }


@router.get("/audit/export", summary="[Admin] Export audit log as CSV")
async def export_audit_log(
    event_type: Optional[str] = Query(None),
    severity:   Optional[str] = Query(None),
    actor_id:   Optional[str] = Query(None),
    since:      Optional[str] = Query(None),
    admin: User = Depends(get_admin_user),
):
    from app.models.audit_log import AuditLog
    from beanie import PydanticObjectId

    filters = []
    if event_type:
        filters.append(AuditLog.event_type == event_type)
    if severity:
        filters.append(AuditLog.severity == severity)
    if actor_id:
        try:
            filters.append(AuditLog.actor_id == PydanticObjectId(actor_id))
        except Exception:
            pass
    if since:
        try:
            from datetime import datetime
            filters.append(AuditLog.created_at >= datetime.fromisoformat(since))
        except Exception:
            pass

    query = AuditLog.find(*filters) if filters else AuditLog.find()
    entries = await query.sort(-AuditLog.created_at).limit(5000).to_list()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "event_type", "severity", "actor_username", "actor_role",
        "target_type", "target_id", "ip_address", "request_method",
        "request_path", "metadata", "created_at",
    ])
    for e in entries:
        writer.writerow([
            str(e.id), e.event_type, e.severity,
            e.actor_username or "", e.actor_role or "",
            e.target_type or "", e.target_id or "",
            e.ip_address or "", e.request_method or "",
            e.request_path or "", str(e.metadata or ""),
            e.created_at.isoformat() if e.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_log.csv"},
    )


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
        result = await EtfPoints.aggregate(pipeline).to_list()
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
        monthly_raw = await TxModel.aggregate(monthly_pipeline).to_list()
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
        totals_raw = await TxModel.aggregate(totals_pipeline).to_list()
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


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 13: REPORTS INBOX
# ══════════════════════════════════════════════════════════════════════════════

from app.services.report_service import ReportService
from app.api.schemas.report_schemas import (
    ReportListResponse,
    ReportDetailResponse,
    ResolveReportRequest,
    DismissReportRequest,
    ReportActionResponse,
)


@router.get(
    "/reports",
    response_model=ReportListResponse,
    summary="[Admin] List all reports",
)
async def list_reports(
    status_filter: Optional[str] = Query(
        None,
        description="pending | under_review | resolved | dismissed — omit for all",
    ),
    target_type: Optional[str] = Query(
        None,
        description="user | job | review | project | message",
    ),
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0,  ge=0),
    admin: User = Depends(get_admin_user),
):
    result = await ReportService.get_all_reports(
        status_filter=status_filter,
        target_type=target_type,
        limit=limit,
        offset=offset,
    )
    return ReportListResponse(**result)


@router.get(
    "/reports/{report_id}",
    response_model=ReportDetailResponse,
    summary="[Admin] Get report detail",
)
async def get_report(
    report_id: str,
    admin: User = Depends(get_admin_user),
):
    result = await ReportService.get_report_by_id(report_id)
    return ReportDetailResponse(**result)


@router.patch(
    "/reports/{report_id}/resolve",
    response_model=ReportActionResponse,
    summary="[Admin] Resolve a report",
)
async def resolve_report(
    report_id: str,
    body: ResolveReportRequest,
    admin: User = Depends(get_admin_user),
):
    result = await ReportService.resolve_report(
        report_id=report_id,
        admin_user_id=str(admin.id),
        action_taken=body.action_taken,
        admin_note=body.admin_note,
    )
    return ReportActionResponse(**result)


@router.patch(
    "/reports/{report_id}/dismiss",
    response_model=ReportActionResponse,
    summary="[Admin] Dismiss a report",
)
async def dismiss_report(
    report_id: str,
    body: DismissReportRequest,
    admin: User = Depends(get_admin_user),
):
    result = await ReportService.dismiss_report(
        report_id=report_id,
        admin_user_id=str(admin.id),
        admin_note=body.admin_note,
    )
    return ReportActionResponse(**result)


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 14: SETTINGS — Feature Flags + Broadcast Notifications
# ══════════════════════════════════════════════════════════════════════════════

from app.models.platform_settings import PlatformSettings, BroadcastNotification
from pydantic import BaseModel as _PydanticBase


class FlagUpdate(_PydanticBase):
    etf_cashout_enabled:           Optional[bool] = None
    maintenance_mode:              Optional[bool] = None
    maintenance_message:           Optional[str]  = None
    new_user_registration_enabled: Optional[bool] = None
    job_posting_enabled:           Optional[bool] = None
    review_queue_enabled:          Optional[bool] = None
    skill_challenges_enabled:      Optional[bool] = None
    disputes_enabled:              Optional[bool] = None
    escrow_enabled:                Optional[bool] = None


class BroadcastRequest(_PydanticBase):
    title:          str
    message:        str
    target_segment: str = "all"   # all | creators | clients | verified | unverified | admins


async def _get_or_create_settings() -> PlatformSettings:
    s = await PlatformSettings.find_one(PlatformSettings.settings_id == "global")
    if not s:
        s = PlatformSettings()
        await s.insert()
    return s


@router.get("/settings", summary="[Admin] Get platform feature flags")
async def get_platform_settings(admin: User = Depends(get_admin_user)):
    s = await _get_or_create_settings()
    return {
        "etf_cashout_enabled":           s.etf_cashout_enabled,
        "maintenance_mode":              s.maintenance_mode,
        "maintenance_message":           s.maintenance_message,
        "new_user_registration_enabled": s.new_user_registration_enabled,
        "job_posting_enabled":           s.job_posting_enabled,
        "review_queue_enabled":          s.review_queue_enabled,
        "skill_challenges_enabled":      s.skill_challenges_enabled,
        "disputes_enabled":              s.disputes_enabled,
        "escrow_enabled":                s.escrow_enabled,
        "updated_at":                    s.updated_at.isoformat() if s.updated_at else None,
        "updated_by":                    s.updated_by,
    }


@router.patch("/settings", summary="[Admin] Update platform feature flags")
async def update_platform_settings(
    body: FlagUpdate,
    admin: User = Depends(get_superadmin_user),
):
    from app.services.audit_service import log_event
    s = await _get_or_create_settings()

    changes = {}
    for field, value in body.model_dump(exclude_none=True).items():
        old = getattr(s, field)
        if old != value:
            setattr(s, field, value)
            changes[field] = {"from": old, "to": value}

    if changes:
        s.updated_at = datetime.utcnow()
        s.updated_by = admin.username
        await s.save()
        await log_event(
            "admin.settings.updated",
            actor=admin,
            metadata={"changes": changes},
            severity="critical",
        )

    return {"success": True, "changes": changes, "message": "Settings updated." if changes else "No changes."}


@router.get("/notifications/broadcast", summary="[Admin] List past broadcasts")
async def list_broadcasts(
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0,  ge=0),
    admin: User = Depends(get_admin_user),
):
    total = await BroadcastNotification.find().count()
    items = (
        await BroadcastNotification.find()
        .sort(-BroadcastNotification.created_at)
        .skip(offset).limit(limit).to_list()
    )
    return {
        "total":  total,
        "limit":  limit,
        "offset": offset,
        "has_more": (offset + limit) < total,
        "broadcasts": [
            {
                "id":               str(b.id),
                "title":            b.title,
                "message":          b.message,
                "target_segment":   b.target_segment,
                "sent_by_username": b.sent_by_username,
                "recipient_count":  b.recipient_count,
                "status":           b.status,
                "created_at":       b.created_at.isoformat() if b.created_at else None,
            }
            for b in items
        ],
    }


@router.post("/notifications/broadcast", summary="[Admin] Send broadcast notification")
async def send_broadcast(
    body: BroadcastRequest,
    admin: User = Depends(get_admin_user),
):
    from app.services.audit_service import log_event

    # Count recipients based on segment
    segment_filters = {
        "all":        {},
        "creators":   {"account_type": {"$in": ["crew", "both"]}},
        "clients":    {"account_type": {"$in": ["producer", "both"]}},
        "verified":   {"is_verified": True},
        "unverified": {"is_verified": False},
        "admins":     {"user_role": {"$in": ["admin", "moderator"]}},
    }
    raw_filter = segment_filters.get(body.target_segment, {})
    recipient_count = await User.find(raw_filter).count()

    # Save to notification collection for each user (fire-and-forget)
    try:
        from app.models.schema import Notification
        target_users = await User.find(raw_filter).to_list()
        for u in target_users:
            notif = Notification(
                user_id=str(u.id),
                type="broadcast",
                title=body.title,
                message=body.message,
                is_read=False,
            )
            await notif.insert()
    except Exception:
        pass

    # Record broadcast history
    record = BroadcastNotification(
        title=body.title,
        message=body.message,
        target_segment=body.target_segment,
        sent_by_id=str(admin.id),
        sent_by_username=admin.username,
        recipient_count=recipient_count,
        status="sent",
    )
    await record.insert()

    await log_event(
        "admin.broadcast.sent",
        actor=admin,
        metadata={"title": body.title, "segment": body.target_segment, "recipient_count": recipient_count},
        severity="warning",
    )

    return {
        "success":         True,
        "broadcast_id":    str(record.id),
        "title":           body.title,
        "target_segment":  body.target_segment,
        "recipient_count": recipient_count,
        "message":         f"Broadcast sent to {recipient_count} users.",
    }
