"""
Stripe Payments Router
======================
Handles real payment collection for escrow milestone funding via
Stripe Checkout (hosted page). Creator payouts remain manual for now.

Endpoints
---------
POST /stripe/checkout-session   — create a Checkout Session for a milestone
POST /stripe/webhook            — Stripe event handler (no auth, HMAC-verified)

Security model
--------------
- The charge amount is ALWAYS derived server-side from the escrow milestone via
  the commission service. The client never tells us how much to charge.
- The webhook verifies the Stripe HMAC signature and additionally checks that
  the amount actually captured matches the amount we expected before marking a
  milestone funded. A mismatch is treated as a security event and rejected.
- In production the webhook fails CLOSED: if no signing secret is configured it
  refuses to process events rather than trusting unsigned input.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

import stripe
from beanie import PydanticObjectId

from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.models.schema import User
from app.models.escrow import Escrow
from app.auth.auth import get_current_user
from app.services.escrow_service import EscrowService
from app.services.commission_service import calc_commission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stripe", tags=["Stripe Payments"])

stripe.api_key = settings.STRIPE_SECRET_KEY

FRONTEND_URL = "https://spectrumconect.com"


# ── Request / Response models ──────────────────────────────────────────────────

class CheckoutSessionRequest(BaseModel):
    escrow_id: str
    milestone_id: str
    # `amount`, `currency` and titles below are accepted for backwards
    # compatibility but are NOT trusted — the charge amount and currency are
    # derived server-side from the escrow milestone.
    amount: Optional[float] = None
    currency: Optional[str] = None
    project_title: Optional[str] = None
    milestone_title: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    req: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(rate_limiter("stripe_checkout", limit=20, window_seconds=60)),
):
    """
    Create a Stripe Checkout Session for funding an escrow milestone.

    The amount is computed server-side as the milestone subtotal plus the
    client-side platform fee (the client_total from the commission model).
    The frontend redirects the client to the returned checkout_url; on payment
    the webhook marks the milestone funded.
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment processing is not configured.")

    # Validate the escrow id and load the escrow.
    try:
        escrow = await Escrow.get(PydanticObjectId(req.escrow_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid escrow id.")
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found.")

    # AUTHORIZATION: only the escrow's own client may fund it.
    if str(escrow.client_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You are not the client on this escrow.")

    if escrow.status != "active":
        raise HTTPException(status_code=400, detail=f"Escrow is not active (status: '{escrow.status}').")

    # Find the milestone and confirm it is still awaiting funding.
    milestone = next((m for m in escrow.milestones if m.milestone_id == req.milestone_id), None)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found in this escrow.")
    if milestone.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Milestone cannot be funded from status '{milestone.status}'.",
        )

    # SERVER-SIDE amount — never trust the client. The client pays the milestone
    # subtotal plus their 4% platform fee (client_total in the commission model).
    fees = calc_commission(milestone.amount, currency=escrow.currency).to_dict()
    charge_amount = float(fees["client_total"])
    if charge_amount <= 0:
        raise HTTPException(status_code=400, detail="Milestone amount must be greater than 0.")

    currency = (escrow.currency or "USD").lower()
    amount_cents = int(round(charge_amount * 100))
    title = milestone.title or "Project Milestone"
    project_title = escrow.description or req.project_title or "Spectrum Connect project"

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": currency,
                    "product_data": {
                        "name": title,
                        "description": f"Escrow funding for: {project_title}",
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
                # The exact amount we expect Stripe to capture, in minor units.
                # The webhook rejects the event if amount_total differs.
                "expected_cents": str(amount_cents),
            },
            client_reference_id=str(current_user.id),
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
        # Fail CLOSED in production — never process unsigned webhook input that
        # could forge a paid event and fund a milestone for free. Only a
        # non-production environment is allowed to skip verification (local dev).
        if settings.is_production():
            logger.critical("STRIPE_WEBHOOK_SECRET not set in production — rejecting webhook.")
            raise HTTPException(status_code=503, detail="Webhook verification not configured.")
        logger.warning("STRIPE_WEBHOOK_SECRET not set — skipping signature verification (non-prod).")
        try:
            import json
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
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

    amount_total_cents = int(session.get("amount_total") or 0)

    # SECURITY: the amount actually captured must equal the amount we asked for
    # when we created the session. A mismatch means the session was tampered
    # with or replayed against a different milestone — reject and alert.
    expected_cents = int(meta.get("expected_cents") or 0)
    if expected_cents and amount_total_cents != expected_cents:
        logger.critical(
            "Stripe amount mismatch — refusing to fund. expected=%s captured=%s escrow=%s milestone=%s",
            expected_cents, amount_total_cents, escrow_id, milestone_id,
        )
        return

    # Stripe charges 2.9% + $0.30 on the captured amount.
    amount_paid = round(amount_total_cents / 100, 2)
    stripe_fee = round(amount_paid * 0.029 + 0.30, 2)

    try:
        await EscrowService.fund_milestone(
            escrow_id, milestone_id, client_id,
            stripe_payment_intent=session.get("payment_intent"),
            stripe_fee=stripe_fee,
            amount_paid=amount_paid,
            expected_cents=expected_cents or None,
        )
        logger.info(
            "Milestone funded via Stripe: escrow=%s milestone=%s paid=$%.2f fee=$%.2f",
            escrow_id, milestone_id, amount_paid, stripe_fee,
        )
        # Audit trail — system-actor financial event.
        try:
            from app.services.audit_service import log_event
            await log_event(
                "payment.funded",
                target_type="escrow",
                target_id=escrow_id,
                metadata={
                    "milestone_id": milestone_id,
                    "client_id": client_id,
                    "amount_paid": amount_paid,
                    "stripe_fee": stripe_fee,
                    "payment_intent": session.get("payment_intent"),
                },
                severity="info",
            )
        except Exception:
            pass
    except HTTPException as e:
        # 400 = already funded (idempotent), 403/404/409 = data issue — log but don't fail
        logger.warning(
            "fund_milestone skipped (status=%s): %s | escrow=%s milestone=%s",
            e.status_code, e.detail, escrow_id, milestone_id,
        )
        return  # Don't try to send notifications if funding failed/was duplicate

    # Notify creator + advance the linked job to in_progress
    try:
        from app.services.notification_service import NotificationService
        from app.models.schema import JobPost
        from beanie import PydanticObjectId as _OID

        esc = await Escrow.get(_OID(escrow_id))
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
