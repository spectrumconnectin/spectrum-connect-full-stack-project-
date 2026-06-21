"""
Stripe Payments Router
======================
Handles real payment collection for escrow milestone funding via
Stripe Checkout (hosted page). Creator payouts remain manual for now.

Endpoints
---------
POST /stripe/checkout-session   — create a Checkout Session for a milestone
POST /stripe/webhook            — Stripe event handler (no auth, HMAC-verified)
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

import stripe

from app.core.config import settings
from app.models.schema import User
from app.auth.auth import get_current_user
from app.services.escrow_service import EscrowService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stripe", tags=["Stripe Payments"])

stripe.api_key = settings.STRIPE_SECRET_KEY

FRONTEND_URL = "https://spectrumconect.com"


# ── Request / Response models ──────────────────────────────────────────────────

class CheckoutSessionRequest(BaseModel):
    escrow_id: str
    milestone_id: str
    amount: float
    currency: str = "USD"
    project_title: str
    milestone_title: Optional[str] = "Project Milestone"


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    req: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Create a Stripe Checkout Session for funding an escrow milestone.
    The frontend redirects the client to the returned checkout_url.
    On payment success, Stripe fires the webhook which marks the milestone funded.
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment processing is not configured.")

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0.")

    # Stripe amounts are in the smallest currency unit (cents for USD)
    amount_cents = int(round(req.amount * 100))

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": req.currency.lower(),
                    "product_data": {
                        "name": req.milestone_title or "Project Milestone",
                        "description": f"Escrow funding for: {req.project_title}",
                    },
                    "unit_amount": amount_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=(
                f"{FRONTEND_URL}/client/payments"
                f"?payment=success&escrow_id={req.escrow_id}&milestone_id={req.milestone_id}"
            ),
            cancel_url=f"{FRONTEND_URL}/client/payments?payment=cancelled",
            metadata={
                "escrow_id": req.escrow_id,
                "milestone_id": req.milestone_id,
                "client_id": str(current_user.id),
            },
            client_reference_id=str(current_user.id),
            # Pre-fill the customer email for a nicer checkout experience
            customer_email=current_user.email,
        )
    except stripe.StripeError as e:
        logger.error("Stripe checkout session creation failed: %s", e)
        raise HTTPException(status_code=502, detail="Failed to create payment session.")

    return CheckoutSessionResponse(checkout_url=session.url, session_id=session.id)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request):
    """
    Receive and verify Stripe webhook events.
    IMPORTANT: Stripe requires the raw request body for signature verification —
    do NOT parse JSON before this handler reads request.body().
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.warning("STRIPE_WEBHOOK_SECRET not set — skipping signature verification")
        try:
            import json
            event = stripe.Event.construct_from(
                json.loads(payload), stripe.api_key
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid payload")
    else:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")

    await _handle_event(event)
    return {"status": "ok"}


async def _handle_event(event: stripe.Event) -> None:
    """Dispatch Stripe events to the appropriate handler."""
    if event["type"] == "checkout.session.completed":
        await _on_checkout_completed(event["data"]["object"])


async def _on_checkout_completed(session: dict) -> None:
    """
    Mark the escrow milestone as funded when a Checkout Session is paid.
    Idempotent: if the milestone is already funded (duplicate webhook),
    we log and return without error.
    """
    if session.get("payment_status") != "paid":
        return

    meta = session.get("metadata") or {}
    escrow_id = meta.get("escrow_id")
    milestone_id = meta.get("milestone_id")
    client_id = meta.get("client_id")

    if not (escrow_id and milestone_id and client_id):
        logger.error("Webhook missing metadata: %s", meta)
        return

    try:
        await EscrowService.fund_milestone(escrow_id, milestone_id, client_id)
        logger.info(
            "Milestone funded via Stripe: escrow=%s milestone=%s",
            escrow_id, milestone_id,
        )
    except HTTPException as e:
        # 400 = already funded (idempotent), 403/404 = data issue — log but don't fail
        logger.warning(
            "fund_milestone skipped (status=%s): %s | escrow=%s milestone=%s",
            e.status_code, e.detail, escrow_id, milestone_id,
        )
