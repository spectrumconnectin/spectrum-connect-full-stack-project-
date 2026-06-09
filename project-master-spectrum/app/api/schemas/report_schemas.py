from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class CreateReportRequest(BaseModel):
    """POST /reports  — user-facing"""
    target_type: str = Field(
        ...,
        description="user | job | review | project | message"
    )
    target_id: str = Field(..., description="ID of the item being reported")
    reason: str = Field(
        ...,
        description="harassment | spam | fake_profile | inappropriate_content | scam | copyright | other"
    )
    details: Optional[str] = Field(None, max_length=2000)


class ReportListItem(BaseModel):
    report_id: str
    reported_by_id: str
    reported_by_username: str
    target_type: str
    target_id: str
    reason: str
    status: str
    created_at: datetime


class ReportListResponse(BaseModel):
    reports: List[ReportListItem]
    total: int
    pending_count: int
    under_review_count: int
    resolved_count: int
    dismissed_count: int
    limit: int
    offset: int
    has_more: bool


class ReportDetailResponse(BaseModel):
    report_id: str
    reported_by_id: str
    reported_by_username: str
    reported_by_email: str
    target_type: str
    target_id: str
    reason: str
    details: Optional[str] = None
    status: str
    assigned_to: Optional[str] = None
    action_taken: Optional[str] = None
    admin_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime


class ResolveReportRequest(BaseModel):
    """PATCH /admin/reports/{id}/resolve"""
    action_taken: str = Field(
        ...,
        description="warn | suspend | remove_content | ban | no_action"
    )
    admin_note: Optional[str] = Field(None, max_length=1000)


class DismissReportRequest(BaseModel):
    """PATCH /admin/reports/{id}/dismiss"""
    admin_note: Optional[str] = Field(None, max_length=1000)


class ReportActionResponse(BaseModel):
    success: bool
    report_id: str
    new_status: str
    message: str
