"""
Account API Routes

Endpoints for user account settings and preferences
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.schema import User
from app.services.account_service import AccountService
from app.auth.auth import get_current_user
from app.api.schemas.account_schemas import (
    ProfileUpdateRequest,
    EmailUpdateRequest,
    PasswordUpdateRequest,
    PhoneUpdateRequest,
    NotificationSettingsRequest,
    PrivacySettingsRequest,
    AccountSettingsResponse,
    UpdateResponse,
)

router = APIRouter(prefix="/account", tags=["Account"])


@router.get("/settings", response_model=AccountSettingsResponse)
async def get_account_settings(
    current_user: User = Depends(get_current_user)
):
    """
    Get all account settings

    Returns:
    - profile: User profile information
    - notifications: Notification preferences
    - privacy: Privacy and security settings
    """
    try:
        settings = await AccountService.get_account_settings(str(current_user.id))
        return settings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load account settings: {str(e)}"
        )


@router.patch("/profile", response_model=UpdateResponse)
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Update user profile information

    Accepts:
    - first_name
    - last_name
    - display_name
    - avatar (URL)
    """
    try:
        success = await AccountService.update_profile(
            str(current_user.id),
            data.model_dump(exclude_unset=True)
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update profile"
            )

        return UpdateResponse(success=True, message="Profile updated successfully")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.patch("/email", response_model=UpdateResponse)
async def update_email(
    data: EmailUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update user email address"""
    try:
        success = await AccountService.update_email(
            str(current_user.id),
            data.new_email
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update email or email already in use"
            )

        return UpdateResponse(success=True, message="Email updated successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.patch("/password", response_model=UpdateResponse)
async def update_password(
    data: PasswordUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update user password"""
    try:
        success = await AccountService.update_password(
            str(current_user.id),
            data.current_password,
            data.new_password
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update password"
            )

        return UpdateResponse(success=True, message="Password updated successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.patch("/phone", response_model=UpdateResponse)
async def update_phone(
    data: PhoneUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update user phone number"""
    try:
        current_user.phone_number = data.new_phone
        await current_user.save()
        return UpdateResponse(success=True, message="Phone number updated successfully")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.patch("/notifications", response_model=UpdateResponse)
async def update_notification_settings(
    data: NotificationSettingsRequest,
    current_user: User = Depends(get_current_user)
):
    """Update notification preferences"""
    try:
        success = await AccountService.update_notification_settings(
            str(current_user.id),
            data.model_dump(exclude_unset=True)
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update notification settings"
            )

        return UpdateResponse(success=True, message="Notification settings updated successfully")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.patch("/privacy", response_model=UpdateResponse)
async def update_privacy_settings(
    data: PrivacySettingsRequest,
    current_user: User = Depends(get_current_user)
):
    """Update privacy and security settings"""
    try:
        success = await AccountService.update_privacy_settings(
            str(current_user.id),
            data.model_dump(exclude_unset=True)
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update privacy settings"
            )

        return UpdateResponse(success=True, message="Privacy settings updated successfully")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/deactivate", response_model=UpdateResponse)
async def deactivate_account(
    current_user: User = Depends(get_current_user)
):
    """
    Deactivate user account (soft delete)

    This marks the account as deleted without removing data
    """
    try:
        success = await AccountService.deactivate_account(str(current_user.id))

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to deactivate account"
            )

        return UpdateResponse(success=True, message="Account deactivated successfully")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
