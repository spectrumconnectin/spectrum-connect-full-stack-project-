from datetime import datetime, timedelta
from typing import Dict
import logging
import secrets
import random

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm

from app.models.schema import User, Profile, Location, Skill, CrewProfile
from .auth import get_password_hash, verify_password, create_access_token, get_current_user
from .schemas import UserCreate, UserRead, Token, CreatorOnboarding, ProducerOnboarding, PasswordResetRequest, PasswordResetConfirm, OTPResponse
from .oauth import google_oauth_client, facebook_oauth_client
from app.services.email import send_email, get_verification_email_html, get_password_reset_email_html
from app.services.verification import create_verification_token, verify_token, create_password_reset_token, verify_password_reset_token
from app.core.config import settings
from app.core.rate_limit import rate_limiter

router = APIRouter()
logger = logging.getLogger(__name__)

# In‑memory store mapping OAuth "state" values to issued JWTs.
oauth_state_tokens: Dict[str, str] = {}

# In-memory OTP store: email -> {otp, expires_at}
_otp_store: Dict[str, Dict] = {}


# ============================================================================
# OTP ENDPOINTS
# ============================================================================

from pydantic import BaseModel as _PydanticBase

class OTPSendRequest(_PydanticBase):
    email: str
    purpose: str = "verification"  # verification | login | password_reset

class OTPVerifyRequest(_PydanticBase):
    email: str
    otp: str


@router.post("/otp/send", response_model=OTPResponse, summary="Send OTP (prints to console in dev)")
async def send_otp(request: OTPSendRequest):
    """
    Generate a 6-digit OTP for the given email.
    Since email is not integrated, the OTP is printed to the server console
    and also returned in the response (dev mode only).
    """
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    _otp_store[request.email] = {"otp": otp, "expires_at": expires_at, "purpose": request.purpose}

    print("\n" + "=" * 55)
    print(f"  📧  OTP for: {request.email}")
    print(f"  🔑  Code:    {otp}")
    print(f"  ⏱   Purpose: {request.purpose}")
    print(f"  ⌛  Expires: {expires_at.strftime('%H:%M:%S')} UTC (10 min)")
    print("=" * 55 + "\n")

    return {
        "success": True,
        "message": "OTP generated",
        "phone_number": request.email,
        "expires_in_seconds": 600,
        "dev_otp": otp,  # shown in UI since email is not integrated
    }


@router.post("/otp/verify", summary="Verify OTP and mark account as verified")
async def verify_otp(request: OTPVerifyRequest):
    """Verify OTP code for the given email. Marks user as verified on success."""
    stored = _otp_store.get(request.email)
    if not stored:
        raise HTTPException(status_code=400, detail="No OTP found for this email. Please request a new one.")
    if stored["expires_at"] < datetime.utcnow():
        _otp_store.pop(request.email, None)
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    if stored["otp"] != request.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check and try again.")

    _otp_store.pop(request.email, None)

    user = await User.find_one(User.email == request.email)
    if user and not user.is_verified:
        user.is_verified = True
        await user.save()

    logger.info(f"OTP verified for {request.email}")
    return {"success": True, "message": "Email verified successfully. You can now log in."}

@router.get("/google_login")
async def google_login():
    """
    Redirects to Google's authorization page.
    """
    authorize_request_url = await google_oauth_client.get_authorization_url(
        redirect_uri=google_oauth_client.redirect_uri
    )
    return RedirectResponse(authorize_request_url)

@router.post("/register", response_model=UserRead, summary="Register new user")
async def register_user(user: UserCreate):
    """
    Register a new user account.
    
    **Request Body:**
    ```json
    {
        "email": "user@example.com",
        "username": "johndoe",
        "password": "SecurePass123!",
        "account_type": "crew"  // Options: "crew", "producer", "both"
    }
    ```
    
    **Response:**
    ```json
    {
        "id": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "username": "johndoe",
        "account_type": "crew"
    }
    ```
    
    **Notes:**
    - Verification email will be sent to the provided email address
    - User must verify email before logging in
    - Username must be unique
    - Email must be unique
    """
    existing_user = await User.find_one(User.email == user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_username = await User.find_one(User.username == user.username)
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Check if phone number is already registered
    existing_phone = await User.find_one(User.phone_number == user.phone_number)
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    hashed_password = get_password_hash(user.password)

    # Parse name into first_name and last_name if provided
    profile = None
    if user.name:
        name_parts = user.name.strip().split(maxsplit=1)
        if len(name_parts) == 1:
            # Only one name provided, use as display_name
            profile = Profile(display_name=name_parts[0])
        else:
            # Split into first and last name
            profile = Profile(first_name=name_parts[0], last_name=name_parts[1])

    user_db = User(
        email=user.email,
        username=user.username,
        password_hash=hashed_password,
        phone_number=user.phone_number,
        phone_country_code=user.phone_country_code,
        phone_verified=False,
        account_type=user.account_type,
        profile=profile,
    )
    await user_db.insert()

    # Generate OTP and print to console (email not integrated in dev)
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    _otp_store[user_db.email] = {"otp": otp, "expires_at": expires_at, "purpose": "verification"}

    print("\n" + "=" * 55)
    print(f"  🆕  NEW USER REGISTERED: {user_db.username}")
    print(f"  📧  Email:   {user_db.email}")
    print(f"  🔑  OTP:     {otp}")
    print(f"  ⌛  Expires: {expires_at.strftime('%H:%M:%S')} UTC (10 min)")
    print(f"  👉  Use POST /auth/otp/verify to verify")
    print("=" * 55 + "\n")

    # Also attempt email (will silently fail in dev)
    try:
        token = create_verification_token(user_db.email)
        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        html = get_verification_email_html(user_db.username, verification_link)
        await send_email(user_db.email, "Verify your Spectrum Connect account", html)
    except Exception:
        pass

    return {
        "id": str(user_db.id),
        "email": user_db.email,
        "username": user_db.username,
        "account_type": user_db.account_type,
        "dev_otp": otp,  # shown in UI since email is not integrated
    }

@router.post("/login", response_model=Token, summary="Login user")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    _: None = Depends(rate_limiter("auth_login_ip", limit=10, window_seconds=60)),
):
    """
    Authenticate user and return JWT access token.
    
    **Request Body (form-data):**
    ```
    username: johndoe  (can be username OR email)
    password: SecurePass123!
    ```

    **Response:**
    ```json
    {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "bearer"
    }
    ```

    **Usage:**
    - Include token in Authorization header: `Bearer <access_token>`
    - Token expires in 30 minutes (default)
    - User must have verified email to login
    - You can login with either username OR email

    **Errors:**
    - 401: Invalid credentials
    - 403: Email not verified
    """
    # Try to find user by username OR email
    from beanie.odm.operators.find.logical import Or

    user = await User.find_one(
        Or(User.username == form_data.username, User.email == form_data.username)
    )

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Please verify your email before logging in", "email": user.email}
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/google_callback")
async def google_callback(code: str, state: str | None = None):
    """
    Handles the Google OAuth2 callback.

    Security notes:
    - Uses a per-user random password for OAuth-created accounts instead
      of a static shared password.
    - Sets httpOnly cookies for auth_token and user_role
    - Also includes token in URL for backward compatibility
    """
    try:
        import httpx

        token_response = await google_oauth_client.get_access_token(
            code, google_oauth_client.redirect_uri
        )
        access_token_value = token_response["access_token"]

        async with httpx.AsyncClient() as client:
            response_http = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token_value}"},
            )
            user_data = response_http.json()
            email = user_data["email"]
            user_id = user_data["id"]

        user = await User.find_one(User.email == email)
        if user:
            if not user.oauth or not user.oauth.google:
                from app.models.schema import OAuth, GoogleOAuth

                if not user.oauth:
                    user.oauth = OAuth()
                user.oauth.google = GoogleOAuth(
                    id=user_id,
                    email=email,
                    access_token=access_token_value,
                    connected_at=datetime.utcnow(),
                )
                await user.save()
            jwt_token = create_access_token(data={"sub": user.username})
        else:
            username = email.split("@")[0]
            existing = await User.find_one(User.username == username)
            if existing:
                username = f"{username}_{user_id[:8]}"

            from app.models.schema import OAuth, GoogleOAuth

            # Generate a strong random password so there is no shared
            # static password across OAuth users. This password is not
            # revealed to the user; they should use OAuth to sign in
            # or go through a dedicated "set password" flow.
            random_password = secrets.token_urlsafe(32)
            hashed_password = get_password_hash(random_password)

            new_user = User(
                email=email,
                username=username,
                password_hash=hashed_password,
                account_type="crew",
                is_verified=True,
                oauth=OAuth(
                    google=GoogleOAuth(
                        id=user_id,
                        email=email,
                        access_token=access_token_value,
                        connected_at=datetime.utcnow(),
                    )
                ),
            )
            await new_user.insert()
            jwt_token = create_access_token(data={"sub": new_user.username})
            user = new_user

        # Create redirect response with cookies
        redirect_url = f"{settings.FRONTEND_URL}/oauth-callback?token={jwt_token}"
        response = RedirectResponse(redirect_url, status_code=302)

        # Set auth_token cookie
        response.set_cookie(
            key="auth_token",
            value=jwt_token,
            httponly=True,
            secure=settings.ENVIRONMENT == "production",
            samesite="lax",
            max_age=604800,  # 7 days
        )

        # Set user_role cookie
        role_map = {"crew": "creator", "producer": "client", "both": "both"}
        user_role = role_map.get(user.account_type, "creator")
        response.set_cookie(
            key="user_role",
            value=user_role,
            httponly=True,
            secure=settings.ENVIRONMENT == "production",
            samesite="lax",
            max_age=604800,
        )

        return response
    except Exception:
        logger.exception("Google OAuth callback failed")
        # Redirect with a generic error indicator; avoid leaking details.
        return RedirectResponse(f"{settings.FRONTEND_URL}/oauth-error")

# ============================================================================
# FACEBOOK OAUTH - COMMENTED OUT (Not used by frontend)
# ============================================================================
# @router.get("/facebook_login")
# async def facebook_login():
#     authorize_request_url = await facebook_oauth_client.get_authorization_url(
#         redirect_uri=facebook_oauth_client.redirect_uri
#     )
#     return RedirectResponse(authorize_request_url)

# @router.get("/facebook_callback")
# async def facebook_callback(code: str, state: str | None = None):
#     """
#     Handles the Facebook OAuth2 callback.
#
#     Security notes:
#     - Uses a per-user random password for OAuth-created accounts instead
#       of a static shared password.
#     - For dev compatibility with the existing frontend, this endpoint
#       returns the JWT as a `?token=` query parameter to the frontend.
#     """
#     try:
#         import httpx
#
#         token_response = await facebook_oauth_client.get_access_token(
#             code, facebook_oauth_client.redirect_uri
#         )
#         access_token_value = token_response["access_token"]
#         
#         async with httpx.AsyncClient() as client:
#             response = await client.get(
#                 "https://graph.facebook.com/me?fields=id,email",
#                 headers={"Authorization": f"Bearer {access_token_value}"},
#             )
#             user_data = response.json()
#             email = user_data.get("email")
#             user_id = user_data["id"]
#             
#             if not email:
#                 # Some Facebook apps don't return email; treat as error but don't leak details.
#                 logger.warning("Facebook OAuth callback without email for user_id=%s", user_id)
#                 return RedirectResponse(f"{settings.FRONTEND_URL}/oauth-error")
#
#         user = await User.find_one(User.email == email)
#         if user:
#             if not user.oauth or not user.oauth.facebook:
#                 from app.models.schema import OAuth, FacebookOAuth
#
#                 if not user.oauth:
#                     user.oauth = OAuth()
#                 user.oauth.facebook = FacebookOAuth(
#                     id=user_id,
#                     email=email,
#                     access_token=access_token_value,
#                     connected_at=datetime.utcnow(),
#                 )
#                 await user.save()
#             jwt_token = create_access_token(data={"sub": user.username})
#         else:
#             username = email.split("@")[0]
#             existing = await User.find_one(User.username == username)
#             if existing:
#                 username = f"{username}_{user_id[:8]}"
#             
#             from app.models.schema import OAuth, FacebookOAuth
#
#             random_password = secrets.token_urlsafe(32)
#             hashed_password = get_password_hash(random_password)
#
#             new_user = User(
#                 email=email,
#                 username=username,
#                 password_hash=hashed_password,
#                 account_type="crew",
#                 is_verified=True,
#                 oauth=OAuth(
#                     facebook=FacebookOAuth(
#                         id=user_id,
#                         email=email,
#                         access_token=access_token_value,
#                         connected_at=datetime.utcnow(),
#                     )
#                 ),
#             )
#             await new_user.insert()
#             jwt_token = create_access_token(data={"sub": new_user.username})
#         
#         # Redirect to OAuth callback page with token
#         return RedirectResponse(f"{settings.FRONTEND_URL}/oauth-callback?token={jwt_token}")
#     except Exception:
#         logger.exception("Facebook OAuth callback failed")
#         return RedirectResponse(f"{settings.FRONTEND_URL}/oauth-error")


@router.get(
    "/oauth-token",
    response_model=Token,
    summary="Exchange OAuth state for JWT (reserved for future use)",
)
async def get_oauth_token(state: str):
    """
    Reserved for a future, more secure state-based OAuth flow.

    Currently unused by the frontend – OAuth flows redirect directly with
    `?token=` for compatibility in dev. When you are ready to harden the
    frontend, you can switch to exchanging state for tokens instead.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="State-based OAuth token exchange is not enabled in this environment.",
    )

@router.get("/verify-email", summary="Verify email address")
async def verify_email(token: str):
    """
    Verify user email address using token from email.
    
    **Query Parameters:**
    - token: Verification token from email link
    
    **Response:**
    ```json
    {
        "message": "Email verified successfully"
    }
    ```
    """
    email = verify_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    user = await User.find_one(User.email == email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        return JSONResponse({"message": "Email already verified"})
    
    user.is_verified = True
    await user.save()
    return JSONResponse({"message": "Email verified successfully"})

@router.post("/resend-verification", summary="Resend verification email")
async def resend_verification(
    email: str,
    _: None = Depends(
        rate_limiter("resend_verification_ip", limit=5, window_seconds=300)
    ),
):
    """
    Resend verification email to user.
    
    **Query Parameters:**
    - email: User's email address
    
    **Response:**
    ```json
    {
        "message": "Verification email sent"
    }
    ```
    """
    user = await User.find_one(User.email == email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    try:
        token = create_verification_token(user.email)
        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        html = get_verification_email_html(user.username, verification_link)
        success = await send_email(user.email, "Verify your Spectrum Connect account", html)
        if success:
            return JSONResponse({"message": "Verification email sent"})
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email error: {str(e)}")

@router.post("/reset-password", summary="Request password reset")
async def request_password_reset(
    request: PasswordResetRequest,
    _: None = Depends(
        rate_limiter("password_reset_ip", limit=5, window_seconds=300)
    ),
):
    """
    Request a password reset link.

    **Request Body:**
    ```json
    {
        "email": "user@example.com"
    }
    ```

    **Response:**
    ```json
    {
        "message": "If an account exists with that email, you will receive a password reset link"
    }
    ```

    **Notes:**
    - For security, always returns success even if email doesn't exist
    - Reset link expires in 1 hour
    - Rate limited to 5 requests per 5 minutes per IP
    """
    # For security, we always return success even if user doesn't exist
    # This prevents email enumeration attacks
    user = await User.find_one(User.email == request.email)

    if user:
        try:
            # Create reset token
            reset_token = create_password_reset_token(user.email)
            reset_link = f"{settings.FRONTEND_URL}/reset-password/confirm?token={reset_token}"

            # Send email
            html = get_password_reset_email_html(user.username, reset_link)
            await send_email(
                user.email,
                "Reset Your Spectrum Connect Password",
                html
            )
            logger.info(f"Password reset email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            # Still return success to prevent information leakage

    # Always return the same response for security
    return JSONResponse({
        "message": "If an account exists with that email, you will receive a password reset link"
    })

@router.post("/reset-password/confirm", summary="Confirm password reset")
async def confirm_password_reset(
    request: PasswordResetConfirm,
):
    """
    Reset password using reset token from email.

    **Request Body:**
    ```json
    {
        "token": "reset-token-from-email",
        "new_password": "newSecurePassword123"
    }
    ```

    **Response:**
    ```json
    {
        "message": "Password reset successful"
    }
    ```

    **Errors:**
    - 400: Invalid or expired token
    - 404: User not found
    - 500: Failed to update password
    """
    # Verify token and get email
    email = verify_password_reset_token(request.token)
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token"
        )

    # Find user
    user = await User.find_one(User.email == email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password
    try:
        user.password_hash = get_password_hash(request.new_password)
        await user.save()
        logger.info(f"Password reset successful for user: {user.email}")

        return JSONResponse({
            "message": "Password reset successful. You can now log in with your new password."
        })
    except Exception as e:
        logger.error(f"Failed to reset password for {user.email}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update password. Please try again."
        )

@router.post("/onboarding/creator", summary="Complete creator onboarding")
async def creator_onboarding(
    data: CreatorOnboarding,
    current_user: User = Depends(get_current_user),
):
    """
    Complete onboarding for creator/crew accounts.
    
    Updates user profile and creates/updates crew profile with:
    - Headline, bio, location
    - Skills
    - Rate range
    - Portfolio URL
    - Smart Connect preferences
    """
    from beanie import PydanticObjectId
    
    # Initialize profile if it doesn't exist
    if not current_user.profile:
        current_user.profile = Profile()
    
    # Update profile fields
    if data.name:
        name_parts = data.name.strip().split(maxsplit=1)
        if len(name_parts) == 1:
            current_user.profile.display_name = name_parts[0]
        else:
            current_user.profile.first_name = name_parts[0]
            current_user.profile.last_name = name_parts[1]
    
    if data.headline:
        current_user.profile.headline = data.headline
        current_user.profile.tagline = data.headline
    
    if data.bio:
        current_user.profile.bio = data.bio
    
    if data.location:
        # Parse "City, Country" format
        location_parts = [p.strip() for p in data.location.split(",")]
        if not current_user.profile.location:
            current_user.profile.location = Location()
        if len(location_parts) >= 1:
            current_user.profile.location.city = location_parts[0]
        if len(location_parts) >= 2:
            current_user.profile.location.country = location_parts[1]
    
    if data.portfolio_url:
        current_user.profile.website = data.portfolio_url
    
    # Add skills
    if data.skills:
        if not current_user.profile.skills:
            current_user.profile.skills = []
        # Convert skill names to Skill objects
        existing_skill_names = {s.name.lower() for s in current_user.profile.skills}
        for skill_name in data.skills:
            if skill_name.lower() not in existing_skill_names:
                current_user.profile.skills.append(Skill(name=skill_name))

    # Rates
    if data.rate_min is not None:
        current_user.profile.hourly_rate_min = data.rate_min
    if data.rate_max is not None:
        current_user.profile.hourly_rate_max = data.rate_max
    
    await current_user.save()
    
    # Create or update CrewProfile
    if current_user.account_type in ["crew", "both"]:
        crew_profile = await CrewProfile.find_one(CrewProfile.user_id == current_user.id)
        
        if not crew_profile:
            crew_profile = CrewProfile(user_id=current_user.id)
        
        # Update rates (prefer hourly; fall back to daily for now)
        if data.rate_min is not None:
            crew_profile.hourly_rate = data.rate_min
            crew_profile.daily_rate = data.rate_min * 8
        if data.rate_max is not None and crew_profile.daily_rate is None:
            crew_profile.daily_rate = data.rate_max * 8
        
        # Update title from headline if available
        if data.headline:
            crew_profile.title = data.headline
        
        # Store matchmaking preference (could be in settings or crew profile)
        # For now, we'll note it in the crew profile
        
        await crew_profile.save()
    
    return JSONResponse({"message": "Creator onboarding completed successfully"})

@router.post("/onboarding/producer", summary="Complete producer/client onboarding")
async def producer_onboarding(
    data: ProducerOnboarding,
    current_user: User = Depends(get_current_user),
):
    """
    Complete onboarding for producer/client accounts.
    
    Updates user profile with:
    - Organization name
    - Team size
    - Location
    - Preferences
    """
    # Initialize profile if it doesn't exist
    if not current_user.profile:
        current_user.profile = Profile()
    
    # Update name
    if data.name:
        name_parts = data.name.strip().split(maxsplit=1)
        if len(name_parts) == 1:
            current_user.profile.display_name = name_parts[0]
        else:
            current_user.profile.first_name = name_parts[0]
            current_user.profile.last_name = name_parts[1]
    
    # Update location
    if data.location:
        location_parts = [p.strip() for p in data.location.split(",")]
        if not current_user.profile.location:
            current_user.profile.location = Location()
        if len(location_parts) >= 1:
            current_user.profile.location.city = location_parts[0]
        if len(location_parts) >= 2:
            current_user.profile.location.country = location_parts[1]
    
    # Store organization info - for now we'll note it in bio
    # Later we can create a ProductionCompany record if needed
    if data.org:
        org_note = f"Organization: {data.org}"
        if current_user.profile.bio:
            current_user.profile.bio = f"{org_note}\n\n{current_user.profile.bio}"
        else:
            current_user.profile.bio = org_note
    
    # Store team size preference (can be used later for job matching)
    # For now, we'll store it in bio as well
    if data.team_size:
        team_note = f"Team Size: {data.team_size}"
        if current_user.profile.bio:
            current_user.profile.bio = f"{current_user.profile.bio}\n{team_note}"
        else:
            current_user.profile.bio = team_note
    
    await current_user.save()
    
    # If create_starter_job is True and brief data is provided, create a job post
    if data.create_starter_job and data.first_job_title and data.brief:
        try:
            from app.services.job_service import JobService
            from app.api.schemas.job_schemas import JobPostCreate, BudgetCreate
            
            # Use sensible defaults for required fields not in onboarding
            job_data = JobPostCreate(
                title=data.first_job_title,
                description=data.brief,
                department="Other",  # Default department, user can change later
                role=None,
                tags=[data.tone] if data.tone else ["General"],
                crew_size="small_crew",  # Default
                complexity="intermediate",  # Default
                budget_type="fixed",
                budget=BudgetCreate(
                    min=data.budget_min,
                    max=data.budget_max,
                    currency="USD"
                ) if (data.budget_min or data.budget_max) else None,
                skills=data.goals if data.goals else ["General"],  # Using goals as skills
                experience_level="intermediate",  # Default
            )
            
            # Create the job post
            await JobService.create_job_post(current_user, job_data)
        except Exception as e:
            # Log error but don't fail onboarding if job creation fails
            logger.warning(f"Failed to create starter job during onboarding: {e}")
    
    return JSONResponse({"message": "Producer onboarding completed successfully"})



# ─── TEMPORARY DEV ENDPOINT ──────────────────────────────────────────
# Remove this before going to production
@router.get("/force-verify")
async def force_verify_email(email: str):
    user = await User.find_one(User.email == email)
    
    if not user:
        raise HTTPException(
            status_code=404, 
            detail="No user found with this email"
        )
    
    if user.is_verified:
        return {
            "message": "User is already verified",
            "email": user.email,
            "is_verified": user.is_verified
        }
    
    user.is_verified = True
    await user.save()
    
    return {
        "message": "Email verified successfully. You can now log in.",
        "email": user.email,
        "is_verified": user.is_verified
    }

# ============================================================================
# ADMIN REGISTRATION
# ============================================================================

class AdminRegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    phone_number: str
    admin_key: str                          # Must match ADMIN_REGISTRATION_KEY in .env
    account_type: str = "both"             # crew | producer | both
    user_role: str = "admin"               # admin | moderator

class AdminRegisterResponse(BaseModel):
    id: str
    email: str
    username: str
    account_type: str
    user_role: str
    message: str

from pydantic import BaseModel as _BaseModel

@router.post("/register-admin", summary="Register admin user (requires secret key)")
async def register_admin(request: AdminRegisterRequest):
    """
    Register a new admin or moderator account.

    This endpoint is protected by a secret key defined in your .env file
    as ADMIN_REGISTRATION_KEY. Only someone with this key can create admins.

    Request body:
        email        - Admin email
        username     - Admin username
        password     - Min 8 characters
        phone_number - E.164 format e.g. +1234567890
        admin_key    - Must match ADMIN_REGISTRATION_KEY in your .env
        account_type - crew | producer | both  (default: both)
        user_role    - admin | moderator        (default: admin)
    """
    # Validate secret key
    if request.admin_key != settings.ADMIN_REGISTRATION_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin registration key.",
        )

    # Validate user_role
    if request.user_role not in {"admin", "moderator"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_role must be admin or moderator.",
        )

    # Validate account_type
    if request.account_type not in {"crew", "producer", "both"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="account_type must be crew, producer, or both.",
        )

    # Check duplicates
    if await User.find_one(User.email == request.email):
        raise HTTPException(status_code=400, detail="Email already registered.")
    if await User.find_one(User.username == request.username):
        raise HTTPException(status_code=400, detail="Username already taken.")
    if await User.find_one(User.phone_number == request.phone_number):
        raise HTTPException(status_code=400, detail="Phone number already registered.")

    hashed_password = get_password_hash(request.password)

    new_admin = User(
        email=request.email,
        username=request.username,
        password_hash=hashed_password,
        phone_number=request.phone_number,
        account_type=request.account_type,
        user_role=request.user_role,
        is_verified=True,           # Admin accounts skip email verification
    )
    await new_admin.insert()

    return {
        "id": str(new_admin.id),
        "email": new_admin.email,
        "username": new_admin.username,
        "account_type": new_admin.account_type,
        "user_role": new_admin.user_role,
        "message": f"{new_admin.user_role.capitalize()} account created successfully.",
    }

# ── Debug endpoint — remove after fixing admin issue ─────────────────────────
@router.get("/me/role", summary="Check current user role")
async def check_my_role(current_user: User = Depends(get_current_user)):
    """
    Returns the role and verification status of the currently logged-in user.
    Use this to confirm whether your token belongs to an admin account.
    """
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "user_role": current_user.user_role,
        "account_type": current_user.account_type,
        "is_verified": current_user.is_verified,
        "is_admin": current_user.user_role in {"admin", "moderator"},
    }


@router.patch("/promote-to-admin", summary="Promote user to admin by email")
async def promote_to_admin(
    email: str,
    admin_key: str,
):
    """
    Promote any existing user to admin role using the admin secret key.
    Use this if you registered a user normally and now want to make them admin.

    Query params:
        email     - email of the user to promote
        admin_key - must match ADMIN_REGISTRATION_KEY in your .env
    """
    from app.core.config import settings as _settings

    if admin_key != _settings.ADMIN_REGISTRATION_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin key.",
        )

    user = await User.find_one(User.email == email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with this email.",
        )

    user.user_role = "admin"
    user.is_verified = True
    await user.save()

    return {
        "success": True,
        "message": f"{user.username} has been promoted to admin.",
        "email": user.email,
        "username": user.username,
        "user_role": user.user_role,
    }