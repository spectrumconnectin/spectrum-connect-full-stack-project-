# Spectrum Connect — Admin Dashboard & Observability Guide

**Goal:** Build an internal admin panel that lets your team see every user, every project, every payment, every error, and every meaningful interaction on the platform — and act on them (suspend, refund, moderate, promote).

**Audience:** You + your developer. Designed to be executed in phases over 2–4 weeks rather than all at once.

---

## 1. What you already have

Before you build anything new, here's the foundation that's already in place:

| Capability | Where it lives | Status |
|---|---|---|
| Role enforcement | `app/auth/auth.py::get_admin_user` — gates `admin`/`moderator` | ✅ Working |
| Admin role assignment | `/auth/register-admin`, `/auth/promote-to-admin` | ✅ Working |
| Login history per user | `app/models/schema.py::LoginHistory` (embedded in `User.login_history`) | ✅ Model exists |
| Activity log | `app/models/project.py::ActivityLog` | ✅ Model exists (project-scoped) |
| Notification system | `app/models/schema.py::Notification` | ✅ Working |
| AI interactions | `app/models/schema.py::MiyaInteraction` | ✅ Working |
| Escrow disputes | `app/api/routers/escrow_router.py` (`dispute_router`) | ✅ Has admin endpoints |
| Review queue | `app/api/routers/review_router.py::admin_router` (`/admin/reviews/*`) | ✅ Has admin endpoints |
| Skill challenge moderation | `app/api/routers/skill_challenge_router.py` | ✅ Has admin endpoints |
| Generic audit log | — | ❌ Need to build |
| Request/error log | — | ❌ Need to build |
| Admin frontend | `spectrum-nextjs/app/(admin)/` | ❌ Doesn't exist |
| Real-time analytics | — | ❌ Need to build |

So roughly half of the backend is already in place — you mostly need a **front-end shell**, an **AuditLog model + middleware**, and a few **aggregation endpoints**.

---

## 2. Recommended phased rollout

Don't try to ship everything at once. This is the sequence we recommend:

### Phase 1 — Foundation (week 1)
- Admin layout + login gate on the frontend
- Backend `AuditLog` model
- HTTP middleware that writes admin actions and auth events to `AuditLog`
- Admin dashboard "overview" page (users count, jobs count, revenue, recent signups)
- Users list page + user detail (view profile, login history, suspend/promote)

### Phase 2 — Operational visibility (week 2)
- Projects/jobs management (list, search, force-close, refund)
- Disputes inbox (already 80% done — wire to FE)
- Verification queue (already 80% done — wire to FE)
- Transactions / payments ledger
- ETF / escrow balances

### Phase 3 — Content & moderation (week 3)
- Job posts moderation (hide/feature/flag)
- Messages flagging (search by content, view conversation)
- Blog / community moderation
- Reports inbox (user-reported abuse)

### Phase 4 — Observability & analytics (week 4)
- Daily / weekly KPIs (DAU, MAU, conversion, AOV, churn)
- Error log viewer (from CloudWatch / structured logs)
- Cohort retention chart
- Export to CSV

### Phase 5 — Nice-to-haves
- Impersonation ("login as user") for support
- Webhooks fired on key events
- Slack/email alerts (new dispute, error spike, refund > $X)
- Saved filters / saved views

---

## 3. Data model — what to log and how

The big missing piece is a **generic audit log**. Add this to `app/models/schema.py`:

```python
class AuditLog(Document):
    """
    Single source of truth for all admin-visible events on the platform.

    Two flavors of events:
      - USER ACTIONS (login, signup, post job, apply, message, refund)
      - ADMIN ACTIONS (suspended user, approved review, refunded order)

    Keep it deliberately wide (rich `metadata` dict) so we don't have to
    migrate the schema every time we want to log a new thing.
    """
    # Who did it
    actor_id: Optional[PydanticObjectId] = None     # null = system action
    actor_role: Optional[str] = None                # user | admin | moderator | system
    actor_username: Optional[str] = None            # denormalized for fast read

    # What happened
    event_type: str                                  # e.g. "user.signup", "job.created",
                                                     # "payment.refunded", "admin.user.suspended"
    target_type: Optional[str] = None                # "user" | "job" | "project" | "payment" | ...
    target_id: Optional[str] = None                  # opaque id of the target

    # Context
    ip_address: Optional[str] = None                 # from X-Forwarded-For
    user_agent: Optional[str] = None
    request_path: Optional[str] = None               # e.g. "/jobs/abc/apply"
    request_method: Optional[str] = None             # GET/POST/...
    status_code: Optional[int] = None                # HTTP response status

    # Free-form payload — keep it small (< 2 KB)
    metadata: Optional[dict] = None

    # Severity for filtering
    severity: str = "info"                           # debug | info | warning | error | critical

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "audit_logs"
        indexes = [
            "actor_id",
            "event_type",
            "target_type",
            "target_id",
            "created_at",
            "severity",
            [("event_type", 1), ("created_at", -1)],
            [("actor_id", 1), ("created_at", -1)],
        ]
```

Register it in `app/main.py` alongside the other Beanie models.

### Event taxonomy

Use dotted names so they're easy to filter:

| Event | Severity | Example metadata |
|---|---|---|
| `user.signup` | info | `{ via: "email" \| "google" }` |
| `user.login` | info | `{ method: "password" \| "google_oauth" }` |
| `user.login_failed` | warning | `{ email: "...", reason: "bad_password" }` |
| `user.email_verified` | info | `{}` |
| `user.password_reset_requested` | info | `{}` |
| `user.password_reset_completed` | warning | `{}` |
| `job.created` | info | `{ title, department, budget }` |
| `job.applied` | info | `{ job_id, proposal_id, budget }` |
| `project.created` | info | `{ team_size }` |
| `project.milestone_completed` | info | `{ milestone_id, amount }` |
| `payment.escrow_funded` | info | `{ amount, currency }` |
| `payment.released` | info | `{ amount }` |
| `payment.refunded` | warning | `{ amount, reason }` |
| `dispute.opened` | warning | `{ dispute_id, amount }` |
| `dispute.resolved` | info | `{ outcome }` |
| `admin.user.suspended` | critical | `{ target_user, reason }` |
| `admin.user.promoted` | critical | `{ new_role }` |
| `admin.payment.refunded` | critical | `{ amount, reason }` |
| `admin.content.removed` | warning | `{ content_type, content_id }` |
| `system.error` | error | `{ exception, traceback_hash }` |
| `system.rate_limit_hit` | warning | `{ scope, identifier }` |

Rule of thumb: **anything that an investor / regulator / customer support agent might ever ask about should be logged here.**

---

## 4. Backend — audit middleware + helper

Add `app/services/audit_service.py`:

```python
from __future__ import annotations
import logging
from typing import Optional
from fastapi import Request

from app.models.schema import AuditLog, User

logger = logging.getLogger(__name__)


async def log_event(
    event_type: str,
    *,
    actor: Optional[User] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    request: Optional[Request] = None,
    metadata: Optional[dict] = None,
    severity: str = "info",
) -> None:
    """Persist a single audit event. Never raises — auditing should not be able
    to break the request path."""
    try:
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
    except Exception:
        # Audit failure must never break the caller. Log to stdout instead.
        logger.exception("Failed to write audit log for event %s", event_type)


def _extract_ip(request: Optional[Request]) -> Optional[str]:
    if not request:
        return None
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else None


def _truncate_metadata(meta: Optional[dict]) -> Optional[dict]:
    """Keep audit entries small (< ~2 KB)."""
    if not meta:
        return meta
    import json
    serialized = json.dumps(meta, default=str)
    if len(serialized) > 2000:
        return {"_truncated": True, "_preview": serialized[:1500]}
    return meta
```

Then call it from your route handlers, e.g.:

```python
from app.services.audit_service import log_event

@router.post("/login")
async def login_for_access_token(...):
    ...
    if not user or not verify_password(...):
        await log_event(
            "user.login_failed",
            request=request,
            metadata={"identifier": form_data.username, "reason": "bad_credentials"},
            severity="warning",
        )
        raise HTTPException(...)
    ...
    await log_event("user.login", actor=user, request=request)
    return {"access_token": token, "token_type": "bearer"}
```

### Optional global request log middleware

If you want to capture EVERY request (not just chosen ones), add this to `main.py`:

```python
@app.middleware("http")
async def request_audit_middleware(request: Request, call_next):
    response = await call_next(request)
    # Only log mutations and non-2xx — full request stream would balloon the collection.
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} or response.status_code >= 400:
        try:
            await log_event(
                "http.request",
                request=request,
                metadata={"status_code": response.status_code},
                severity="info" if response.status_code < 400 else "warning",
            )
        except Exception:
            pass
    return response
```

Be careful — this triples DB writes. Better long-term solution: ship structured JSON logs to CloudWatch / Datadog / Logflare and only keep the curated `AuditLog` events in MongoDB.

---

## 5. Backend — admin API surface

Create `app/api/routers/admin_router.py` and mount it under `/admin`. Every endpoint uses `Depends(get_admin_user)`.

Minimum viable surface:

```
GET    /admin/stats/overview            # totals: users, jobs, projects, revenue, MRR
GET    /admin/stats/timeseries          # ?metric=signups&days=30
GET    /admin/users                     # paginated, ?q=&role=&verified=&sort=
GET    /admin/users/{id}                # full profile + login history + audit tail
PATCH  /admin/users/{id}/suspend        # body: { reason }
PATCH  /admin/users/{id}/unsuspend
PATCH  /admin/users/{id}/role           # body: { user_role }
DELETE /admin/users/{id}                # soft delete (sets deleted_at)

GET    /admin/jobs                      # paginated
GET    /admin/jobs/{id}
PATCH  /admin/jobs/{id}/visibility      # hide/show
DELETE /admin/jobs/{id}

GET    /admin/projects
GET    /admin/projects/{id}
GET    /admin/projects/{id}/timeline    # all activity for this project

GET    /admin/disputes                  # already exists — surface it here
GET    /admin/reviews                   # already exists
GET    /admin/escrows                   # all escrow accounts

GET    /admin/payments                  # transactions ledger
POST   /admin/payments/{id}/refund      # body: { reason }

GET    /admin/audit                     # paginated audit log, ?event_type=&actor=&since=&severity=
GET    /admin/audit/export              # CSV download for a filtered view

GET    /admin/reports                   # user-reported abuse inbox (build)
PATCH  /admin/reports/{id}/resolve

GET    /admin/notifications/broadcast   # send a system notice to all/segment users
POST   /admin/notifications/broadcast
```

Every endpoint that mutates state MUST call `log_event` with `severity="critical"` or `"warning"` and `actor=admin`. That's how you prove who did what after the fact.

### Pagination convention

Use cursor-based or `?skip=&limit=` with a max of 100. Always return a total count so the UI can show "showing 1–50 of 12,348":

```python
@admin_router.get("/users")
async def list_users(
    q: str = "",
    role: Optional[str] = None,
    verified: Optional[bool] = None,
    skip: int = 0,
    limit: int = Query(50, le=100),
    admin: User = Depends(get_admin_user),
):
    query = {}
    if q:
        query["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"username": {"$regex": q, "$options": "i"}},
        ]
    if role:
        query["user_role"] = role
    if verified is not None:
        query["is_verified"] = verified
    total = await User.find(query).count()
    items = await User.find(query).sort(-User.last_login).skip(skip).limit(limit).to_list()
    return {"items": items, "total": total, "skip": skip, "limit": limit}
```

---

## 6. Frontend — admin app structure

Create a new route group `spectrum-nextjs/app/(admin)/` mirroring how `(client)` and `(creator)` are structured. Why a route group: it gives you a dedicated layout, isolated nav, and easy code splitting.

```
spectrum-nextjs/app/(admin)/
├── layout.tsx                          # sidebar nav, role-gated
├── admin/
│   ├── page.tsx                        # overview dashboard
│   ├── users/
│   │   ├── page.tsx                    # list + filters
│   │   └── [id]/page.tsx               # user detail
│   ├── jobs/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── disputes/
│   │   └── page.tsx
│   ├── reviews/
│   │   └── page.tsx
│   ├── payments/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── audit/
│   │   └── page.tsx                    # the big searchable log
│   ├── reports/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx                    # broadcast notice, feature flags, etc.
```

### Layout + role gate

```tsx
// app/(admin)/layout.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    auth.me().then(me => {
      if (me.is_admin) setAllowed(true);
      else router.replace('/');
    }).catch(() => router.replace('/login'));
  }, [router]);

  if (allowed === null) {
    return <div className="p-12 text-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
```

The role check is also enforced server-side — this is just for UX. Even if someone bypasses the FE check, the backend `Depends(get_admin_user)` rejects them.

### Suggested overview cards

```
┌─────────────────────────────────────────────────────────────────┐
│ 12,348 users        +127 today        342 verified today        │
│ 1,234 active jobs   89 posted today   $48,210 escrowed          │
│ 4 open disputes     12 pending reviews 3 reports waiting        │
└─────────────────────────────────────────────────────────────────┘
```

Plus a 30-day chart of signups, jobs, and revenue.

### Audit log page (the most useful screen)

Build it like a Stripe/Linear event log:

- Sticky filter bar: actor, event type, severity, date range, target id
- Each row: timestamp · severity chip · actor · event_type · target link · "view details" expander
- Expandable JSON payload (the `metadata` field)
- Live tail toggle (poll `/admin/audit?since=<latest_id>` every 5 s)
- Export current filter to CSV

---

## 7. Real-time vs polling

You don't need WebSockets to start. Polling once every 5–15 s is fine for tens of admins.

If you later want true real-time:
- Server-Sent Events (SSE) is dead simple in FastAPI (`sse-starlette`) — works through Vercel/EB without special config.
- WebSockets need a sticky-session-aware load balancer; EB Classic LB does not handle them well. Move to ALB first.

---

## 8. Security — non-negotiable rules

The admin panel is the most dangerous surface in your app. Treat it that way:

1. **Defense in depth** — every endpoint uses `Depends(get_admin_user)` AND the FE checks `me.is_admin`. Never rely on the FE alone.
2. **Always-on audit log** — every admin-side mutation calls `log_event(..., severity="critical", actor=admin)`. No exceptions.
3. **No client-side admin secrets** — `ADMIN_REGISTRATION_KEY` never ships to the browser, ever. Admin promotion happens via the CLI/backend script only.
4. **2FA for admin accounts** — add TOTP-based 2FA before going live. Optional for users, **required** for admins.
5. **Separate session** — when an admin acts, log the action with their admin user id, not a target user's id even if they're "impersonating" (see #7 below).
6. **Rate-limit admin endpoints too** — bulk-delete or bulk-suspend should have a slower per-IP limit (say, 30/min).
7. **Impersonation** — when you add "login as user", do it with a short-lived (5 min) scoped JWT that has an `impersonator_id` claim. Log entry on enter AND exit. Never let an impersonation token change passwords or 2FA.
8. **Sensitive data masking** — by default, mask phone numbers and emails to `j****@gmail.com`. Have an "unmask" toggle that itself emits an audit event.
9. **Read-only by default** — give junior moderators a "view only" role that can see everything but cannot mutate.
10. **Separate moderator and admin roles** — your model already has both (`moderator` and `admin`). Use moderator for trust & safety folks; reserve admin for engineering/founders. Add an `admin.moderator.promoted` log when admins promote moderators.

---

## 9. Scale / performance considerations

`AuditLog` will be your biggest collection within months. Plan ahead:

- **Index** on `created_at`, `event_type`, `actor_id`, `(event_type, created_at)`, `(actor_id, created_at)`.
- **TTL index** — drop low-value events (e.g. `http.request`) after 30 days, keep critical events (`admin.*`, `payment.*`) for 7 years for compliance:

  ```python
  # Compound TTL via document-level expiry
  class AuditLog(Document):
      expires_at: Optional[datetime] = None
      class Settings:
          indexes = [
              IndexModel("expires_at", expireAfterSeconds=0),  # TTL
              ...
          ]
  ```

  Set `expires_at` per event based on severity at insert time.

- **Archive** to S3 monthly. MongoDB Atlas has a built-in "online archive" feature that handles this for you.
- **Aggregate** for dashboards — don't run `count_documents({...})` on every chart load. Pre-aggregate into a `daily_metrics` collection via a nightly cron and query that.
- **Read replica** — once you're past ~10 RPS on the admin panel, point admin queries at a MongoDB Atlas read replica so heavy reporting doesn't slow user-facing reads.

---

## 10. Observability beyond the admin panel

The admin dashboard answers "what is happening in the product?" You also need to answer "is the system healthy?" That's a separate concern — use:

- **CloudWatch** (you're already on EB) — already collecting EB instance metrics. Add a CloudWatch agent for Python `logger` output so structured JSON ends up in Log Insights.
- **Sentry** for backend & frontend exceptions — 5 minutes to install, catches everything `logger.exception` misses.
- **Vercel Analytics** for frontend page views and Core Web Vitals (one toggle in the Vercel dashboard).
- **UptimeRobot** or **Better Uptime** for a 1-minute external health check on `/health`.
- **PagerDuty** or **Slack** alert when `system.error` events spike > 10× normal.

These are operational, not embedded in the admin panel. But have a "System Health" tab in the admin panel that just deep-links to these tools.

---

## 11. Compliance & retention (do this early)

If you collect PII or process payments (you do both), you'll eventually be asked about:

- **GDPR** — right to erasure. Build `DELETE /admin/users/{id}` to soft-delete + redact PII (replace email/phone/name with `[redacted]`) while keeping audit events for fraud history.
- **Audit retention** — keep `admin.*` and `payment.*` events for 7 years. Other events for 90 days is fine.
- **Data export** — `GET /admin/users/{id}/export` that returns a ZIP of all the user's data on request.
- **Access logs** — log every time an admin views a user's detail page (`admin.user.viewed`). Customer-trust gold.

You don't need to implement all of this on day one, but the data model should accommodate it.

---

## 12. Build order — concrete first PRs

To make this tractable, here's the literal first three pull requests:

### PR #1 — Audit log foundation (2–3 days)
1. Add `AuditLog` Beanie model.
2. Register in `app/main.py`.
3. Add `app/services/audit_service.py` with `log_event` helper.
4. Wire `log_event` into 4 hot paths: `/auth/login`, `/auth/register`, `/auth/login` failures, `/auth/register-admin`, `/auth/promote-to-admin`.
5. Tiny `/admin/audit` endpoint returning paginated entries (for verification).

### PR #2 — Admin shell + users (3–4 days)
1. New route group `spectrum-nextjs/app/(admin)/`.
2. `layout.tsx` with sidebar + role gate.
3. Overview page with 6 stat cards (counts from new `/admin/stats/overview`).
4. Users list with search/filter, paginated.
5. User detail page (profile + last 50 audit events for that user + suspend button).
6. Backend `PATCH /admin/users/{id}/suspend` writes audit event.

### PR #3 — Disputes, reviews, payments (3 days)
1. Wire existing dispute admin endpoints to a new "Disputes" page.
2. Wire existing review queue admin endpoints to a new "Reviews" page.
3. Build `/admin/payments` (read-only ledger over `Transaction`).

After those three PRs you'll have a working admin panel that already covers ~70% of typical day-to-day operations. Everything else from §2 phases 3–5 can layer on incrementally.

---

## 13. Cost / hosting impact

Adding all of this typically increases your monthly costs by:

| Item | Estimate |
|---|---|
| AuditLog storage (1M events/mo) | +$2–5/mo on MongoDB Atlas |
| Sentry (free tier) | $0 |
| Vercel Analytics | $0 on Hobby, $20/mo on Pro |
| CloudWatch Logs (1 GB/mo) | ~$0.50/mo |
| PagerDuty / alerting | $0–$20/mo |
| **Total typical addition** | **$5–$50/mo** |

Nothing here requires you to upgrade your EB instance class.

---

## 14. Out-of-scope but worth knowing

These are common adjacent asks. Don't bundle them into v1 of the admin panel:

- **A/B testing platform** (GrowthBook, PostHog) — separate concern; don't build it into admin.
- **Feature flags** — same; use a flag service (LaunchDarkly, GrowthBook, Unleash) rather than a homegrown toggle table.
- **CRM** for marketing — use HubSpot/Customer.io. Pipe key events from `AuditLog` via a job, not from the admin panel.
- **Data warehouse** — once you have 6+ months of `AuditLog`, pipe nightly to BigQuery/Snowflake for serious analytics.

---

## 15. Reference: existing admin endpoints to surface immediately

Build the FE pages around what already works. No backend work needed:

| Endpoint | Surface as |
|---|---|
| `GET /admin/reviews/pending` | "Reviews" tab — list |
| `GET /admin/reviews/{id}` | "Reviews" tab — detail |
| `PATCH /admin/reviews/{id}/approve` | "Reviews" tab — approve button |
| `PATCH /admin/reviews/{id}/reject` | "Reviews" tab — reject button |
| `GET /admin/disputes` (in `dispute_router`) | "Disputes" tab |
| `PATCH /admin/disputes/{id}/resolve` | "Disputes" tab — resolve dialog |
| `GET /skill-challenges/submissions/pending` | "Skill challenges" tab |
| `PATCH /skill-challenges/submissions/{id}/evaluate` | inline evaluate button |

That alone is a 1-week project that gives your moderators a real UI for things they're currently doing via curl/Postman.

---

## 16. Sign-off checklist before going live

- [ ] Admin layout renders only when `me.is_admin === true` (frontend gate).
- [ ] Every admin endpoint uses `Depends(get_admin_user)` (backend gate verified by curl).
- [ ] Every mutation in admin emits an audit log entry with `severity="warning"` or higher.
- [ ] At least one moderator account exists (different from primary admin), tested for read-only restrictions.
- [ ] 2FA enforced on all admin accounts.
- [ ] Audit log retention policy implemented (TTL or archive job).
- [ ] PII masking on by default in user detail view.
- [ ] Suspension/unsuspension actually blocks login (server-side check on `user.deleted_at` or new `user.suspended_at`).
- [ ] Refund flow tested end-to-end on a sandbox payment.
- [ ] Smoke test: an admin can find any user by email in under 10 seconds.
- [ ] Smoke test: an admin can see the last 100 events of any user in one click.
- [ ] All admin pages render correctly on 1280px+ screens (don't bother with mobile for v1).

---

*This guide is intentionally biased toward shipping something working in 1 week and iterating, rather than spec'ing the perfect admin panel for 2 months. If you want help executing any specific phase, the code samples above are real code — drop them into the repo and adjust.*
