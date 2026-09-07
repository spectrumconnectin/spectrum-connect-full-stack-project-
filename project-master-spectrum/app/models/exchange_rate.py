"""
Cached foreign-exchange rates
=============================

One document per refresh, holding a full snapshot of rates against the base
currency. Snapshots are kept rather than overwritten so that a rate locked to a
project can always be traced back to the snapshot it came from — when a creator
asks why they were paid a particular figure months later, the answer has to be
recoverable.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel


class ExchangeRateSnapshot(Document):
    """A full set of rates against `base`, as at `fetched_at`."""

    base: str = "USD"
    # {"LKR": 327.866155, "EUR": 0.861072, ...} — units of the quoted currency
    # per one unit of base.
    rates: Dict[str, float] = Field(default_factory=dict)

    source: str = "open.er-api.com"
    # The provider's own timestamp for the data, which can lag our fetch.
    provider_updated_at: Optional[datetime] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "exchange_rates"
        indexes = [
            IndexModel([("fetched_at", DESCENDING)]),
            IndexModel([("base", ASCENDING), ("fetched_at", DESCENDING)]),
        ]
