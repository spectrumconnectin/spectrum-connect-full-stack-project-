"""
Where each payout rail can actually pay a creator
=================================================

Not every creator can be paid the same way, and offering someone a rail that
cannot reach their country wastes their time on an onboarding flow that ends in
an error.

Stripe Connect covers most of Europe and North America but not South Asia — Sri
Lanka in particular is rejected outright ("LK is not currently supported"), so a
Sri Lankan creator must never be sent through Stripe bank onboarding.

PayPal is the rail that reaches them. Sri Lanka gained cross-border *receiving*
and withdrawal-to-local-bank in May 2026 through partner banks (Sampath Bank and
Commercial Bank are live; Bank of Ceylon is announced), so a Sri Lankan creator
paid via PayPal can move that money into their own bank account.

Stripe's country support is read from Stripe rather than hardcoded here, so the
list cannot silently go stale as Stripe adds countries.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Country-support answers change rarely; cache so a page load doesn't hit Stripe
# once per render. Process-local — a restart re-reads it.
_stripe_country_cache: Dict[str, bool] = {}

# Countries where PayPal only recently enabled receiving, and the creator has to
# do something specific for the money to reach their bank. Shown as guidance
# next to the PayPal option rather than left for them to discover.
PAYPAL_LOCAL_GUIDANCE: Dict[str, str] = {
    "LK": (
        "Sri Lanka: link your PayPal account to a partner bank — Sampath Bank or "
        "Commercial Bank — to withdraw to your own account. Personal PayPal "
        "accounts are supported; business accounts are still being rolled out."
    ),
}

# Rough country inference from a free-text location, for profiles that never
# filled in a structured country. Deliberately small: a wrong guess here only
# affects which option is highlighted, and the rails themselves still validate.
_COUNTRY_HINTS = {
    "sri lanka": "LK", "colombo": "LK", "kandy": "LK",
    "united kingdom": "GB", "london": "GB",
    "united states": "US", "usa": "US",
    "india": "IN", "australia": "AU", "canada": "CA",
}


def creator_country(user) -> Optional[str]:
    """Best available ISO country code for a creator, or None.

    Prefers the structured profile country, then the phone country code, then a
    hint from free-text location.
    """
    profile = getattr(user, "profile", None)
    location = getattr(profile, "location", None) if profile else None

    country = getattr(location, "country", None) if location else None
    if country:
        code = country.strip()
        if len(code) == 2:
            return code.upper()
        hint = _COUNTRY_HINTS.get(code.lower())
        if hint:
            return hint

    phone_cc = getattr(user, "phone_country_code", None)
    if phone_cc and len(phone_cc) == 2:
        return phone_cc.upper()

    if isinstance(location, str):
        return _COUNTRY_HINTS.get(location.strip().lower())

    return None


def stripe_supports(country: Optional[str]) -> Optional[bool]:
    """Whether Stripe Connect can pay out to `country`.

    Returns None when it cannot be determined (unknown country, or Stripe
    unreachable) — callers should treat that as "don't block", since a wrong
    "no" would strand a creator who could otherwise be paid.
    """
    if not country:
        return None

    code = country.upper()
    if code in _stripe_country_cache:
        return _stripe_country_cache[code]

    try:
        import stripe
        from app.core.config import settings

        if not settings.STRIPE_SECRET_KEY:
            return None

        stripe.api_key = settings.STRIPE_SECRET_KEY
        stripe.CountrySpec.retrieve(code)
        _stripe_country_cache[code] = True
    except Exception as e:
        # A country Stripe rejects is genuinely unsupported; anything else
        # (network, auth) should not be cached as a refusal.
        msg = str(getattr(e, "user_message", None) or e)
        if "not currently supported" in msg or "Invalid country" in msg:
            _stripe_country_cache[code] = False
        else:
            logger.warning("Could not check Stripe support for %s: %s", code, msg)
            return None

    return _stripe_country_cache[code]


def payout_options(user) -> Dict[str, Any]:
    """Which rails this creator can realistically use, and what to tell them.

    Drives the earnings UI so a creator is only offered a rail that can reach
    them.
    """
    from app.services import paypal_service, stripe_connect_service

    country = creator_country(user)
    stripe_ok = stripe_supports(country)

    # Unknown country is treated as eligible: better to let someone try Stripe
    # onboarding than to hide the option from a creator who could use it.
    stripe_available = stripe_connect_service.is_enabled() and stripe_ok is not False

    return {
        "country": country,
        "bank_via_stripe": {
            "available": stripe_available,
            "connected": bool(getattr(user, "stripe_account_id", None)),
            "payouts_enabled": bool(getattr(user, "stripe_payouts_enabled", False)),
            "unsupported_country": stripe_ok is False,
            "note": (
                None if stripe_available else
                f"Direct bank transfer isn't available in your country"
                f"{f' ({country})' if country else ''} yet. Use PayPal — you can "
                f"withdraw from PayPal into your own bank account."
            ),
        },
        "paypal": {
            "available": paypal_service.is_enabled(),
            "email_on_file": bool(getattr(user, "paypal_payout_email", None)),
            "note": PAYPAL_LOCAL_GUIDANCE.get(country or ""),
        },
        # The rail a creator should be shown first.
        "recommended": (
            "stripe" if (stripe_available and getattr(user, "stripe_payouts_enabled", False))
            else "paypal" if paypal_service.is_enabled()
            else "stripe" if stripe_available
            else None
        ),
    }
