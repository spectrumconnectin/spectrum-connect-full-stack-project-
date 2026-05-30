"""
Commission Service (v1, Split 8/4)
===================================

Implements the platform commission logic from the spec
"Spectrum Connect — Commission Logic (v1, Split 8/4)".

Headline rules:
  - Total platform fee = 12% of the project subtotal.
  - Split 8% (creator side) + 4% (client side).
  - Micro-project cap: when subtotal < $20, the TOTAL platform fee is
    capped at $2 (so $1.33 creator + $0.67 client at the rounding guard).
  - Banker's rounding (ROUND_HALF_EVEN) to 2 decimals.
  - Rounding guard guarantees creator_fee + client_fee equals the capped
    platform fee exactly.

All rates are configurable via env vars (see app/core/config.py):

  COMM_TOTAL_RATE       (default 0.12)
  COMM_CREATOR_PART     (default 8/12 ~ 0.6666667)
  COMM_CLIENT_PART      (default 4/12 ~ 0.3333333)  (informational; we
                         compute client_fee as `platform_fee - creator_fee`
                         to enforce the rounding guard)
  COMM_MICRO_THRESHOLD  (default 20.00)
  COMM_MICRO_CAP        (default 2.00)
  COMM_VERSION          (default "v1.split.8_4")

Every Transaction records the commission_version that produced its fees so
historical entries remain reproducible after future rate changes.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from decimal import Decimal, ROUND_HALF_EVEN, getcontext
from typing import Dict, Union

from app.core.config import settings


# Use enough precision for percentage math without surprises.
getcontext().prec = 28

# Sentinel commission version string written into Transaction records.
DEFAULT_COMMISSION_VERSION = "v1.split.8_4"

Numberish = Union[int, float, str, Decimal]


@dataclass
class CommissionBreakdown:
    """Structured fee breakdown for a single charge.

    All amounts are Decimals quantised to 2 decimal places — convert to
    `float` at the API boundary, never inside business logic.
    """

    project_subtotal: Decimal
    creator_fee: Decimal
    client_fee: Decimal
    platform_take: Decimal
    client_total: Decimal           # what the client is charged (excl. taxes & processing)
    creator_payout: Decimal         # what the creator nets (excl. taxes & processing)
    commission_version: str
    currency: str

    def to_dict(self) -> Dict[str, Union[float, str]]:
        """Serialise for API responses — Decimals become floats."""
        out: Dict[str, Union[float, str]] = {}
        for k, v in asdict(self).items():
            if isinstance(v, Decimal):
                out[k] = float(v)
            else:
                out[k] = v
        return out


def _round_money(x: Decimal) -> Decimal:
    """Banker's rounding to 2 decimal places."""
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)


def _as_decimal(x: Numberish) -> Decimal:
    """Coerce numeric input to Decimal without floating-point surprises."""
    if isinstance(x, Decimal):
        return x
    # Convert floats via str() so 0.1 doesn't become 0.10000000000000000555…
    return Decimal(str(x))


def _settings_decimal(name: str, fallback: str) -> Decimal:
    """Read a Decimal-typed config value, falling back to `fallback`."""
    raw = getattr(settings, name, None)
    if raw is None:
        return Decimal(fallback)
    return _as_decimal(raw)


def calc_commission(
    project_subtotal: Numberish,
    currency: str = "USD",
) -> CommissionBreakdown:
    """
    Compute the v1 8/4 commission split for a single charge.

    Args:
        project_subtotal: agreed project price before platform/client fees.
        currency: ISO-4217 currency code (informational; math is independent).

    Returns:
        CommissionBreakdown with creator_fee + client_fee summing exactly
        to the (possibly capped) platform fee.
    """

    subtotal = _as_decimal(project_subtotal)

    # Negative or zero subtotals produce a zero-fee breakdown so callers can
    # still build a Transaction record without special-casing.
    if subtotal <= 0:
        zero = _round_money(Decimal("0"))
        return CommissionBreakdown(
            project_subtotal=_round_money(subtotal),
            creator_fee=zero,
            client_fee=zero,
            platform_take=zero,
            client_total=_round_money(subtotal),
            creator_payout=_round_money(subtotal),
            commission_version=getattr(settings, "COMM_VERSION", DEFAULT_COMMISSION_VERSION),
            currency=currency,
        )

    total_rate = _settings_decimal("COMM_TOTAL_RATE", "0.12")
    creator_ratio = _settings_decimal("COMM_CREATOR_PART", str(Decimal(8) / Decimal(12)))
    micro_threshold = _settings_decimal("COMM_MICRO_THRESHOLD", "20.00")
    micro_cap = _settings_decimal("COMM_MICRO_CAP", "2.00")
    version = getattr(settings, "COMM_VERSION", DEFAULT_COMMISSION_VERSION)

    platform_fee_raw = subtotal * total_rate

    if subtotal < micro_threshold:
        # Cap is a MAXIMUM — only apply if raw exceeds it.
        platform_fee_capped = min(platform_fee_raw, micro_cap)
        creator_fee_unrounded = platform_fee_capped * creator_ratio
        creator_fee = _round_money(creator_fee_unrounded)
        # Rounding guard: force the two fees to sum to the capped total exactly.
        client_fee = _round_money(platform_fee_capped - creator_fee)
    else:
        creator_fee = _round_money(subtotal * Decimal("0.08"))
        client_fee = _round_money(subtotal * Decimal("0.04"))

    platform_take = creator_fee + client_fee
    client_total = _round_money(subtotal + client_fee)
    creator_payout = _round_money(subtotal - creator_fee)

    return CommissionBreakdown(
        project_subtotal=_round_money(subtotal),
        creator_fee=creator_fee,
        client_fee=client_fee,
        platform_take=platform_take,
        client_total=client_total,
        creator_payout=creator_payout,
        commission_version=version,
        currency=currency,
    )


def calc_refund_reversal(
    original_subtotal: Numberish,
    refund_amount: Numberish,
    currency: str = "USD",
) -> CommissionBreakdown:
    """
    Compute the fee reversal for a refund.

    Spec §7 — partial/milestone refunds:
      "compute fees on the refunded amount using the original effective rates
      and cap outcome; never exceed originally collected fees."

    We achieve that by:
      1. Computing the original fees for `original_subtotal`.
      2. Computing the proportional refund: refund_amount / original_subtotal.
      3. Returning a breakdown with fees scaled by that ratio (then re-rounded
         with the rounding guard so the two sides still sum exactly).
    """

    original = _as_decimal(original_subtotal)
    refund = _as_decimal(refund_amount)

    if original <= 0 or refund <= 0:
        return calc_commission(0, currency=currency)

    # Don't allow refunds larger than the original.
    refund_clamped = min(refund, original)

    original_breakdown = calc_commission(original, currency=currency)
    if original_breakdown.platform_take <= 0:
        # Nothing was collected, nothing to reverse.
        return calc_commission(0, currency=currency)

    ratio = refund_clamped / original
    creator_fee_reverse = _round_money(original_breakdown.creator_fee * ratio)
    client_fee_reverse = _round_money(original_breakdown.client_fee * ratio)

    # Reversal must never exceed what was collected.
    creator_fee_reverse = min(creator_fee_reverse, original_breakdown.creator_fee)
    client_fee_reverse = min(client_fee_reverse, original_breakdown.client_fee)

    return CommissionBreakdown(
        project_subtotal=_round_money(refund_clamped),
        creator_fee=creator_fee_reverse,
        client_fee=client_fee_reverse,
        platform_take=creator_fee_reverse + client_fee_reverse,
        client_total=_round_money(refund_clamped + client_fee_reverse),
        creator_payout=_round_money(refund_clamped - creator_fee_reverse),
        commission_version=original_breakdown.commission_version,
        currency=currency,
    )


# Convenience alias matching the doc's pseudo-code name so future readers can
# grep for either.
calc_commission_v1_split = calc_commission
