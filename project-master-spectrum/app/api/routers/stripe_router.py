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
    Also sends creator notification and advances the linked job to in_progress.
    Idempotent: if the milestone is already funded (duplicate webhook) we log and return.
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

    # Stripe charges 2.9% + $0.30 on the amount_total (in cents).
    amount_total_cents = session.get("amount_total") or 0
    stripe_fee = round((amount_total_cents / 100) * 0.029 + 0.30, 2)

    try:
        await EscrowService.fund_milestone(
            escrow_id, milestone_id, client_id,
            stripe_payment_intent=session.get("payment_intent"),
            stripe_fee=stripe_fee,
        )
        logger.info(
            "Milestone funded via Stripe: escrow=%s milestone=%s fee=$%.2f",
            escrow_id, milestone_id, stripe_fee,
        )
    except HTTPException as e:
        # 400 = already funded (idempotent), 403/404 = data issue — log but don't fail
        logger.warning(
            "fund_milestone skipped (status=%s): %s | escrow=%s milestone=%s",
            e.status_code, e.detail, escrow_id, milestone_id,
        )
        return  # Don't try to send notifications if funding failed/was duplicate

    # Notify creator + advance the linked job to in_progress
    try:
        from app.services.notification_service import NotificationService
        from app.models.escrow import Escrow as EscrowDoc
        from app.models.schema import JobPost
        from beanie import PydanticObjectId as _OID

        esc = await EscrowDoc.get(_OID(escrow_id))
        if esc:
            milestone = next((m for m in (esc.milestones or []) if m.milestone_id == milestone_id), None)
            m_title = milestone.title if milestone else "Milestone"
            m_amount = float(milestone.amount) if milestone else 0.0

            await NotificationService.milestone_funded(
                creator_id=str(esc.creator_id),
                client_id=client_id,
                milestone_title=m_title,
                amount=m_amount,
                escrow_id=escrow_id,
            )
            if esc.job_post_id:
                job = await JobPost.get(esc.job_post_id)
                if job and job.status in ("pending_funding", "open", "in_review"):
                    job.status = "in_progress"
                    await job.save()
    except Exception:
        logger.exception("Post-payment notification/job-update failed: escrow=%s", escrow_id)
