"""
Reports Router
==============
User-facing endpoint to submit a report.

POST /reports   — any authenticated user can file a report
"""

from fastapi import APIRouter, Depends

from app.models.schema import User
from app.auth.auth import get_current_user
from app.services.report_service import ReportService
from app.api.schemas.report_schemas import CreateReportRequest

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("", summary="Submit a report")
async def create_report(
    request: CreateReportRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Submit a report about a user, job, review, project, or message.

    Our team reviews all reports within 2-3 business days.

    **Who:** Any authenticated user
    """
    result = await ReportService.create_report(
        reported_by_id=str(current_user.id),
        target_type=request.target_type,
        target_id=request.target_id,
        reason=request.reason,
        details=request.details,
    )
    return result
