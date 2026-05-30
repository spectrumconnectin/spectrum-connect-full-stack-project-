from __future__ import annotations

"""
Lightweight, in-memory rate limiting utilities.

NOTE: this is single-process only. For multi-instance autoscaling, swap for a
Redis-backed implementation (fastapi-limiter) so the limit is enforced across
all replicas. The implementation below is proxy-aware: when the app is behind
a load balancer (EB Classic LB), `X-Forwarded-For` is honored so per-IP
limits target the real client and not the LB.
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


def _client_id(request: Request) -> str:
    """Return a best-effort client identifier.

    Honors X-Forwarded-For when present (LB sets this), falling back to the
    direct peer. We take the FIRST hop, which is the original client IP per
    convention. This is sufficient for coarse abuse protection; do not rely
    on it for security decisions without verifying the LB strips/overwrites
    client-supplied XFF headers (EB Classic LB does).
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


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
        identifier = _client_id(request)
        key = (scope, identifier)
        now = datetime.utcnow()

        bucket = _buckets[key]

        # Drop timestamps outside the window
        while bucket.hits and now - bucket.hits[0] > window:
            bucket.hits.popleft()

        if len(bucket.hits) >= limit:
            retry_after = window_seconds
            if bucket.hits:
                # Time until the oldest hit expires from the window.
                seconds_until_free = window - (now - bucket.hits[0])
                retry_after = max(1, int(seconds_until_free.total_seconds()))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests, please try again later.",
                headers={"Retry-After": str(retry_after)},
            )

        bucket.hits.append(now)

    return _dependency
