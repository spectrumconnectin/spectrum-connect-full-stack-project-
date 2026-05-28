"""
Billing Service

Handles subscription plans, checkout, and billing operations
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from beanie import PydanticObjectId
import uuid

from app.models.schema import User, Transaction, Subscription


# Define available subscription plans
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free Plan",
        "price": 0.00,
        "interval": "monthly",
        "features": [
            "Basic profile",
            "Browse projects",
            "Send limited messages",
            "Basic search"
        ]
    },
    "pro": {
        "name": "Pro Plan",
        "price": 29.99,
        "interval": "monthly",
        "features": [
            "Everything in Free",
            "Unlimited messaging",
            "Advanced search filters",
            "Priority support",
            "Featured profile",
            "Analytics dashboard"
        ]
    },
    "team": {
        "name": "Team Plan",
        "price": 99.99,
        "interval": "monthly",
        "features": [
            "Everything in Pro",
            "Up to 10 team members",
            "Team collaboration tools",
            "Shared workspace",
            "Advanced analytics",
            "Dedicated account manager"
        ]
    }
}


class BillingService:
    """Service for billing and subscription operations"""

    @staticmethod
    def calculate_tax(subtotal: float, tax_rate: float = 0.08) -> float:
        """Calculate tax amount (default 8%)"""
        return round(subtotal * tax_rate, 2)

    @staticmethod
    def calculate_total(subtotal: float, tax: float) -> float:
        """Calculate total amount"""
        return round(subtotal + tax, 2)

    @staticmethod
    async def get_checkout_info(
        user_id: str,
        plan_id: str = "pro"
    ) -> Dict[str, Any]:
        """
        Get checkout information for a subscription plan

        Args:
        - user_id: User ID
        - plan_id: Plan ID ("free", "pro", "team")

        Returns:
        - plan: Plan details
        - pricing: Pricing breakdown
        - user: User billing information
        """
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return {"error": "User not found"}

            # Get plan details
            plan = SUBSCRIPTION_PLANS.get(plan_id, SUBSCRIPTION_PLANS["pro"])

            # Calculate pricing
            subtotal = plan["price"]
            tax = BillingService.calculate_tax(subtotal)
            total = BillingService.calculate_total(subtotal, tax)

            # Calculate next billing date (30 days from now)
            next_billing_date = datetime.utcnow() + timedelta(days=30)

            # Get user's current subscription
            current_subscription = user.subscription if user.subscription else None

            return {
                "plan": {
                    "id": plan_id,
                    "name": plan["name"],
                    "price": plan["price"],
                    "interval": plan["interval"],
                    "features": plan["features"]
                },
                "pricing": {
                    "subtotal": subtotal,
                    "tax": tax,
                    "tax_rate": 0.08,
                    "total": total,
                    "currency": "USD"
                },
                "billing": {
                    "next_billing_date": next_billing_date.isoformat(),
                    "billing_interval": plan["interval"]
                },
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "current_plan": current_subscription.plan if current_subscription else "free",
                    "billing_country": user.profile.location.country if user.profile and user.profile.location else None
                }
            }

        except Exception as e:
            print(f"Error in BillingService.get_checkout_info: {e}")
            return {"error": str(e)}

    @staticmethod
    async def create_subscription(
        user_id: str,
        plan_id: str,
        payment_method: str,
        payment_token: str = None
    ) -> Dict[str, Any]:
        """
        Create a new subscription for a user

        Args:
        - user_id: User ID
        - plan_id: Plan ID
        - payment_method: Payment method (card, paypal)
        - payment_token: Payment token from payment processor

        Returns:
        - subscription: Created subscription details
        - transaction: Payment transaction details
        """
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return {"error": "User not found"}

            # Get plan details
            plan = SUBSCRIPTION_PLANS.get(plan_id, SUBSCRIPTION_PLANS["pro"])

            # Create subscription
            start_date = datetime.utcnow()
            end_date = start_date + timedelta(days=30)  # Monthly subscription

            subscription = Subscription(
                plan=plan_id,
                status="active",
                start_date=start_date,
                end_date=end_date,
                auto_renew=True,
                payment_method=payment_method,
                stripe_customer_id=None,  # Would be set by Stripe
                stripe_subscription_id=None  # Would be set by Stripe
            )

            # Update user subscription
            user.subscription = subscription
            await user.save()

            # Create transaction record
            subtotal = plan["price"]
            tax = BillingService.calculate_tax(subtotal)
            total = BillingService.calculate_total(subtotal, tax)

            transaction = Transaction(
                transaction_id=f"txn_{uuid.uuid4().hex[:12]}",
                from_user_id=PydanticObjectId(user_id),
                to_user_id=None,  # Platform revenue
                type="subscription",
                amount=total,
                currency="USD",
                platform_fee=0,
                payment_processing_fee=round(total * 0.029 + 0.30, 2),  # Stripe fee
                net_amount=round(total - (total * 0.029 + 0.30), 2),
                subscription_id=plan_id,
                payment_method=payment_method,
                payment_provider="stripe",  # Or "paypal"
                external_transaction_id=payment_token,
                status="completed",
                initiated_at=datetime.utcnow()
            )

            await transaction.insert()

            return {
                "success": True,
                "subscription": {
                    "plan": plan_id,
                    "status": "active",
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "next_billing_date": end_date.isoformat()
                },
                "transaction": {
                    "id": transaction.transaction_id,
                    "amount": total,
                    "status": "completed"
                }
            }

        except Exception as e:
            print(f"Error in BillingService.create_subscription: {e}")
            return {"error": str(e)}

    @staticmethod
    async def cancel_subscription(user_id: str) -> bool:
        """
        Cancel user's subscription (keeps active until end date)

        Args:
        - user_id: User ID

        Returns:
        - success: Boolean indicating success
        """
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user or not user.subscription:
                return False

            # Mark as cancelled but keep active until end date
            user.subscription.status = "cancelled"
            user.subscription.auto_renew = False

            await user.save()
            return True

        except Exception as e:
            print(f"Error in BillingService.cancel_subscription: {e}")
            return False

    @staticmethod
    async def get_billing_history(
        user_id: str,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Get user's billing history

        Args:
        - user_id: User ID
        - limit: Maximum number of transactions

        Returns:
        - transactions: List of transactions
        - subscription: Current subscription info
        """
        try:
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return {"transactions": [], "subscription": None}

            # Get user's transactions
            transactions = await Transaction.find(
                Transaction.from_user_id == PydanticObjectId(user_id),
                Transaction.type == "subscription"
            ).sort(-Transaction.initiated_at).limit(limit).to_list()

            transaction_list = []
            for txn in transactions:
                transaction_list.append({
                    "id": txn.transaction_id,
                    "date": txn.initiated_at.isoformat(),
                    "amount": txn.amount,
                    "status": txn.status,
                    "payment_method": txn.payment_method,
                    "description": f"{SUBSCRIPTION_PLANS.get(txn.subscription_id, {}).get('name', 'Subscription')} - {txn.subscription_id}"
                })

            # Get current subscription
            subscription_info = None
            if user.subscription:
                subscription_info = {
                    "plan": user.subscription.plan,
                    "status": user.subscription.status,
                    "start_date": user.subscription.start_date.isoformat() if user.subscription.start_date else None,
                    "end_date": user.subscription.end_date.isoformat() if user.subscription.end_date else None,
                    "auto_renew": user.subscription.auto_renew
                }

            return {
                "transactions": transaction_list,
                "subscription": subscription_info
            }

        except Exception as e:
            print(f"Error in BillingService.get_billing_history: {e}")
            return {"transactions": [], "subscription": None}

    @staticmethod
    def get_all_plans() -> Dict[str, Any]:
        """Get all available subscription plans"""
        return {
            "plans": [
                {
                    "id": plan_id,
                    **plan_data
                }
                for plan_id, plan_data in SUBSCRIPTION_PLANS.items()
            ]
        }