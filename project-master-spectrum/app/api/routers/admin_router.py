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
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth.auth import get_admin_user, get_superadmin_user
from app.models.schema import User

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
    from app.models.escrow import Escrow
    from app.models.etf_points import EtfPoints

    all_users   = await User.find_all().to_list()
    total_users = len(all_users)
    creators    = sum(1 for u in all_users if u.account_type == "crew")
    clients     = sum(1 for u in all_users if u.account_type == "producer")
    admins      = sum(1 for u in all_users if u.user_role in {"admin", "moderator"})
    verified    = sum(1 for u in all_users if u.is_verified)
    suspended   = sum(1 for u in all_users if not u.is_active)

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users_30d   = sum(
        1 for u in all_users
        if u.created_at and u.created_at >= thirty_days_ago
    )

    # Escrow / financial stats
    try:
        all_escrow       = await Escrow.find_all().to_list()
        total_volume     = sum(float(e.total_amount or 0) for e in all_escrow)
        active_escrow    = sum(1 for e in all_escrow if e.status == "active")
        completed_escrow = sum(1 for e in all_escrow if e.status == "completed")
        disputed_escrow  = sum(1 for e in all_escrow if e.status == "disputed")
        total_fees       = sum(float(e.released_amount or 0) for e in all_escrow)
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
    all_users = await User.find_all().to_list()

    # Search by email or username
    if search:
        q = search.lower()
        all_users = [
            u for u in all_users
            if q in (u.email or "").lower()
            or q in (u.username or "").lower()
            or q in ((u.profile.display_name or "") if u.profile else "").lower()
        ]

    # Role filter matches the computed _compute_role() value
    if role:
        all_users = [u for u in all_users if _compute_role(u).lower() == role.lower()]

    # Status filter matches the computed _compute_status() value
    if status:
        all_users = [u for u in all_users if _compute_status(u) == status.lower()]

    total = len(all_users)

    # Sort newest first using created_at or ObjectId generation_time
    def _sort_key(u: User):
        if u.created_at:
            return u.created_at
        if u.id:
            return u.id.generation_time.replace(tzinfo=None)
        return datetime.min

    all_users.sort(key=_sort_key, reverse=True)
    start = (page - 1) * page_size

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": start + page_size < total,
        "users": [_user_summary(u) for u in all_users[start: start + page_size]],
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
async def update_user_role(user_id: str, body: RoleUpdate):
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
    u.suspended_at = datetime.utcnow()
    await u.save()
    return {"id": user_id, "status": "suspended"}


@router.patch("/users/{user_id}/activate", summary="Reactivate suspended user")
async def activate_user(user_id: str, admin: User = Depends(get_admin_user)):
    from bson import ObjectId
    u = await User.get(ObjectId(user_id))
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    u.is_active = True
    u.suspended_at = None
    await u.save()
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

    def _job_created(j) -> datetime:
        if j.id:
            return j.id.generation_time.replace(tzinfo=None)
        return datetime.min

    all_jobs.sort(key=_job_created, reverse=True)
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
    from app.models.escrow import Dispute
    try:
        all_disputes = await Dispute.find_all().to_list()
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
                "raised_by": str(d.raised_by) if d.raised_by else None,
                "raised_against": str(d.raised_against) if d.raised_against else None,
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
    from app.models.escrow import Escrow
    try:
        all_tx = await Escrow.find_all().to_list()
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
