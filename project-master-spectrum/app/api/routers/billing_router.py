"""
Billing API Routes

Endpoints for subscription management and billing
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.models.schema import User
from app.services.billing_service import BillingService
from app.auth.auth import get_current_user

router = APIRouter(prefix="/billing", tags=["Billing"])


class CheckoutRequest(BaseModel):
    """Request schema for checkout"""
    plan_id: str = "pro"


class SubscriptionRequest(BaseModel):
    """Request schema for creating subscription"""
    plan_id: str
    payment_method: str  # "card", "paypal"
    payment_token: Optional[str] = None
    card_number: Optional[str] = None  # Last 4 digits
    cardholder_name: Optional[str] = None


@router.get("/plans")
async def get_plans():
    """
    Get all available subscription plans

    Returns:
    - plans: List of available plans with features and pricing
    """
    return BillingService.get_all_plans()


@router.post("/checkout")
async def get_checkout_info(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get checkout information for a subscription plan

    Returns:
    - plan: Selected plan details
    - pricing: Price breakdown with tax
    - billing: Next billing date and interval
    - user: User billing information
    """
    try:
        checkout_info = await BillingService.get_checkout_info(
            user_id=str(current_user.id),
            plan_id=request.plan_id
        )

        if "error" in checkout_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=checkout_info["error"]
            )

        return checkout_info

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get checkout info: {str(e)}"
        )


@router.post("/subscribe")
async def create_subscription(
    request: SubscriptionRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new subscription for the user

    Processes payment and activates subscription

    Returns:
    - subscription: Created subscription details
    - transaction: Payment transaction details
    """
    try:
        result = await BillingService.create_subscription(
            user_id=str(current_user.id),
            plan_id=request.plan_id,
            payment_method=request.payment_method,
            payment_token=request.payment_token
        )

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subscription: {str(e)}"
        )


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Cancel user's subscription

    Subscription remains active until end of billing period
    """
    try:
        success = await BillingService.cancel_subscription(str(current_user.id))

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )

        return {
            "success": True,
            "message": "Subscription cancelled. Access will continue until the end of your billing period."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}"
        )


@router.get("/history")
async def get_billing_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get user's billing history

    Query params:
    - limit: Maximum number of transactions (default: 20)

    Returns:
    - transactions: List of billing transactions
    - subscription: Current subscription information
    """
    try:
        history = await BillingService.get_billing_history(
            user_id=str(current_user.id),
            limit=limit
        )

        return history

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get billing history: {str(e)}"
        )
