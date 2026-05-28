from __future__ import annotations

"""
Lightweight, in-memory rate limiting utilities for development.

This is NOT meant as a production-grade solution, but it provides a
simple way to start thinking about abuse protection and can later be
swapped out for a Redis-backed implementation (e.g. fastapi-limiter).
"""

from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Deque, Dict

from fastapi import HTTPException, Request, status


@dataclass
class Bucket:
    hits: Deque[datetime]


# Structure: {(scope, identifier): Bucket}
_buckets: Dict[tuple[str, str], Bucket] = defaultdict(lambda: Bucket(deque()))


def rate_limiter(scope: str, limit: int, window_seconds: int):
    """
    Return a dependency that enforces a simple fixed-window rate limit
    per client IP + scope.

    Example (per-IP):
        @router.post("/login")
        async def login(..., _: None = Depends(rate_limiter("auth_login", 10, 60))):
            ...

    For production:
        - Replace this with a distributed, durable solution (Redis, fastapi-limiter).
        - Consider per-user limits in addition to per-IP.
    """

    window = timedelta(seconds=window_seconds)

    async def _dependency(request: Request) -> None:
        identifier = request.client.host if request.client else "unknown"
        key = (scope, identifier)
        now = datetime.utcnow()

        bucket = _buckets[key]

        # Drop timestamps outside the window
        while bucket.hits and now - bucket.hits[0] > window:
            bucket.hits.popleft()

        if len(bucket.hits) >= limit:
            # Basic 429; in production you might add Retry-After headers
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests, please try again later.",
            )

        bucket.hits.append(now)

    return _dependency



