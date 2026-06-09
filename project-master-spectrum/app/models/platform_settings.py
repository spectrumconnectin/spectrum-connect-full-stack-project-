from __future__ import annotations
from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field


class PlatformSettings(Document):
    """
    Singleton document — only one record ever exists (settings_id = "global").
    Admin reads/writes platform-wide feature flags here.
    """
    settings_id: str = "global"  # fixed key — always fetch this one doc

    # Feature flags
    etf_cashout_enabled:           bool = False
    maintenance_mode:              bool = False
    new_user_registration_enabled: bool = True
    job_posting_enabled:           bool = True
    review_queue_enabled:          bool = True
    skill_challenges_enabled:      bool = True
    disputes_enabled:              bool = True
    escrow_enabled:                bool = True

    # Maintenance message shown to users when maintenance_mode = True
    maintenance_message: str = "We are performing scheduled maintenance. Back shortly."

    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None  # admin username

    class Settings:
        name = "platform_settings"


class BroadcastNotification(Document):
    """History of all admin broadcast messages."""
    title:            str
    message:          str
    target_segment:   str = "all"   # all | creators | clients | verified | unverified | admins
    sent_by_id:       str
    sent_by_username: str
    recipient_count:  int = 0
    status:           str = "sent"  # sent | failed
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "broadcast_notifications"
        indexes = ["sent_by_id", "target_segment", "created_at"]
