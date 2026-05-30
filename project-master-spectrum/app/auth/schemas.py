from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
import re

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8, max_length=128)
    phone_number: str = Field(..., description="Phone number in E.164 format (e.g., +1234567890)")
    phone_country_code: Optional[str] = Field(None, description="Country code (e.g., US, IN, GB)")
    account_type: str
    name: Optional[str] = None  # Full name from signup form

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if not v.startswith('+'):
            raise ValueError('Phone number must start with + (E.164 format)')
        if not re.match(r'^\+[1-9]\d{1,14}$', v):
            raise ValueError('Invalid phone number format. Use E.164 format (e.g., +1234567890)')
        return v

    @validator('username')
    def validate_username(cls, v):
        # Username may contain letters, digits, dot, dash, underscore.
        if not re.match(r'^[A-Za-z0-9._-]+$', v):
            raise ValueError('Username may only contain letters, digits, ".", "_" and "-".')
        return v

    @validator('password')
    def validate_password_strength(cls, v):
        # Require some basic complexity to defend against trivial credential stuffing.
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Za-z]', v) or not re.search(r'\d', v):
            raise ValueError('Password must contain both letters and numbers')
        return v

    @validator('account_type')
    def validate_account_type(cls, v):
        if v not in {'crew', 'producer', 'both'}:
            raise ValueError("account_type must be 'crew', 'producer', or 'both'")
        return v

class UserRead(BaseModel):
    id: str
    email: EmailStr
    username: str
    account_type: str
    dev_otp: Optional[str] = None  # shown in UI when email is not configured

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Onboarding schemas
class CreatorOnboarding(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None  # Maps to profile.tagline
    location: Optional[str] = None  # City, Country string
    rate_min: Optional[float] = None
    rate_max: Optional[float] = None
    skills: Optional[list[str]] = None  # List of skill names
    portfolio_url: Optional[str] = None  # Maps to profile.website
    matchmaking: Optional[bool] = True  # Smart Connect enabled
    bio: Optional[str] = None

class ProducerOnboarding(BaseModel):
    name: Optional[str] = None
    org: Optional[str] = None  # Organization/company name
    team_size: Optional[str] = None
    location: Optional[str] = None  # City, Country string
    first_job_title: Optional[str] = None
    brief: Optional[str] = None
    audience: Optional[str] = None
    goals: Optional[list[str]] = None
    tone: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    timeline: Optional[str] = None
    create_starter_job: Optional[bool] = False

# ============================================================================
# PHONE AUTH SCHEMAS
# ============================================================================

class PhoneSignupRequest(BaseModel):
    """Phone number signup - step 1: Send OTP"""
    phone_number: str = Field(..., description="Phone number in E.164 format (e.g., +1234567890)")
    phone_country_code: Optional[str] = Field(None, description="Country code (e.g., US, IN, GB)")

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if not v.startswith('+'):
            raise ValueError('Phone number must start with + (E.164 format)')
        if not re.match(r'^\+[1-9]\d{1,14}$', v):
            raise ValueError('Invalid phone number format. Use E.164 format (e.g., +1234567890)')
        return v


class PhoneSignupVerifyRequest(BaseModel):
    """Phone number signup - step 2: Verify OTP and complete signup"""
    phone_number: str = Field(..., description="Phone number in E.164 format")
    otp_code: str = Field(..., min_length=6, max_length=6)
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8)
    account_type: str = Field(..., description="crew, producer, or both")
    phone_country_code: Optional[str] = None
    name: Optional[str] = None

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if not v.startswith('+'):
            raise ValueError('Phone number must start with +')
        if not re.match(r'^\+[1-9]\d{1,14}$', v):
            raise ValueError('Invalid phone number format')
        return v

    @validator('otp_code')
    def validate_otp_code(cls, v):
        if not v.isdigit():
            raise ValueError('OTP must be digits only')
        return v

    @validator('account_type')
    def validate_account_type(cls, v):
        if v not in ['crew', 'producer', 'both']:
            raise ValueError('account_type must be crew, producer, or both')
        return v


class PhoneLoginRequest(BaseModel):
    """Phone number login - step 1: Send OTP"""
    phone_number: str = Field(..., description="Phone number in E.164 format")

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if not v.startswith('+'):
            raise ValueError('Phone number must start with +')
        if not re.match(r'^\+[1-9]\d{1,14}$', v):
            raise ValueError('Invalid phone number format')
        return v


class PhoneLoginVerifyRequest(BaseModel):
    """Phone number login - step 2: Verify OTP"""
    phone_number: str = Field(..., description="Phone number in E.164 format")
    otp_code: str = Field(..., min_length=6, max_length=6)

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if not v.startswith('+'):
            raise ValueError('Phone number must start with +')
        if not re.match(r'^\+[1-9]\d{1,14}$', v):
            raise ValueError('Invalid phone number format')
        return v

    @validator('otp_code')
    def validate_otp_code(cls, v):
        if not v.isdigit():
            raise ValueError('OTP must be digits only')
        return v


class SendOTPRequest(BaseModel):
    """Send OTP request (generic)"""
    phone_number: str = Field(..., description="Phone number in E.164 format")
    purpose: str = Field(default="verification", description="signup, login, verification, password_reset")

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if not v.startswith('+'):
            raise ValueError('Phone number must start with +')
        if not re.match(r'^\+[1-9]\d{1,14}$', v):
            raise ValueError('Invalid phone number format')
        return v

    @validator('purpose')
    def validate_purpose(cls, v):
        if v not in ['signup', 'login', 'verification', 'password_reset']:
            raise ValueError('purpose must be signup, login, verification, or password_reset')
        return v


class OTPResponse(BaseModel):
    """OTP send response"""
    success: bool = True
    message: str
    dev_otp: Optional[str] = None  # shown in UI when email is not configured
    expires_in_seconds: Optional[int] = 600


# ============================================================================
# PASSWORD RESET SCHEMAS
# ============================================================================

class PasswordResetRequest(BaseModel):
    """Request password reset - sends email with reset link"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm password reset with token"""
    token: str = Field(..., description="Reset token from email")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password (min 8 characters)")

    @validator('new_password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Za-z]', v) or not re.search(r'\d', v):
            raise ValueError('Password must contain both letters and numbers')
        return v
