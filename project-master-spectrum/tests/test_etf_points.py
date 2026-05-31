"""Unit tests for the ETF Points (Earn Trust Framework) service.

Covers the pure functions only — `level_for`, `_idempotency_key`, and the
config-driven point amounts. Database-touching behavior (award + dedup)
is exercised by the existing pytest harness inside CI when Mongo is
available; here we keep the suite hermetic.

Run with:
    cd project-master-spectrum && python -m pytest tests/test_etf_points.py -v
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("MONGO_URI", "mongodb://placeholder")
os.environ.setdefault("MONGODB_DB", "placeholder")

from app.core.config import settings  # noqa: E402
from app.services.etf_points_service import (  # noqa: E402
    level_for,
    _idempotency_key,
    _default_points_for,
    _is_self_deal,
)


# ─────────────────────────────────────────────────────────────────────────────
# Level computation
# ─────────────────────────────────────────────────────────────────────────────

def test_zero_points_is_bronze():
    info = level_for(0)
    assert info.name == "bronze"
    assert info.min_points == 0
    assert info.next_min_points == settings.ETF_LEVEL_SILVER
    assert 0 <= info.progress_pct < 100


def test_just_below_silver_is_bronze():
    info = level_for(settings.ETF_LEVEL_SILVER - 1)
    assert info.name == "bronze"


def test_at_silver_threshold_is_silver():
    info = level_for(settings.ETF_LEVEL_SILVER)
    assert info.name == "silver"
    assert info.progress_pct == 0
    assert info.next_min_points == settings.ETF_LEVEL_GOLD


def test_at_gold_threshold_is_gold():
    info = level_for(settings.ETF_LEVEL_GOLD)
    assert info.name == "gold"
    assert info.next_min_points == settings.ETF_LEVEL_PLATINUM


def test_at_platinum_threshold_is_platinum():
    info = level_for(settings.ETF_LEVEL_PLATINUM)
    assert info.name == "platinum"
    assert info.next_min_points is None
    assert info.progress_pct == 100


def test_far_above_platinum_stays_platinum():
    info = level_for(settings.ETF_LEVEL_PLATINUM * 10)
    assert info.name == "platinum"
    assert info.progress_pct == 100


def test_progress_pct_is_monotonic_within_a_tier():
    """Within a single tier, more points => higher progress."""
    a = level_for(settings.ETF_LEVEL_SILVER + 10)
    b = level_for(settings.ETF_LEVEL_SILVER + 100)
    c = level_for(settings.ETF_LEVEL_SILVER + 500)
    assert a.name == b.name == c.name == "silver"
    assert a.progress_pct <= b.progress_pct <= c.progress_pct


def test_each_level_has_distinct_icon_and_color():
    seen = set()
    for pts in [0, settings.ETF_LEVEL_SILVER, settings.ETF_LEVEL_GOLD, settings.ETF_LEVEL_PLATINUM]:
        info = level_for(pts)
        seen.add((info.icon, info.color, info.label))
    assert len(seen) == 4, "Each level should have a distinct visual identity"


# ─────────────────────────────────────────────────────────────────────────────
# Idempotency key derivation
# ─────────────────────────────────────────────────────────────────────────────

def test_idempotency_key_is_deterministic():
    k1 = _idempotency_key("milestone.released.creator", "escrow_milestone", "abc:1")
    k2 = _idempotency_key("milestone.released.creator", "escrow_milestone", "abc:1")
    assert k1 == k2


def test_idempotency_key_differs_per_action():
    k1 = _idempotency_key("milestone.released.creator", "escrow_milestone", "abc:1")
    k2 = _idempotency_key("milestone.released.client", "escrow_milestone", "abc:1")
    assert k1 != k2


def test_idempotency_key_differs_per_source_id():
    k1 = _idempotency_key("milestone.released.creator", "escrow_milestone", "abc:1")
    k2 = _idempotency_key("milestone.released.creator", "escrow_milestone", "abc:2")
    assert k1 != k2


def test_idempotency_key_is_short():
    # 32-char hex prefix — long enough to be globally unique, short enough
    # to index without bloating the collection.
    assert len(_idempotency_key("x", "y", "z")) == 32


# ─────────────────────────────────────────────────────────────────────────────
# Default action point amounts come from config
# ─────────────────────────────────────────────────────────────────────────────

def test_default_points_table_covers_all_actions():
    actions = [
        "project.posted",
        "project.hired",
        "milestone.funded",
        "milestone.released.client",
        "milestone.released.creator",
        "project.completed.client",
        "project.completed.creator",
        "review.submitted",
        "repeat_client.bonus",
        "profile.verified",
    ]
    for a in actions:
        assert _default_points_for(a) > 0, f"{a} should award positive default points"


def test_unknown_action_returns_zero():
    assert _default_points_for("totally.fake.action") == 0


# ─────────────────────────────────────────────────────────────────────────────
# Self-deal detection
# ─────────────────────────────────────────────────────────────────────────────

def test_self_deal_when_actor_equals_counterparty():
    from beanie import PydanticObjectId
    a = PydanticObjectId()
    assert _is_self_deal(a, a) is True


def test_no_self_deal_when_actor_differs():
    from beanie import PydanticObjectId
    a = PydanticObjectId()
    b = PydanticObjectId()
    assert _is_self_deal(a, b) is False


def test_no_self_deal_when_counterparty_is_none():
    from beanie import PydanticObjectId
    assert _is_self_deal(PydanticObjectId(), None) is False
