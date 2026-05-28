"""
Client Dashboard API Routes

Endpoints for client dashboard data
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

from app.models.schema import User
from app.services.dashboard_service import DashboardService
from app.auth.auth import get_current_user

router = APIRouter(prefix="/client", tags=["Client Dashboard"])


@router.get("/dashboard")
async def get_client_dashboard(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get complete client dashboard data

    Returns:
    - Active jobs with workspace info
    - Team activity feed
    - Recent messages preview
    - Upcoming deadlines
    - Community spotlight projects
    """
    try:
        dashboard_data = await DashboardService.get_client_dashboard(str(current_user.id))
        return dashboard_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard data: {str(e)}"
        )
