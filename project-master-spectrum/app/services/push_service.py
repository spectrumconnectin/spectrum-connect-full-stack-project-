"""
PushService
===========
Web Push (browser notification) delivery via VAPID.

All sends are best-effort and never raise into the caller — a push failure
must never break the business flow that triggered it. Expired/invalid
subscriptions (HTTP 404/410) are pruned automatically.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId

from app.core.config import settings

logger = logging.getLogger(__name__)


def enabled() -> bool:
    return settings.web_push_enabled()


def public_key() -> str:
    return settings.VAPID_PUBLIC_KEY or ""


async def save_subscription(
    *, user_id: PydanticObjectId, endpoint: str, p256dh: str, auth: str,
    account_type: Optional[str] = None, user_agent: Optional[str] = None,
) -> None:
    """Insert or refresh a browser push subscription (idempotent per endpoint)."""
    from app.models.schema import PushSubscription
    existing = await PushSubscription.find_one({"user_id": user_id, "endpoint": endpoint})
    if existing:
        existing.p256dh = p256dh
        existing.auth = auth
        existing.account_type = account_type
        existing.user_agent = user_agent
        existing.last_used_at = datetime.utcnow()
        await existing.save()
        return
    await PushSubscription(
        user_id=user_id, endpoint=endpoint, p256dh=p256dh, auth=auth,
        account_type=account_type, user_agent=user_agent,
    ).insert()


async def delete_subscription(*, user_id: PydanticObjectId, endpoint: str) -> None:
    from app.models.schema import PushSubscription
    sub = await PushSubscription.find_one({"user_id": user_id, "endpoint": endpoint})
    if sub:
        await sub.delete()


def _send_blocking(sub_info: dict, data: str) -> int:
    """Blocking pywebpush call. Returns HTTP status (or 0 on library error)."""
    try:
        from pywebpush import webpush, WebPushException
        from py_vapid import Vapid02
    except Exception as exc:  # library missing
        logger.warning("pywebpush not available: %s", exc)
        return 0
    try:
        # Build the VAPID signer from the raw URL-safe-base64 private key.
        vapid = Vapid02.from_raw(settings.VAPID_PRIVATE_KEY.encode("utf-8"))
        webpush(
            subscription_info=sub_info,
            data=data,
            vapid_private_key=vapid,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
            ttl=86400,
        )
        return 201
    except WebPushException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None) or 0
        if status not in (404, 410):
            logger.warning("Web push failed (status=%s): %s", status, str(exc)[:200])
        return status
    except Exception as exc:
        logger.warning("Web push error: %s", str(exc)[:200])
        return 0


async def send_to_user(
    user_id, *, title: str, body: str, url: str = "/", tag: Optional[str] = None,
    icon: Optional[str] = None,
) -> int:
    """Deliver a browser notification to every device the user subscribed with.
    Returns the number of successful sends. Never raises. Prunes dead subs."""
    if not enabled():
        return 0
    try:
        from app.models.schema import PushSubscription
        uid = user_id if isinstance(user_id, PydanticObjectId) else PydanticObjectId(str(user_id))
        subs = await PushSubscription.find({"user_id": uid}).to_list()
        if not subs:
            return 0

        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url,
            "tag": tag or "spectrum",
            "icon": icon or "/assets/spectrum-logo.svg",
        })

        sent = 0
        for sub in subs:
            info = {"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}}
            status = await asyncio.to_thread(_send_blocking, info, payload)
            if status in (200, 201):
                sent += 1
            elif status in (404, 410):
                # Subscription is gone — remove it so we stop trying.
                try:
                    await sub.delete()
                except Exception:
                    pass
        return sent
    except Exception as exc:
        logger.warning("send_to_user failed: %s", exc)
        return 0
