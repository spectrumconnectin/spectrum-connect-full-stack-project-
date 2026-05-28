"""
Header API Routes

Endpoints for authenticated header/navigation data
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

from app.models.schema import User
from app.services.header_service import HeaderService
from app.auth.auth import get_current_user

router = APIRouter(prefix="/header", tags=["Header"])


@router.get("/")
async def get_header_data(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get header data for authenticated user

    Returns:
    - user: User profile info (name, avatar, role, online status)
    - notifications: Unread notification count
    """
    try:
        header_data = await HeaderService.get_header_data(str(current_user.id))
        return header_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load header data: {str(e)}"
        )
