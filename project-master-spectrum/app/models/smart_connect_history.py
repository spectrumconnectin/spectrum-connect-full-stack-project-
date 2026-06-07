"""
SmartConnectHistory model
=========================
Tracks when users act on Smart Connect matches (apply, invite, save, skip).
Used to power the "Match History" tab on both creator and client Smart Connect pages.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field


class SmartConnectHistory(Document):
    """Records a user acting on a Smart Connect match recommendation."""

    # Who took the action
    user_id: Indexed(str)

    # The other party involved
    match_user_id: Optional[str] = None   # creator_id (for clients) or client_id (for creators)
    match_job_id: Optional[str] = None    # job_id that was matched

    # What the match looked like at the time of action
    match_title: str                       # job title or creator name
    match_subtitle: Optional[str] = None  # tagline / department / role
    match_avatar: Optional[str] = None    # profile picture or None
    match_score: Optional[int] = None     # 0-100 match percentage

    # What the user did
    action: str  # "applied" | "invited" | "saved" | "skipped" | "messaged"

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "smart_connect_history"
        indexes = [
            "user_id",
            [("user_id", 1), ("created_at", -1)],
        ]
