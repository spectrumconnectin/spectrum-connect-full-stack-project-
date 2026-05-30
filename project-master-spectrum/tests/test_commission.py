"""Unit tests for the v1 8/4 commission split.

These tests mirror the table in the spec section 9 ("Minimal Tests") plus the
edge cases called out in sections 3 ("Rounding Guard") and 7 ("Edge Cases").

Run with:
    cd project-master-spectrum && python -m pytest tests/test_commission.py -v
"""

from __future__ import annotations

import os
import sys
from decimal import Decimal

# Make `app.*` importable when tests are run from the project root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# These two values aren't sensitive — they only stop pydantic-settings from
# bailing out on missing required env vars. Replace with real values for any
# integration tests that touch the database.
os.environ.setdefault("MONGO_URI", "mongodb://placeholder")
os.environ.setdefault("MONGODB_DB", "placeholder")

from app.services.commission_service import calc_commission, calc_refund_reversal  # noqa: E402


def _approx(actual, expected, tol=Decimal("0.01")):
    return abs(Decimal(str(actual)) - Decimal(str(expected))) <= tol


# ─────────────────────────────────────────────────────────────────────────────
# Spec §9 - Minimal table tests
# ─────────────────────────────────────────────────────────────────────────────

def test_100_dollar_project_no_cap():
    """100 → 8 / 4."""
    fees = calc_commission(100)
    assert _approx(fees.creator_fee, "8.00")
    assert _approx(fees.client_fee, "4.00")
    assert _approx(fees.platform_take, "12.00")
    assert _approx(fees.client_total, "104.00")
    assert _approx(fees.creator_payout, "92.00")


def test_500_dollar_project_no_cap():
    """500 → 40 / 20."""
    fees = calc_commission(500)
    assert _approx(fees.creator_fee, "40.00")
    assert _approx(fees.client_fee, "20.00")
    assert _approx(fees.platform_take, "60.00")
    assert _approx(fees.client_total, "520.00")
    assert _approx(fees.creator_payout, "460.00")


def test_15_dollar_micro_project_below_cap():
    """15 → raw 1.80 (no cap, raw < 2.00) → 1.20 / 0.60."""
    fees = calc_commission(15)
    assert _approx(fees.creator_fee, "1.20")
    assert _approx(fees.client_fee, "0.60")
    assert _approx(fees.platform_take, "1.80")
    assert _approx(fees.client_total, "15.60")
    assert _approx(fees.creator_payout, "13.80")


def test_18_dollar_micro_project_cap_triggers():
    """18 → raw 2.16 > 2.00 cap → ≈ 1.33 / 0.67 summing to exactly 2.00."""
    fees = calc_commission(18)
    assert fees.creator_fee + fees.client_fee == Decimal("2.00")
    # 2.00 * 8/12 = 1.333… → banker's rounds to 1.33
    assert _approx(fees.creator_fee, "1.33")
    assert _approx(fees.client_fee, "0.67")


def test_19_99_micro_project_cap_triggers():
    """19.99 → raw ≈ 2.3988 > 2.00 cap → splits exactly to 2.00."""
    fees = calc_commission("19.99")
    assert fees.creator_fee + fees.client_fee == Decimal("2.00")


# ─────────────────────────────────────────────────────────────────────────────
# Spec §3 - Rounding guard property
# ─────────────────────────────────────────────────────────────────────────────

def test_rounding_guard_under_cap_threshold():
    """For every subtotal below the cap threshold, creator+client must
    equal the capped platform fee exactly."""
    for cents in range(1, 2000, 7):     # spot-check 1¢..$19.99 in 7¢ steps
        subtotal = Decimal(cents) / Decimal(100)
        fees = calc_commission(subtotal)
        platform_fee_raw = subtotal * Decimal("0.12")
        cap = Decimal("2.00")
        expected_total = min(platform_fee_raw, cap).quantize(Decimal("0.01"))
        assert fees.creator_fee + fees.client_fee == expected_total, (
            f"subtotal={subtotal}: {fees.creator_fee}+{fees.client_fee}"
            f" != {expected_total}"
        )


def test_rounding_guard_above_threshold():
    """For subtotals >= $20, fees use raw 8% and 4% — sums should equal 12%."""
    for cents in range(2000, 100000, 137):
        subtotal = Decimal(cents) / Decimal(100)
        fees = calc_commission(subtotal)
        expected_total = (subtotal * Decimal("0.12")).quantize(Decimal("0.01"))
        # Allow 1¢ slack for double-rounding (8% and 4% rounded separately)
        diff = abs(fees.creator_fee + fees.client_fee - expected_total)
        assert diff <= Decimal("0.01"), (
            f"subtotal={subtotal}: diff={diff}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Spec §7 - Edge cases
# ─────────────────────────────────────────────────────────────────────────────

def test_zero_subtotal_returns_zero_fees():
    fees = calc_commission(0)
    assert fees.creator_fee == Decimal("0.00")
    assert fees.client_fee == Decimal("0.00")
    assert fees.creator_payout == Decimal("0.00")
    assert fees.client_total == Decimal("0.00")


def test_negative_subtotal_returns_zero_fees():
    fees = calc_commission(-50)
    assert fees.creator_fee == Decimal("0.00")
    assert fees.client_fee == Decimal("0.00")


def test_commission_version_stamped():
    """Every breakdown carries the commission version for audit trail."""
    fees = calc_commission(100)
    assert fees.commission_version  # truthy, non-empty
    assert "v1" in fees.commission_version


def test_currency_passthrough():
    fees = calc_commission(100, currency="EUR")
    assert fees.currency == "EUR"


# ─────────────────────────────────────────────────────────────────────────────
# Refund reversal (spec §7 - "Refunds (partial/milestone)")
# ─────────────────────────────────────────────────────────────────────────────

def test_full_refund_reverses_full_fees():
    """Refund == original subtotal → fee reversal equals original fees."""
    original = calc_commission(500)
    refund = calc_refund_reversal(500, 500)
    assert refund.creator_fee == original.creator_fee
    assert refund.client_fee == original.client_fee


def test_half_refund_reverses_half_fees():
    """Refund == 50% of original → fee reversal ~ 50% of original fees."""
    original = calc_commission(500)
    refund = calc_refund_reversal(500, 250)
    assert _approx(refund.creator_fee, original.creator_fee / 2)
    assert _approx(refund.client_fee, original.client_fee / 2)


def test_refund_cannot_exceed_original_fees():
    """Even with a refund > subtotal, reversal is clamped."""
    original = calc_commission(100)
    refund = calc_refund_reversal(100, 9999)
    assert refund.creator_fee <= original.creator_fee
    assert refund.client_fee <= original.client_fee
