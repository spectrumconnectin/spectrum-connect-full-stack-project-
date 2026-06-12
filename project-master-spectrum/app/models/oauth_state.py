"""
OAuth state / exchange-code store
=================================
Short-lived, shared-across-workers store for the OAuth flow.

Previously these lived in a per-process in-memory dict, which broke on
Elastic Beanstalk: the `/google_login` request that creates a state token
and the Google callback that validates it are frequently served by
different Gunicorn/Uvicorn workers (or after a redeploy), so the token was
"not found" → invalid_state. Persisting to MongoDB makes the store shared
by every worker and survives restarts.

Two kinds of records share this collection, distinguished by the `key`:
  - CSRF state:    key = "<random state token>",         value = "1"
  - Exchange code: key = "exchange:<random code>",        value = "<JWT>"

A TTL index auto-deletes records 15 minutes after creation. OAuth
round-trips finish in seconds, so this only cleans up abandoned flows.
"""

from __future__ import annotations

from datetime import datetime

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class OAuthState(Document):
    key: str                 # state token, or "exchange:<code>"
    value: str = "1"         # sentinel for CSRF state; JWT for exchange codes
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "oauth_states"
        indexes = [
            "key",
            # Auto-expire 15 minutes after creation. Mongo's TTL monitor
            # removes stale state/exchange records so the collection never grows.
            IndexModel([("created_at", 1)], expireAfterSeconds=900),
        ]
