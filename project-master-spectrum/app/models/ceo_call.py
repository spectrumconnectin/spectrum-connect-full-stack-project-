"""
Call the CEO — founder meeting requests
=======================================
High-priority direct-to-founder meeting requests (partnerships, investors,
enterprise, media, feedback). Stored separately from generic contact messages
so they can carry their own status workflow and admin review.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field


# Status workflow for a request.
CEO_CALL_STATUSES = [
    "new", "under_review", "accepted", "scheduled", "completed", "declined",
]


class CeoCallRequest(Document):
    full_name: str
    email: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    subject: Optional[str] = None
    purpose: str = "other"            # partnership | investment | business | enterprise | feedback | media | other
    message: Optional[str] = None

    # Meeting preferences
    meeting_type: Optional[str] = None   # google_meet | zoom | phone
    preferred_date: Optional[str] = None # ISO date string (client-supplied)
    preferred_time: Optional[str] = None # free-form time string

    # Admin workflow
    status: str = "new"               # see CEO_CALL_STATUSES
    admin_notes: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "ceo_call_requests"
        indexes = [
            "status",
            "purpose",
            "email",
            "created_at",
            [("status", 1), ("created_at", -1)],
        ]
