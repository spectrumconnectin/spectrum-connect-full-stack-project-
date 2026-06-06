from __future__ import annotations
from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field


class AuditLog(Document):
    """
    Single source of truth for all admin-visible events on the platform.

    Two flavours:
      - USER ACTIONS  (login, signup, post job, apply, message, refund)
      - ADMIN ACTIONS (suspended user, approved review, refunded payment)

    Rich `metadata` dict keeps the schema stable — add new fields without migrations.
    """
    # Who did it
    actor_id:       Optional[PydanticObjectId] = None  # null = system action
    actor_role:     Optional[str] = None               # user | admin | moderator | system
    actor_username: Optional[str] = None               # denormalized for fast read

    # What happened
    event_type:  str                    # e.g. "user.login", "admin.user.suspended"
    target_type: Optional[str] = None  # "user" | "job" | "project" | "payment" | ...
    target_id:   Optional[str] = None  # opaque id of the target

    # HTTP context
    ip_address:     Optional[str] = None
    user_agent:     Optional[str] = None
    request_path:   Optional[str] = None
    request_method: Optional[str] = None
    status_code:    Optional[int] = None

    # Free-form payload — keep it < 2 KB
    metadata: Optional[dict] = None

    # Severity for filtering
    severity: str = "info"  # debug | info | warning | error | critical

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "audit_logs"
        indexes = [
            "actor_id",
            "event_type",
            "target_type",
            "target_id",
            "severity",
            "created_at",
            [("event_type", 1), ("created_at", -1)],
            [("actor_id",   1), ("created_at", -1)],
            [("severity",   1), ("created_at", -1)],
        ]
