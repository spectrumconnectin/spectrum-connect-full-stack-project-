"""
PayPal Payouts Service
======================
Thin async wrapper over the PayPal Payouts REST API used to send creator
withdrawals. Credentials and host come from settings; when credentials are
absent the service reports as disabled and never attempts a network call.

Docs: https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache the OAuth token in-process; PayPal tokens last ~9h.
_token_cache: Dict[str, Any] = {"access_token": None, "expires_at": 0.0}


def is_enabled() -> bool:
    return settings.paypal_payouts_enabled()


async def _get_access_token() -> str:
    """Fetch (and cache) an OAuth2 client-credentials access token."""
    now = time.time()
    if _token_cache["access_token"] and _token_cache["expires_at"] - 60 > now:
        return _token_cache["access_token"]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.PAYPAL_API_BASE}/v1/oauth2/token",
            auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json"},
        )
    resp.raise_for_status()
    data = resp.json()
    _token_cache["access_token"] = data["access_token"]
    _token_cache["expires_at"] = now + int(data.get("expires_in", 3000))
    return _token_cache["access_token"]


async def send_payout(
    *,
    receiver_email: str,
    amount: float,
    currency: str,
    sender_batch_id: str,
    sender_item_id: str,
    note: str = "Spectrum Connect creator payout",
) -> Dict[str, Any]:
    """
    Send a single-item payout to a PayPal account.

    Returns
    -------
    {"ok": True, "batch_id": <paypal_batch_id>, "batch_status": <status>}
        on a successfully-accepted batch.
    {"ok": False, "error": <message>}
        when PayPal rejects the request (caller leaves the withdrawal failed).

    Raises only for unexpected transport errors so the caller can decide how to
    record an indeterminate state.
    """
    if not is_enabled():
        raise RuntimeError("PayPal payouts are not configured.")

    token = await _get_access_token()
    payload = {
        "sender_batch_header": {
            # Idempotency: PayPal rejects a duplicate sender_batch_id, preventing
            # a retried request from paying the creator twice.
            "sender_batch_id": sender_batch_id,
            "email_subject": "You have a payout from Spectrum Connect",
            "email_message": "Your Spectrum Connect earnings have been sent to your PayPal account.",
        },
        "items": [{
            "recipient_type": "EMAIL",
            "amount": {"value": f"{amount:.2f}", "currency": currency.upper()},
            "receiver": receiver_email,
            "note": note,
            "sender_item_id": sender_item_id,
        }],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.PAYPAL_API_BASE}/v1/payments/payouts",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if resp.status_code in (200, 201):
        body = resp.json()
        header = body.get("batch_header", {})
        return {
            "ok": True,
            "batch_id": header.get("payout_batch_id"),
            "batch_status": header.get("batch_status"),
        }

    # Any non-2xx is a rejected payout — surface the message, do not raise.
    try:
        err = resp.json()
        msg = err.get("message") or err.get("name") or resp.text[:200]
    except Exception:
        msg = resp.text[:200]
    logger.error("PayPal payout failed (%s): %s", resp.status_code, msg)
    return {"ok": False, "error": msg}
