from __future__ import annotations
import json
import logging
from typing import Optional

from fastapi import Request

logger = logging.getLogger(__name__)


async def log_event(
    event_type: str,
    *,
    actor=None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    request: Optional[Request] = None,
    metadata: Optional[dict] = None,
    severity: str = "info",
) -> None:
    """
    Persist a single audit event.
    Never raises — auditing must never break the request path.
    """
    try:
        from app.models.audit_log import AuditLog
        entry = AuditLog(
            actor_id=actor.id if actor else None,
            actor_role=actor.user_role if actor else "system",
            actor_username=actor.username if actor else None,
            event_type=event_type,
            target_type=target_type,
            target_id=target_id,
            ip_address=_extract_ip(request),
            user_agent=request.headers.get("user-agent") if request else None,
            request_path=str(request.url.path) if request else None,
            request_method=request.method if request else None,
            metadata=_truncate_metadata(metadata),
            severity=severity,
        )
        await entry.insert()

        # Also emit to the standard logger so this event reaches stdout/CloudWatch —
        # audit events previously only landed in MongoDB, which is invisible to any
        # log-based alerting (e.g. a CloudWatch metric filter on repeated failed
        # logins). The Mongo record stays the durable source of truth; this line is
        # what makes the event actually alertable.
        log_fn = {"critical": logger.critical, "warning": logger.warning}.get(severity, logger.info)
        log_fn("audit_event type=%s actor=%s target=%s:%s", event_type,
               actor.username if actor else "anonymous", target_type, target_id)
    except Exception:
        logger.exception("Failed to write audit log for event %s", event_type)


def _extract_ip(request: Optional[Request]) -> Optional[str]:
    if not request:
        return None
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else None


def _truncate_metadata(meta: Optional[dict]) -> Optional[dict]:
    if not meta:
        return meta
    serialized = json.dumps(meta, default=str)
    if len(serialized) > 2000:
        return {"_truncated": True, "_preview": serialized[:1500]}
    return meta
