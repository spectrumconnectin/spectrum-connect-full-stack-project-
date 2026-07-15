"""
Push notifications router
=========================
Lets a signed-in user register/unregister their browser for Web Push, exposes
the VAPID public key the browser needs to subscribe, and a self-test endpoint.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.auth.auth import get_current_user
from app.models.schema import User
from app.services import push_service

router = APIRouter(prefix="/push", tags=["Push Notifications"])


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class SubscribeBody(BaseModel):
    endpoint: str
    keys: PushKeys


class UnsubscribeBody(BaseModel):
    endpoint: str


@router.get("/public-key")
async def get_public_key():
    """Public VAPID key + whether push is configured. No auth required."""
    return {"enabled": push_service.enabled(), "public_key": push_service.public_key()}


@router.post("/subscribe")
async def subscribe(
    body: SubscribeBody,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Register this browser to receive push notifications for the current user."""
    await push_service.save_subscription(
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh=body.keys.p256dh,
        auth=body.keys.auth,
        account_type=getattr(current_user, "account_type", None),
        user_agent=request.headers.get("user-agent"),
    )
    return {"ok": True, "enabled": push_service.enabled()}


@router.post("/unsubscribe")
async def unsubscribe(
    body: UnsubscribeBody,
    current_user: User = Depends(get_current_user),
):
    await push_service.delete_subscription(user_id=current_user.id, endpoint=body.endpoint)
    return {"ok": True}


@router.post("/test")
async def test_push(current_user: User = Depends(get_current_user)):
    """Send a test notification to the current user's subscribed browsers."""
    sent = await push_service.send_to_user(
        current_user.id,
        title="🔔 Notifications are on",
        body="You'll now get browser alerts when new projects are posted.",
        url="/creator/find-projects",
        tag="push-test",
    )
    return {"ok": True, "delivered": sent}
