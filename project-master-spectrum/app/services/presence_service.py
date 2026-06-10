"""
PresenceService
===============
Manages user online/offline status and activity tracking.

Usage:
    from app.services.presence_service import PresenceService
    await PresenceService.set_online(user_id)
    await PresenceService.set_offline(user_id)
    is_online = await PresenceService.is_user_online(user_id)
"""

from datetime import datetime, timedelta
from beanie import PydanticObjectId
from app.models.message import UserPresence


class PresenceService:
    """Manage user presence (online/offline status)"""

    OFFLINE_TIMEOUT = 2  # Minutes - mark user as offline if no activity for 2 minutes

    @staticmethod
    async def set_online(user_id: str) -> None:
        """Mark user as online"""
        try:
            user_id_oid = PydanticObjectId(user_id) if isinstance(user_id, str) else user_id
            presence = await UserPresence.find_one({"user_id": str(user_id)})

            if not presence:
                presence = UserPresence(
                    user_id=str(user_id),
                    is_online=True,
                    last_seen=datetime.utcnow(),
                    last_activity=datetime.utcnow(),
                )
                await presence.insert()
            else:
                presence.is_online = True
                presence.last_activity = datetime.utcnow()
                await presence.save()
        except Exception as e:
            # Silently fail - don't break the app if presence tracking fails
            pass

    @staticmethod
    async def set_offline(user_id: str) -> None:
        """Mark user as offline"""
        try:
            presence = await UserPresence.find_one({"user_id": str(user_id)})

            if presence:
                presence.is_online = False
                presence.last_seen = datetime.utcnow()
                await presence.save()
        except Exception as e:
            # Silently fail
            pass

    @staticmethod
    async def is_user_online(user_id: str) -> bool:
        """Check if user is online"""
        try:
            presence = await UserPresence.find_one({"user_id": str(user_id)})

            if not presence:
                return False

            # If last activity was too long ago, mark as offline
            time_since_activity = datetime.utcnow() - presence.last_activity
            if time_since_activity > timedelta(minutes=PresenceService.OFFLINE_TIMEOUT):
                presence.is_online = False
                await presence.save()
                return False

            return presence.is_online
        except Exception:
            return False

    @staticmethod
    async def update_activity(user_id: str) -> None:
        """Update last activity time (keeps user marked as online)"""
        try:
            presence = await UserPresence.find_one({"user_id": str(user_id)})

            if not presence:
                presence = UserPresence(
                    user_id=str(user_id),
                    is_online=True,
                    last_seen=datetime.utcnow(),
                    last_activity=datetime.utcnow(),
                )
                await presence.insert()
            else:
                presence.last_activity = datetime.utcnow()
                presence.is_online = True
                await presence.save()
        except Exception:
            # Silently fail
            pass

    @staticmethod
    async def get_presence_bulk(user_ids: list) -> dict:
        """Read-only presence for many users in one query.

        Returns {user_id_str: {is_online, last_activity}}. Computes is_online
        from heartbeat age like get_presence, but skips the stored-flag
        writeback — list endpoints (talent search) shouldn't issue N writes.
        """
        out: dict = {}
        try:
            ids = [str(u) for u in user_ids]
            docs = await UserPresence.find({"user_id": {"$in": ids}}).to_list()
            now = datetime.utcnow()
            window = timedelta(minutes=PresenceService.OFFLINE_TIMEOUT)
            for p in docs:
                is_online = bool(p.last_activity and (now - p.last_activity) <= window)
                out[str(p.user_id)] = {
                    "user_id": str(p.user_id),
                    "is_online": is_online,
                    "last_activity": p.last_activity.isoformat() if p.last_activity else None,
                }
        except Exception:
            pass
        return out

    @staticmethod
    async def get_presence(user_id: str) -> dict:
        """Get full presence info for a user.

        is_online is derived purely from last_activity age — this correctly
        handles browser crashes, network drops, and sessions that expire
        without an explicit logout (no stored flag to go stale).
        """
        try:
            presence = await UserPresence.find_one({"user_id": str(user_id)})

            if not presence:
                return {
                    "user_id": str(user_id),
                    "is_online": False,
                    "last_activity": None,
                }

            # Compute is_online from heartbeat age only — ignores the stored flag
            # so browser crashes / network drops auto-expire correctly.
            time_since_activity = datetime.utcnow() - presence.last_activity
            is_online = time_since_activity <= timedelta(minutes=PresenceService.OFFLINE_TIMEOUT)

            # Persist the computed state so the stored flag stays in sync.
            if presence.is_online != is_online:
                presence.is_online = is_online
                if not is_online:
                    presence.last_seen = presence.last_activity  # stamp last_seen on expiry
                await presence.save()

            return {
                "user_id": str(user_id),
                "is_online": is_online,
                # last_activity is the authoritative "last seen" timestamp —
                # it's updated on every heartbeat, so it's always accurate.
                "last_activity": presence.last_activity.isoformat() if presence.last_activity else None,
            }
        except Exception:
            return {
                "user_id": str(user_id),
                "is_online": False,
                "last_activity": None,
            }
