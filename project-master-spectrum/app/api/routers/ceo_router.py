from __future__ import annotations
"""
Call the CEO API
================
Public submission of founder meeting requests, plus admin review + status
management. On submission the team inbox is emailed and the requester gets a
confirmation.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr

from app.auth.auth import get_admin_user, get_current_user_optional
from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.models.ceo_call import CeoCallRequest, CEO_CALL_STATUSES
from app.models.schema import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ceo-calls", tags=["Call the CEO"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class CeoCallCreate(BaseModel):
    full_name: str
    email: EmailStr
    company_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    subject: Optional[str] = None
    purpose: str = "other"
    message: Optional[str] = None
    meeting_type: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None


class CeoCallStatusUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None


# ── Public: submit a request ─────────────────────────────────────────────────

@router.post("", summary="Request a call with the founder")
async def submit_ceo_call(
    payload: CeoCallCreate,
    _user=Depends(get_current_user_optional),
    _rl: None = Depends(rate_limiter("ceo_call_submit_ip", limit=5, window_seconds=300)),
):
    doc = CeoCallRequest(
        full_name=payload.full_name.strip(),
        email=str(payload.email).lower().strip(),
        company_name=(payload.company_name or "").strip() or None,
        phone=(payload.phone or "").strip() or None,
        country=(payload.country or "").strip() or None,
        subject=(payload.subject or "").strip() or None,
        purpose=payload.purpose or "other",
        message=(payload.message or "").strip() or None,
        meeting_type=payload.meeting_type,
        preferred_date=payload.preferred_date,
        preferred_time=payload.preferred_time,
    )
    await doc.insert()

    # Notify the team inbox + confirm to the requester. Never let email
    # failures break the submission.
    try:
        from app.services.email import send_email
        purpose_label = payload.purpose.replace("_", " ").title()
        admin_html = f"""
            <h2>New "Call the CEO" request</h2>
            <p><strong>{doc.full_name}</strong> ({doc.email}) requested a founder call.</p>
            <table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif">
              <tr><td><strong>Purpose</strong></td><td>{purpose_label}</td></tr>
              <tr><td><strong>Company</strong></td><td>{doc.company_name or '—'}</td></tr>
              <tr><td><strong>Phone</strong></td><td>{doc.phone or '—'}</td></tr>
              <tr><td><strong>Country</strong></td><td>{doc.country or '—'}</td></tr>
              <tr><td><strong>Subject</strong></td><td>{doc.subject or '—'}</td></tr>
              <tr><td><strong>Meeting</strong></td><td>{(doc.meeting_type or '—')} · {doc.preferred_date or '—'} {doc.preferred_time or ''}</td></tr>
              <tr><td valign="top"><strong>Message</strong></td><td>{(doc.message or '—')}</td></tr>
            </table>
            <p>Review it in the admin panel under "Call the CEO".</p>
        """
        await send_email(str(settings.FROM_EMAIL), f"📞 Founder call request — {purpose_label}", admin_html)

        user_html = f"""
            <h2>Thanks, {doc.full_name.split(' ')[0]} — we received your request</h2>
            <p>Your request to speak with the Spectrum Connect founder has been received and is
            now under review. Priority is given to partnerships, investors, enterprise clients,
            and opportunities that help grow the Spectrum ecosystem.</p>
            <p>If it's a fit, we'll reach out to {doc.email} to schedule.</p>
            <p>— Spectrum Connect</p>
        """
        await send_email(doc.email, "We received your request to call the founder", user_html)
    except Exception as exc:
        logger.warning("CEO call email notification failed: %s", exc)

    return {"success": True, "id": str(doc.id), "message": "Your request has been received."}


# ── Admin: list + manage ─────────────────────────────────────────────────────

def _serialize(d: CeoCallRequest) -> dict:
    return {
        "id": str(d.id),
        "full_name": d.full_name,
        "email": d.email,
        "company_name": d.company_name,
        "phone": d.phone,
        "country": d.country,
        "subject": d.subject,
        "purpose": d.purpose,
        "message": d.message,
        "meeting_type": d.meeting_type,
        "preferred_date": d.preferred_date,
        "preferred_time": d.preferred_time,
        "status": d.status,
        "admin_notes": d.admin_notes,
        "created_at": d.id.generation_time.isoformat() if hasattr(d.id, "generation_time") else None,
        "updated_at": d.updated_at.isoformat() if d.updated_at else None,
    }


@router.get("/admin", summary="List founder call requests (admin)")
async def list_ceo_calls(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, le=300),
    admin: User = Depends(get_admin_user),
):
    query = CeoCallRequest.find()
    if status_filter and status_filter in CEO_CALL_STATUSES:
        query = CeoCallRequest.find(CeoCallRequest.status == status_filter)
    rows = await query.sort(-CeoCallRequest.id).limit(limit).to_list()

    # Status counts for the dashboard header
    counts: dict = {s: 0 for s in CEO_CALL_STATUSES}
    for d in await CeoCallRequest.find().to_list():
        counts[d.status] = counts.get(d.status, 0) + 1

    return {"requests": [_serialize(d) for d in rows], "total": len(rows), "counts": counts}


@router.patch("/admin/{request_id}", summary="Update a request's status / notes (admin)")
async def update_ceo_call(request_id: str, body: CeoCallStatusUpdate, admin: User = Depends(get_admin_user)):
    from beanie import PydanticObjectId
    try:
        doc = await CeoCallRequest.get(PydanticObjectId(request_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request id")
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")

    changes: dict = {"updated_at": datetime.utcnow()}
    if body.status is not None:
        if body.status not in CEO_CALL_STATUSES:
            raise HTTPException(status_code=400, detail=f"Status must be one of {CEO_CALL_STATUSES}")
        changes["status"] = body.status
    if body.admin_notes is not None:
        changes["admin_notes"] = body.admin_notes

    await doc.update({"$set": changes})
    doc = await CeoCallRequest.get(PydanticObjectId(request_id))
    return {"success": True, "request": _serialize(doc)}
