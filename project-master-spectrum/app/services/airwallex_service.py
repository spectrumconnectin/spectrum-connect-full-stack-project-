"""
Airwallex Payouts — direct bank transfer to a creator's own account
===================================================================

The rail for creators Stripe Connect cannot reach. Sri Lanka is the reason this
exists: Stripe does not operate there, and Wise cannot send to LKR from the UK
or US, so a Sri Lankan creator's only options were intermediary wallets. Airwallex
pays LKR over local clearing straight into the creator's own bank account —
the creator needs no account anywhere.

Flow
----
1. The creator submits their bank details once. We register them with Airwallex
   as a beneficiary and keep only the returned beneficiary id.
2. A withdrawal creates a Transfer from the platform's Airwallex balance to that
   beneficiary.
3. Airwallex settles to the creator's bank, typically within a business day.

On not storing bank details
---------------------------
Full account numbers are never written to our database. They are passed straight
to Airwallex and replaced with the beneficiary id plus a masked last-four for
display. A database dump therefore contains no account numbers to leak, and
there is nothing for us to keep in sync with the bank.

Safety
------
Disabled unless both credentials are set, and pointed at the demo host until
AIRWALLEX_API_BASE is explicitly set to the live one — the same fail-closed
default the PayPal rail uses.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Access tokens last ~30 minutes; cache and refresh a little early rather than
# authenticating on every call.
_token_cache: Dict[str, Any] = {"token": None, "expires_at": 0.0}
_TOKEN_TTL_SECONDS = 25 * 60


def is_enabled() -> bool:
    return bool(settings.AIRWALLEX_CLIENT_ID and settings.AIRWALLEX_API_KEY)


def is_live() -> bool:
    """True when pointed at the production host rather than demo."""
    return "api-demo" not in (settings.AIRWALLEX_API_BASE or "")


async def _token() -> str:
    """Authenticate, reusing a cached token until it is close to expiry."""
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.AIRWALLEX_API_BASE}/api/v1/authentication/login",
            headers={
                "x-client-id": settings.AIRWALLEX_CLIENT_ID,
                "x-api-key": settings.AIRWALLEX_API_KEY,
                "Content-Type": "application/json",
            },
        )
    if resp.status_code >= 400:
        raise RuntimeError(f"Airwallex auth failed ({resp.status_code}): {resp.text[:200]}")

    token = resp.json().get("token")
    if not token:
        raise RuntimeError("Airwallex auth returned no token")

    _token_cache["token"] = token
    _token_cache["expires_at"] = now + _TOKEN_TTL_SECONDS
    return token


async def _request(method: str, path: str, payload: Optional[dict] = None,
                   idempotency_key: Optional[str] = None) -> Dict[str, Any]:
    """Call the Airwallex API and normalise the outcome.

    Returns {"ok": True, "data": {...}} or {"ok": False, "error": str}. Errors
    are returned rather than raised so callers can decide what to do with a
    creator's reserved funds.
    """
    headers = {"Authorization": f"Bearer {await _token()}", "Content-Type": "application/json"}
    if idempotency_key:
        # Airwallex de-duplicates on this, so a retried payout cannot pay twice.
        headers["x-idempotency-key"] = idempotency_key

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.request(
                method, f"{settings.AIRWALLEX_API_BASE}{path}",
                headers=headers, json=payload,
            )
    except httpx.HTTPError as e:
        logger.error("Airwallex %s %s network error: %s", method, path, e)
        return {"ok": False, "error": "Could not reach the payment provider. Try again shortly."}

    if resp.status_code >= 400:
        # Log the provider's message for diagnosis; return something a creator
        # can read. Never echo the raw body — it can contain their bank details.
        logger.error("Airwallex %s %s failed (%s): %s", method, path, resp.status_code, resp.text[:400])
        try:
            body = resp.json()
            msg = body.get("message") or body.get("code") or "Payment provider rejected the request."
        except Exception:
            msg = "Payment provider rejected the request."
        return {"ok": False, "error": msg}

    return {"ok": True, "data": resp.json()}


def mask_account(account_number: str) -> str:
    """Last four digits only — enough for a creator to recognise the account."""
    digits = (account_number or "").strip()
    return f"••••{digits[-4:]}" if len(digits) >= 4 else "••••"


async def create_beneficiary(
    *,
    account_name: str,
    account_number: str,
    bank_name: str,
    swift_code: Optional[str] = None,
    branch: Optional[str] = None,
    country_code: str = "LK",
    currency: str = "LKR",
    entity_type: str = "PERSONAL",
) -> Dict[str, Any]:
    """Register a creator's bank account with Airwallex.

    The payload shape follows Airwallex's beneficiary API. Requirements vary by
    corridor — Sri Lanka needs the account number, bank name and branch, and a
    SWIFT/BIC for international routing — so validate against the demo
    environment for each new country before enabling it there.
    """
    bank_details: Dict[str, Any] = {
        "account_name": account_name.strip(),
        "account_number": account_number.strip(),
        "account_currency": currency.upper(),
        "bank_country_code": country_code.upper(),
        "bank_name": bank_name.strip(),
    }
    if swift_code:
        bank_details["swift_code"] = swift_code.strip().upper()
    if branch:
        bank_details["bank_branch"] = branch.strip()

    payload = {
        "beneficiary": {
            "entity_type": entity_type,
            "bank_details": bank_details,
        },
        "nickname": f"{account_name.strip()} ({mask_account(account_number)})",
        "payment_methods": ["LOCAL"],
    }

    result = await _request("POST", "/api/v1/beneficiaries/create", payload)
    if not result["ok"]:
        return result

    data = result["data"]
    return {
        "ok": True,
        "beneficiary_id": data.get("beneficiary_id") or data.get("id"),
        "masked_account": mask_account(account_number),
        "bank_name": bank_name.strip(),
        "currency": currency.upper(),
    }


async def create_transfer(
    *,
    beneficiary_id: str,
    amount: float,
    idempotency_key: str,
    source_currency: Optional[str] = None,
    target_currency: str = "LKR",
    reason: str = "Creator payout from Spectrum Connect",
) -> Dict[str, Any]:
    """Pay a registered beneficiary from the platform's Airwallex balance.

    `amount` is in the *target* currency the creator receives. Idempotency-keyed
    so a retried request cannot pay twice.
    """
    payload = {
        "beneficiary_id": beneficiary_id,
        "source_currency": (source_currency or settings.AIRWALLEX_SOURCE_CURRENCY).upper(),
        "payment_currency": target_currency.upper(),
        "payment_amount": round(float(amount), 2),
        "reason": reason,
        "reference": idempotency_key[:32],
        "request_id": idempotency_key,
    }

    result = await _request(
        "POST", "/api/v1/transfers/create", payload, idempotency_key=idempotency_key
    )
    if not result["ok"]:
        return result

    data = result["data"]
    return {
        "ok": True,
        "transfer_id": data.get("transfer_id") or data.get("id"),
        "status": data.get("status"),
    }


async def get_balance(currency: Optional[str] = None) -> Dict[str, Any]:
    """Available platform balance, for preflighting a payout."""
    want = (currency or settings.AIRWALLEX_SOURCE_CURRENCY or "usd").upper()
    result = await _request("GET", "/api/v1/balances/current")
    if not result["ok"]:
        return result

    balances = result["data"] if isinstance(result["data"], list) else result["data"].get("items", [])
    entry = next((b for b in balances if str(b.get("currency", "")).upper() == want), None)
    return {
        "ok": True,
        "currency": want,
        "available": float(entry.get("available_amount", 0)) if entry else 0.0,
        "held_currencies": [str(b.get("currency", "")).upper() for b in balances],
    }
