from datetime import datetime
from typing import Any, Dict, Optional

from beanie import PydanticObjectId
from fastapi import HTTPException

from app.models.report import Report
from app.models.schema import User


class ReportService:

    @staticmethod
    async def create_report(
        reported_by_id: str,
        target_type: str,
        target_id: str,
        reason: str,
        details: Optional[str] = None,
    ) -> Dict[str, Any]:
        report = Report(
            reported_by=reported_by_id,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
            details=details,
        )
        await report.insert()
        return {
            "success": True,
            "report_id": str(report.id),
            "message": "Report submitted. Our team will review it within 2-3 business days.",
        }

    @staticmethod
    async def get_all_reports(
        status_filter: Optional[str] = None,
        target_type: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        query = Report.find()
        if status_filter:
            query = Report.find(Report.status == status_filter)
        if target_type:
            query = Report.find(Report.target_type == target_type)
        if status_filter and target_type:
            query = Report.find(
                Report.status == status_filter,
                Report.target_type == target_type,
            )

        total = await query.count()
        reports_raw = (
            await query.sort(-Report.created_at).skip(offset).limit(limit).to_list()
        )

        all_reports = await Report.find().to_list()
        pending_count      = sum(1 for r in all_reports if r.status == "pending")
        under_review_count = sum(1 for r in all_reports if r.status == "under_review")
        resolved_count     = sum(1 for r in all_reports if r.status == "resolved")
        dismissed_count    = sum(1 for r in all_reports if r.status == "dismissed")

        items = []
        for r in reports_raw:
            reporter = await User.get(r.reported_by)
            items.append({
                "report_id":            str(r.id),
                "reported_by_id":       str(r.reported_by),
                "reported_by_username": reporter.username if reporter else "unknown",
                "target_type":          r.target_type,
                "target_id":            r.target_id,
                "reason":               r.reason,
                "status":               r.status,
                "created_at":           r.created_at,
            })

        return {
            "reports":            items,
            "total":              total,
            "pending_count":      pending_count,
            "under_review_count": under_review_count,
            "resolved_count":     resolved_count,
            "dismissed_count":    dismissed_count,
            "limit":              limit,
            "offset":             offset,
            "has_more":           (offset + limit) < total,
        }

    @staticmethod
    async def get_report_by_id(report_id: str) -> Dict[str, Any]:
        try:
            r = await Report.get(PydanticObjectId(report_id))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid report ID.")
        if not r:
            raise HTTPException(status_code=404, detail="Report not found.")

        reporter = await User.get(r.reported_by)
        return {
            "report_id":            str(r.id),
            "reported_by_id":       str(r.reported_by),
            "reported_by_username": reporter.username if reporter else "unknown",
            "reported_by_email":    reporter.email if reporter else "unknown",
            "target_type":          r.target_type,
            "target_id":            r.target_id,
            "reason":               r.reason,
            "details":              r.details,
            "status":               r.status,
            "assigned_to":          r.assigned_to,
            "action_taken":         r.action_taken,
            "admin_note":           r.admin_note,
            "resolved_at":          r.resolved_at,
            "created_at":           r.created_at,
        }

    @staticmethod
    async def resolve_report(
        report_id: str,
        admin_user_id: str,
        action_taken: str,
        admin_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            r = await Report.get(PydanticObjectId(report_id))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid report ID.")
        if not r:
            raise HTTPException(status_code=404, detail="Report not found.")
        if r.status == "resolved":
            raise HTTPException(status_code=400, detail="Report is already resolved.")

        r.status = "resolved"
        r.action_taken = action_taken
        r.admin_note = admin_note
        r.assigned_to = admin_user_id
        r.resolved_at = datetime.utcnow()
        await r.save()

        return {
            "success": True,
            "report_id": str(r.id),
            "new_status": "resolved",
            "message": "Report resolved.",
        }

    @staticmethod
    async def dismiss_report(
        report_id: str,
        admin_user_id: str,
        admin_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            r = await Report.get(PydanticObjectId(report_id))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid report ID.")
        if not r:
            raise HTTPException(status_code=404, detail="Report not found.")
        if r.status in ("resolved", "dismissed"):
            raise HTTPException(status_code=400, detail=f"Report is already {r.status}.")

        r.status = "dismissed"
        r.admin_note = admin_note
        r.assigned_to = admin_user_id
        r.resolved_at = datetime.utcnow()
        await r.save()

        return {
            "success": True,
            "report_id": str(r.id),
            "new_status": "dismissed",
            "message": "Report dismissed.",
        }
