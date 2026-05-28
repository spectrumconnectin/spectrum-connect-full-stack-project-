from __future__ import annotations
"""
Contact API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.services.contact_service import ContactService
from app.auth.auth import get_current_user_optional

router = APIRouter(prefix="/contact", tags=["Contact"])


class ContactRequest(BaseModel):
    full_name: str
    email: EmailStr
    subject: str | None = None
    message: str | None = None
    source: str | None = None


@router.post("")
async def submit_contact(
    payload: ContactRequest,
    user=Depends(get_current_user_optional),
):
    try:
        return await ContactService.create_message(
            full_name=payload.full_name,
            email=payload.email,
            subject=payload.subject,
            message=payload.message,
            source=payload.source or ("logged_in" if user else "web"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit contact request: {str(e)}",
        )

