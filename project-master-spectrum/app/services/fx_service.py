"""
Currency conversion
===================

Everything on the platform is stored in one base currency (USD). Amounts are
converted only at the edges: for display in a user's preferred currency, and
once per project when a rate is locked.

Two rules this module exists to enforce:

1. **A conversion never silently guesses.** If rates are unavailable, callers
   get an explicit failure rather than an unconverted number that looks like a
   converted one. Showing "LKR 500" for USD 500 is far worse than showing
   nothing.

2. **Rounding follows the currency.** LKR and JPY have no minor unit, so
   "Rs 163,933.47" is not a real amount of money. USD has two decimals. Getting
   this wrong is how payouts end up a cent or a rupee out, repeatedly.

Rates come from a free provider, cached daily. The provider is deliberately
behind one function so it can be swapped for a paid feed without touching
anything else.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Optional, Tuple

import httpx

from app.models.exchange_rate import ExchangeRateSnapshot

logger = logging.getLogger(__name__)

BASE_CURRENCY = "USD"
_PROVIDER_URL = "https://open.er-api.com/v6/latest/USD"

# Refresh at most once a day; FX moves far less than the noise a per-request
# fetch would add, and the provider is free.
_MAX_AGE = timedelta(hours=24)
# Beyond this, rates are too old to quietly keep using — callers are told.
_STALE_AFTER = timedelta(days=7)

# Currencies with no minor unit. Quoting fractions of these is meaningless.
ZERO_DECIMAL = {"LKR", "JPY", "KRW", "VND", "IDR", "CLP", "ISK", "HUF", "XOF", "XAF"}

# What the UI offers. Every one of these must exist in the provider's response.
SUPPORTED = ["USD", "LKR", "EUR", "GBP", "AUD", "INR", "SGD", "CAD", "AED"]

CURRENCY_NAMES = {
    "USD": "US Dollar", "LKR": "Sri Lankan Rupee", "EUR": "Euro",
    "GBP": "British Pound", "AUD": "Australian Dollar", "INR": "Indian Rupee",
    "SGD": "Singapore Dollar", "CAD": "Canadian Dollar", "AED": "UAE Dirham",
}

CURRENCY_SYMBOLS = {
    "USD": "$", "LKR": "Rs ", "EUR": "€", "GBP": "£", "AUD": "A$",
    "INR": "₹", "SGD": "S$", "CAD": "C$", "AED": "AED ",
}

# In-process cache so a page rendering fifty amounts doesn't hit Mongo fifty
# times. Refreshed alongside the stored snapshot.
_cache: Dict[str, Any] = {"snapshot": None, "loaded_at": None}


def decimals_for(currency: str) -> int:
    return 0 if (currency or "").upper() in ZERO_DECIMAL else 2


def round_money(amount: float, currency: str) -> float:
    """Round to the currency's minor unit, half-up.

    Half-up rather than Python's default banker's rounding: money that rounds
    to even is surprising to users reading a total, and inconsistent with what
    payment providers do.
    """
    places = decimals_for(currency)
    quant = Decimal(1) if places == 0 else Decimal("0.01")
    value = Decimal(str(amount)).quantize(quant, rounding=ROUND_HALF_UP)
    return float(value)


def format_money(amount: Optional[float], currency: str) -> str:
    """Human-readable amount, always carrying its currency code.

    The code is included deliberately: "Rs 50,000" alone is ambiguous to anyone
    who has seen more than one rupee.
    """
    if amount is None:
        return "—"
    code = (currency or BASE_CURRENCY).upper()
    symbol = CURRENCY_SYMBOLS.get(code, f"{code} ")
    places = decimals_for(code)
    return f"{symbol}{amount:,.{places}f} ({code})"


async def _fetch_from_provider() -> Optional[Dict[str, Any]]:
    """Pull a fresh snapshot. Returns None on any failure — callers fall back
    to the last stored snapshot rather than failing outright."""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(_PROVIDER_URL)
        if resp.status_code >= 400:
            logger.error("FX provider returned %s", resp.status_code)
            return None
        data = resp.json()
        if data.get("result") != "success" or not data.get("rates"):
            logger.error("FX provider returned an unusable payload")
            return None
        return data
    except Exception as e:
        logger.error("FX provider unreachable: %s", e)
        return None


async def refresh_rates(force: bool = False) -> Optional[ExchangeRateSnapshot]:
    """Fetch and store a new snapshot if the newest one is older than a day."""
    latest = await ExchangeRateSnapshot.find_all().sort("-fetched_at").first_or_none()

    if latest and not force and datetime.utcnow() - latest.fetched_at < _MAX_AGE:
        return latest

    data = await _fetch_from_provider()
    if not data:
        # Keep serving the old snapshot; a provider outage must not take
        # pricing down with it.
        return latest

    provider_updated = None
    try:
        if data.get("time_last_update_unix"):
            provider_updated = datetime.utcfromtimestamp(int(data["time_last_update_unix"]))
    except Exception:
        pass

    snapshot = ExchangeRateSnapshot(
        base=data.get("base_code", BASE_CURRENCY).upper(),
        rates={k.upper(): float(v) for k, v in data["rates"].items()},
        provider_updated_at=provider_updated,
    )
    await snapshot.insert()

    _cache["snapshot"] = snapshot
    _cache["loaded_at"] = datetime.utcnow()
    logger.info("FX rates refreshed (%d currencies)", len(snapshot.rates))
    return snapshot


async def current_snapshot() -> Optional[ExchangeRateSnapshot]:
    """Newest usable snapshot, refreshing in the background if it has aged out."""
    cached = _cache.get("snapshot")
    loaded = _cache.get("loaded_at")
    if cached and loaded and datetime.utcnow() - loaded < timedelta(minutes=15):
        return cached

    snapshot = await refresh_rates()
    if snapshot:
        _cache["snapshot"] = snapshot
        _cache["loaded_at"] = datetime.utcnow()
    return snapshot


def is_stale(snapshot: Optional[ExchangeRateSnapshot]) -> bool:
    return not snapshot or (datetime.utcnow() - snapshot.fetched_at) > _STALE_AFTER


async def rate_for(from_currency: str, to_currency: str) -> Optional[float]:
    """Units of `to_currency` per one unit of `from_currency`.

    None when it cannot be determined — never a fallback of 1.0, which would
    quietly treat every currency as equal.
    """
    src = (from_currency or BASE_CURRENCY).upper()
    dst = (to_currency or BASE_CURRENCY).upper()
    if src == dst:
        return 1.0

    snapshot = await current_snapshot()
    if not snapshot:
        return None

    rates = snapshot.rates
    base = snapshot.base.upper()

    # Rates are quoted against the snapshot's base, so a cross-rate goes
    # through it: LKR per GBP = (LKR per USD) / (GBP per USD).
    src_per_base = 1.0 if src == base else rates.get(src)
    dst_per_base = 1.0 if dst == base else rates.get(dst)
    if not src_per_base or not dst_per_base:
        logger.warning("No FX rate for %s->%s in snapshot", src, dst)
        return None

    return dst_per_base / src_per_base


def rate_to_base_cached(currency: str) -> Optional[float]:
    """Base-currency units per 1 unit of `currency`, from the in-process cache.

    Synchronous and cache-only, so money paths that are not async (commission
    maths, called from a dozen places) can still reason about non-base amounts.
    Returns None when the cache is cold, and callers carry on with base-currency
    behaviour rather than blocking on a network fetch mid-calculation.
    """
    code = (currency or BASE_CURRENCY).upper()
    if code == BASE_CURRENCY:
        return 1.0

    snapshot = _cache.get("snapshot")
    if not snapshot:
        return None

    per_base = snapshot.rates.get(code)
    if not per_base:
        return None
    return 1.0 / per_base


async def convert(
    amount: Optional[float],
    from_currency: str,
    to_currency: str,
    locked_rate: Optional[float] = None,
) -> Tuple[Optional[float], Optional[float]]:
    """Convert an amount, returning (converted_amount, rate_used).

    `locked_rate` takes precedence over live rates — that is the whole point of
    locking one to a project: the figure a creator was shown when the work was
    agreed is the figure they are paid, regardless of what the market did
    afterwards.

    Returns (None, None) when no rate is available, so a caller can show the
    original amount rather than an invented conversion.
    """
    if amount is None:
        return None, None

    src = (from_currency or BASE_CURRENCY).upper()
    dst = (to_currency or BASE_CURRENCY).upper()
    if src == dst:
        return round_money(amount, dst), 1.0

    rate = locked_rate if locked_rate else await rate_for(src, dst)
    if not rate:
        return None, None

    return round_money(amount * rate, dst), rate


async def describe(
    amount: Optional[float],
    currency: str,
    display_currency: Optional[str] = None,
    locked_rate: Optional[float] = None,
) -> Dict[str, Any]:
    """An amount packaged for the UI: the real figure, plus how it reads to
    this viewer.

    `original` is always the truth — the currency the project or payment is
    actually denominated in. `converted` is an aid, and is flagged as
    approximate unless it came from a locked rate.
    """
    code = (currency or BASE_CURRENCY).upper()
    result: Dict[str, Any] = {
        "amount": None if amount is None else round_money(amount, code),
        "currency": code,
        "formatted": format_money(amount, code),
        "converted": None,
    }

    target = (display_currency or code).upper()
    if amount is None or target == code:
        return result

    converted, rate = await convert(amount, code, target, locked_rate=locked_rate)
    if converted is None:
        # No rate: show the original only. Better a missing conversion than a
        # wrong one.
        return result

    snapshot = await current_snapshot()
    result["converted"] = {
        "amount": converted,
        "currency": target,
        "formatted": format_money(converted, target),
        "rate": rate,
        "locked": bool(locked_rate),
        # Only an unlocked, live conversion is an estimate; a locked rate is
        # the amount that will actually be paid.
        "approximate": not bool(locked_rate),
        "rate_age_stale": is_stale(snapshot),
        "as_of": snapshot.fetched_at.isoformat() if snapshot else None,
    }
    return result


def supported_currencies() -> list:
    """The currencies a user may choose, for settings and pickers."""
    return [
        {
            "code": code,
            "name": CURRENCY_NAMES.get(code, code),
            "symbol": CURRENCY_SYMBOLS.get(code, f"{code} "),
            "decimals": decimals_for(code),
        }
        for code in SUPPORTED
    ]
