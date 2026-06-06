from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field


class Report(Document):
    reported_by: Indexed(str)           # user ID who filed the report
    target_type: str                     # user | job | review | project | message
    target_id: str                       # ID of the reported item
    reason: str                          # short reason category
    details: Optional[str] = None        # optional longer description
    status: str = "pending"              # pending | under_review | resolved | dismissed
    assigned_to: Optional[str] = None   # admin user ID
    action_taken: Optional[str] = None  # warn | suspend | remove_content | ban | no_action
    admin_note: Optional[str] = None    # internal note
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "reports"
        indexes = [
            "reported_by",
            "target_type",
            "target_id",
            "status",
            "created_at",
            [("status", 1), ("created_at", -1)],
        ]
