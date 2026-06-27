"""
Stripe Connect Service
======================
Creator bank cash-outs paid from the platform's Stripe balance.

Flow
----
1. Creator onboards an Express connected account (Stripe-hosted form collecting
   bank + identity). We store the account id on the User.
2. Stripe enables `payouts` once onboarding is complete.
3. Cash-out = a Transfer from the platform balance to the connected account;
   Stripe then pays the creator's bank on the account's payout schedule.

Connect must be enabled on the platform account (it is). Transfers draw from the
platform balance in STRIPE_PAYOUT_CURRENCY — keep that funded in that currency.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import stripe

from app.core.config import settings

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

FRONTEND_URL = "https://spectrumconect.com"


def is_enabled() -> bool:
    return bool(settings.STRIPE_SECRET_KEY)


async def create_or_get_account(user) -> str:
    """Return the user's Express account id, creating one if needed."""
    if getattr(user, "stripe_account_id", None):
        return user.stripe_account_id

    acct = stripe.Account.create(
        type="express",
        email=user.email,
        capabilities={"transfers": {"requested": True}},
        business_type="individual",
        metadata={"user_id": str(user.id), "username": user.username or ""},
    )
    user.stripe_account_id = acct.id
    await user.save()
    return acct.id


def create_account_link(account_id: str) -> str:
    """Hosted onboarding URL the creator completes to enable payouts."""
    link = stripe.AccountLink.create(
        account=account_id,
        refresh_url=f"{FRONTEND_URL}/creator/earnings?connect=refresh",
        return_url=f"{FRONTEND_URL}/creator/earnings?connect=done",
        type="account_onboarding",
    )
    return link.url


def get_account_status(account_id: str) -> Dict[str, Any]:
    """Live readiness of a connected account."""
    acct = stripe.Account.retrieve(account_id)
    return {
        "account_id": account_id,
        "payouts_enabled": bool(acct.get("payouts_enabled")),
        "details_submitted": bool(acct.get("details_submitted")),
        "charges_enabled": bool(acct.get("charges_enabled")),
        # A short reason when onboarding is incomplete.
        "needs_onboarding": not bool(acct.get("payouts_enabled")),
    }


def create_transfer(account_id: str, amount: float, idempotency_key: str,
                    description: str = "Spectrum Connect creator payout") -> Dict[str, Any]:
    """
    Move `amount` from the platform balance to the connected account.

    Returns {"ok": True, "transfer_id": ...} or {"ok": False, "error": ...}.
    Idempotency-keyed so a retried request can't pay twice.
    """
    amount_cents = int(round(amount * 100))
    try:
        tr = stripe.Transfer.create(
            amount=amount_cents,
            currency=settings.STRIPE_PAYOUT_CURRENCY,
            destination=account_id,
            description=description,
            idempotency_key=idempotency_key,
        )
        return {"ok": True, "transfer_id": tr.id}
    except stripe.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        logger.error("Stripe transfer failed for %s: %s", account_id, msg)
        return {"ok": False, "error": msg}
