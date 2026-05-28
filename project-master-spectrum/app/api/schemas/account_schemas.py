"""
Account API Schemas

Request/Response schemas for account settings endpoints
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any


class ProfileUpdateRequest(BaseModel):
    """Request schema for updating profile"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar: Optional[str] = None


class EmailUpdateRequest(BaseModel):
    """Request schema for updating email"""
    new_email: EmailStr


class PasswordUpdateRequest(BaseModel):
    """Request schema for updating password"""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class NotificationSettingsRequest(BaseModel):
    """Request schema for notification settings"""
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    marketing_emails: Optional[bool] = None


class PhoneUpdateRequest(BaseModel):
    """Request schema for updating phone number"""
    new_phone: str = Field(..., description="E.164 format, e.g. +12025551234")


class PrivacySettingsRequest(BaseModel):
    """Request schema for privacy settings"""
    profile_visibility: Optional[str] = None  # "public", "connections", "private"
    two_factor_auth: Optional[bool] = None
    show_location: Optional[bool] = None
    show_earnings: Optional[bool] = None


class AccountSettingsResponse(BaseModel):
    """Response schema for account settings"""
    profile: Optional[Dict[str, Any]] = None
    notifications: Dict[str, bool] = {}
    privacy: Dict[str, Any] = {}


class UpdateResponse(BaseModel):
    """Generic update response"""
    success: bool
    message: str
