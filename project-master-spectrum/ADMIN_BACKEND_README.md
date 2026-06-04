# Spectrum Connect — Admin Dashboard Backend

> **Scope:** Backend-only reference for the Admin Panel.  
> The admin frontend is a **separate new project** that consumes these endpoints.  
> Base URL: `https://api.spectrumconnect.io` (prod) · `http://localhost:8000` (dev)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Admin Setup](#2-admin-setup)
3. [Module: Stats & Overview](#3-module-stats--overview)
4. [Module: User Management](#4-module-user-management)
5. [Module: Job Management](#5-module-job-management)
6. [Module: Project Management](#6-module-project-management)
7. [Module: Disputes](#7-module-disputes)
8. [Module: Reviews Queue](#8-module-reviews-queue)
9. [Module: Skill Challenges](#9-module-skill-challenges)
10. [Module: Transactions / Payments](#10-module-transactions--payments)
11. [Module: ETF Points](#11-module-etf-points)
12. [Module: Audit Log *(to build)*](#12-module-audit-log-to-build)
13. [Module: Reports Inbox *(to build)*](#13-module-reports-inbox-to-build)
14. [Module: Broadcast Notifications *(to build)*](#14-module-broadcast-notifications-to-build)
15. [AuditLog Data Model *(to build)*](#15-auditlog-data-model-to-build)
16. [Security Rules](#16-security-rules)
17. [Build Order](#17-build-order)
18. [Pagination Convention](#18-pagination-convention)

---

## 1. Authentication

> All admin sessions start here. The admin frontend must obtain a Bearer token
> before calling any `/admin/*` endpoint.

### 1.1 Login ✅ Ready

```
POST /auth/login
Content-Type: application/x-www-form-urlencoded
```

**Request (form-data)**

| Field | Type | Notes |
|-------|------|-------|
| `username` | string | email **or** username — field key must be `username` |
| `password` | string | plain text |

> ⚠️ Body type must be `x-www-form-urlencoded` — **not JSON**. This is a FastAPI OAuth2 requirement.

**Success `200`**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_role": "admin",
  "is_admin": true,
  "account_type": "both",
  "username": "superadmin"
}
```

**Error responses**

| Code | Detail |
|------|--------|
| `401` | Incorrect username/email or password |
| `403` | `{ "message": "Please verify your email before logging in", "email": "..." }` |

**Notes**
- Token expires in 30 minutes (default).
- Attach to every subsequent request: `Authorization: Bearer <access_token>`
- Rate-limited: **10 requests / 60 s** per IP.
- Check `is_admin === true` right after login — if false, block the user from the admin panel. No second API call needed.
- Every successful login updates `last_login` timestamp in the database.

---

### 1.2 OTP — Send ✅ Ready

```
POST /auth/otp/send
Content-Type: application/json
```

**Request body**

```json
{
  "email": "admin@example.com",
  "purpose": "verification"
}
```

`purpose` options: `verification` | `login` | `password_reset`

**Success `200`**

```json
{
  "success": true,
  "message": "Verification code sent to your email",
  "expires_in_seconds": 600,
  "dev_otp": null
}
```

> `dev_otp` is non-null **only** in development when the email send fails. Never trust it in production.

Rate-limited: **5 requests / 5 min** per IP.

---

### 1.3 OTP — Verify ✅ Ready

```
POST /auth/otp/verify
Content-Type: application/json
```

**Request body**

```json
{
  "email": "admin@example.com",
  "otp": "482910"
}
```

**Success `200`**

```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in."
}
```

**Error responses**

| Code | Detail |
|------|--------|
| `400` | No OTP found / OTP expired / Invalid OTP |
| `429` | Too many failed attempts — request a new code |

---

### 1.4 Password Reset — Request ✅ Ready

```
POST /auth/reset-password
Content-Type: application/json
```

**Request body**

```json
{ "email": "admin@example.com" }
```

**Success `200`** *(always returned — prevents email enumeration)*

```json
{
  "message": "If an account exists with that email, you will receive a password reset link"
}
```

Rate-limited: **5 requests / 5 min** per IP.

---

### 1.5 Password Reset — Confirm ✅ Ready

```
POST /auth/reset-password/confirm
Content-Type: application/json
```

**Request body**

```json
{
  "token": "<reset-token-from-email>",
  "new_password": "NewSecurePass123!"
}
```

**Success `200`**

```json
{
  "message": "Password reset successful. You can now log in with your new password."
}
```

**Error responses**

| Code | Detail |
|------|--------|
| `400` | Invalid or expired reset token |
| `404` | User not found |
| `500` | Failed to update password |

---

### 1.6 Check My Role ✅ Ready

```
GET /auth/me/role
Authorization: Bearer <token>
```

**Success `200`**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "admin@spectrumconnect.io",
  "username": "superadmin",
  "user_role": "admin",
  "account_type": "both",
  "is_verified": true,
  "is_admin": true
}
```

---

## 2. Admin Setup

> Protected by server-side secret key (`ADMIN_REGISTRATION_KEY` in `.env`).  
> **CLI / Postman only — never call from the frontend.**

### 2.1 Register Admin Account ✅ Ready

```
POST /auth/register-admin
Content-Type: application/json
```

**Request body**

```json
{
  "email": "admin@spectrumconnect.io",
  "username": "superadmin",
  "password": "SecureAdminPass123!",
  "phone_number": "+12345678901",
  "admin_key": "<ADMIN_REGISTRATION_KEY>",
  "account_type": "both",
  "user_role": "admin"
}
```

| Field | Options |
|-------|---------|
| `account_type` | `crew` · `producer` · `both` |
| `user_role` | `admin` · `moderator` |

**Success `200`**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "admin@spectrumconnect.io",
  "username": "superadmin",
  "account_type": "both",
  "user_role": "admin",
  "message": "Admin account created successfully."
}
```

Admin accounts skip email verification (`is_verified = true` by default).

---

### 2.2 Promote Existing User to Admin ✅ Ready

```
PATCH /auth/promote-to-admin?email=user@example.com
X-Admin-Key: <ADMIN_REGISTRATION_KEY>
```

**Success `200`**

```json
{
  "success": true,
  "message": "username has been promoted to admin.",
  "email": "user@example.com",
  "username": "username",
  "user_role": "admin"
}
```

Rate-limited: **5 requests / 5 min** per IP.

---

## 3. Module: Stats & Overview

> File: `app/api/routers/admin_router.py`  
> All 3 endpoints require: `Authorization: Bearer <admin_token>`

---

### 3.1 Platform Deep Stats ✅ Ready

```
GET /admin/stats
```

**Success `200`**

```json
{
  "users": {
    "total": 12348,
    "creators": 8200,
    "clients": 3900,
    "admins": 5,
    "verified": 9000,
    "suspended": 12,
    "new_last_30_days": 127
  },
  "escrow": {
    "total_volume_usd": 482100.50,
    "platform_fees_usd": 24105.03,
    "active_count": 48,
    "completed_count": 342,
    "disputed_count": 4
  },
  "etf": {
    "total_points_awarded": 2450000,
    "platinum_users": 34,
    "gold_users": 210
  }
}
```

---

### 3.2 Dashboard Overview Cards ✅ Ready

```
GET /admin/stats/overview
```

Maps exactly to the 6 dashboard stat cards in the UI.

**Success `200`**

```json
{
  "users": {
    "total": 12348,
    "today": 14,
    "verified": 9000,
    "deleted": 3
  },
  "jobs": {
    "total": 1234,
    "open": 89,
    "today": 7
  },
  "projects": {
    "total": 540,
    "active": 48,
    "completed": 410,
    "new_this_week": 12
  },
  "revenue": {
    "total_escrowed_usd": 48210.00,
    "total_released_usd": 31000.00,
    "mrr_usd": 4200.00,
    "escrow_project_count": 124
  },
  "disputes": {
    "open": 4,
    "total": 38,
    "awaiting_reply": 2
  },
  "reports": {
    "waiting": 3,
    "total": 18,
    "high_priority": 1
  }
}
```

**UI card mapping**

| UI Card | Subtitle | Field |
|---------|----------|-------|
| Total users | `+127 today` | `users.total` + `users.today` |
| Active jobs | `+89 today` | `jobs.open` + `jobs.today` |
| Active projects | `12 new this week` | `projects.active` + `projects.new_this_week` |
| Escrowed | `across 124 projects` | `revenue.total_escrowed_usd` + `revenue.escrow_project_count` |
| Open disputes | `2 awaiting reply` | `disputes.open` + `disputes.awaiting_reply` |
| Reports waiting | `1 high priority` | `reports.waiting` + `reports.high_priority` |

**Notes**
- All counts use MongoDB ObjectId `generation_time` — accurate for all existing documents
- `reports.high_priority` = pending reviews older than 48 hours
- `revenue.mrr_usd` = escrow funds released in current calendar month
- Every section is wrapped in try/except — returns 0 if collection is empty

---

### 3.3 Timeseries Chart Data ✅ Ready

```
GET /admin/stats/timeseries?metric=signups&days=30
```

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `metric` | string | `signups` | `signups` · `jobs` · `revenue` · `disputes` |
| `days` | int | `30` | `1`–`365` |

**Success `200`**

```json
{
  "metric": "signups",
  "days": 30,
  "data": [
    { "date": "2026-05-05", "value": 14 },
    { "date": "2026-05-06", "value": 8 },
    { "date": "2026-05-07", "value": 22 }
  ]
}
```

**Metric details**

| Metric | Source | Unit |
|--------|--------|------|
| `signups` | `User` ObjectId generation time | count |
| `jobs` | `JobPost` ObjectId generation time | count |
| `revenue` | `Escrow.released_amount` where `status=completed` | USD |
| `disputes` | `Dispute.created_at` | count |

Always returns zero-filled days — no gaps in the chart data.

**Error `422`** — invalid metric

```json
{ "detail": "Invalid metric 'foo'. Choose from: ['disputes', 'jobs', 'revenue', 'signups']" }
```

**Frontend usage**
```
?metric=signups&days=30   →  30-day signup line
?metric=revenue&days=90   →  quarterly revenue line
?metric=disputes&days=7   →  last-week disputes line
```

> The UI shows 3 lines on one chart — call this endpoint 3 times and overlay.

---

## 4. Module: User Management

> File: `app/api/routers/admin_router.py`  
> All endpoints require: `Authorization: Bearer <admin_token>`

---

### 4.1 List Users ✅ Ready

```
GET /admin/users
```

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Default `1` |
| `page_size` | int | Default `25`, max `100` |
| `search` | string | Search by email or username |
| `role` | string | `Creator` · `Client` · `Moderator` · `Admin` |
| `status` | string | `suspended` · `verified` · `unverified` |

**Success `200`**

```json
{
  "total": 48,
  "page": 1,
  "page_size": 25,
  "has_more": false,
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "mia.johnson@example.com",
      "username": "mia.johnson",
      "display_name": "Mia Johnson",
      "profile_picture": "https://cdn.example.com/pic.jpg",
      "account_type": "crew",
      "user_role": "user",
      "role": "Creator",
      "status": "suspended",
      "country": "US",
      "is_verified": true,
      "is_active": false,
      "joined": "2026-06-03T23:07:00",
      "last_login": "2026-06-03T23:07:00",
      "trust_score": 0,
      "trust_tier": "bronze"
    }
  ]
}
```

**Field notes**

| Field | Description |
|-------|-------------|
| `role` | Computed UI label — `Creator` / `Client` / `Moderator` / `Admin` |
| `status` | Computed UI chip — `suspended` / `verified` / `unverified` |
| `country` | From `profile.location.country` |
| `joined` | Derived from MongoDB ObjectId `generation_time` — always accurate |
| `last_login` | Updated on every successful login |

---

### 4.2 Export Users CSV ✅ Ready

```
GET /admin/users/export
```

Accepts same filters as `GET /admin/users` (`search`, `role`, `status`).  
Returns `Content-Disposition: attachment; filename=users_export.csv`.

Columns: `Username, Email, Role, Country, Status, Joined, Last Login`

---

### 4.3 Get User Detail ✅ Ready

```
GET /admin/users/{user_id}
```

**Success `200`**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "username": "johndoe",
  "display_name": "John Doe",
  "profile_picture": "https://cdn.example.com/pic.jpg",
  "account_type": "crew",
  "user_role": "user",
  "role": "Creator",
  "status": "verified",
  "country": "US",
  "is_verified": true,
  "is_active": true,
  "joined": "2025-01-15T10:30:00",
  "last_login": "2026-06-03T22:00:00",
  "trust_score": 87,
  "trust_tier": "gold",
  "profile": {
    "bio": "10 years in film production...",
    "tagline": "Director of Photography",
    "location": "Los Angeles, USA",
    "skills": ["Cinematography", "Lighting", "Color Grading"],
    "hourly_rate_min": 50,
    "hourly_rate_max": 150,
    "portfolio_item_count": 12
  }
}
```

**Error `404`** — User not found

---

### 4.4 Suspend User ✅ Ready

```
PATCH /admin/users/{user_id}/suspend
```

Sets `is_active = false` and records `suspended_at` timestamp.

**Success `200`**

```json
{ "id": "507f1f77bcf86cd799439011", "status": "suspended" }
```

**Error `403`** — Cannot suspend another admin/moderator

---

### 4.5 Activate (Unsuspend) User ✅ Ready

```
PATCH /admin/users/{user_id}/activate
```

Sets `is_active = true` and clears `suspended_at`.

**Success `200`**

```json
{ "id": "507f1f77bcf86cd799439011", "status": "verified" }
```

---

### 4.6 Change User Role ✅ Ready

```
PATCH /admin/users/{user_id}/role
Content-Type: application/json
```

**Request body**

```json
{ "user_role": "moderator" }
```

`user_role` options: `user` · `admin` · `moderator`

**Success `200`**

```json
{ "id": "507f1f77bcf86cd799439011", "user_role": "moderator" }
```

---

### 4.7 Toggle Email Verification ✅ Ready

```
PATCH /admin/users/{user_id}/verify
```

**Success `200`**

```json
{ "id": "507f1f77bcf86cd799439011", "is_verified": true }
```

---

### Planned User Endpoints *(next PR)*

```
DELETE /admin/users/{user_id}        →  soft delete (sets deleted_at, redacts PII)
GET    /admin/users/{user_id}/export →  ZIP of all user data (GDPR)
```

---

## 5. Module: Job Management

> File: `app/api/routers/admin_router.py`

### 5.1 List All Jobs ✅ Ready

```
GET /admin/jobs
Authorization: Bearer <admin_token>
```

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Default `1` |
| `page_size` | int | Default `25`, max `100` |
| `search` | string | Matches title, description |
| `status` | string | `open` · `closed` · `removed` |

**Success `200`**

```json
{
  "total": 1234,
  "page": 1,
  "page_size": 25,
  "has_more": true,
  "jobs": [
    {
      "id": "507f1f77bcf86cd799439022",
      "title": "Director of Photography needed for feature film",
      "status": "open",
      "client_id": "507f1f77bcf86cd799439011",
      "department": "Camera",
      "proposal_count": 14,
      "created_at": "2026-06-01T09:00:00"
    }
  ]
}
```

---

### 5.2 Update Job Status ✅ Ready

```
PATCH /admin/jobs/{job_id}/status
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request body**

```json
{ "status": "removed" }
```

`status` options: `open` · `closed` · `removed`

**Success `200`**

```json
{ "id": "507f1f77bcf86cd799439022", "status": "removed" }
```

---

### Planned Job Endpoints *(next PR)*

```
GET    /admin/jobs/{job_id}            →  full job detail
PATCH  /admin/jobs/{job_id}/visibility →  hide/show/feature
DELETE /admin/jobs/{job_id}            →  hard delete (admin only)
```

---

## 6. Module: Project Management

> File: `app/api/routers/admin_router.py`  
> Models: `app/models/project.py` — `Project`, `ActivityLog`, `ProjectDeadline`  
> All endpoints require: `Authorization: Bearer <admin_token>`

---

### List All Projects ✅ Ready

```
GET /admin/projects
```

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Default `1` |
| `page_size` | int | Default `25`, max `100` |
| `search` | string | Search by title or description |
| `status` | string | `draft` · `active` · `in_progress` · `review` · `completed` · `on_hold` · `archived` |
| `category` | string | `film` · `music` · `design` · `documentary` etc. |

**Success `200`**

```json
{
  "total": 540,
  "page": 1,
  "page_size": 25,
  "has_more": true,
  "projects": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Short Film — Lagos Stories",
      "status": "in_progress",
      "category": "film",
      "client_id": "507f1f77bcf86cd799439022",
      "progress_percentage": 65,
      "team_size": 4,
      "total_roles": 6,
      "filled_roles": 4,
      "budget_min": 5000.00,
      "budget_max": 12000.00,
      "is_public": true,
      "is_featured": false,
      "start_date": "2026-05-01T00:00:00",
      "end_date": "2026-07-30T00:00:00",
      "created_at": "2026-04-20T10:00:00"
    }
  ]
}
```

---

### Get Project Detail ✅ Ready

```
GET /admin/projects/{project_id}
```

**Success `200`**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Short Film — Lagos Stories",
  "description": "A short documentary-style film...",
  "status": "in_progress",
  "category": "film",
  "client_id": "507f1f77bcf86cd799439022",
  "progress_percentage": 65,
  "is_public": true,
  "is_featured": false,
  "budget_min": 5000.00,
  "budget_max": 12000.00,
  "location": "Lagos, Nigeria",
  "tags": ["documentary", "short-film"],
  "job_post_id": "507f1f77bcf86cd799439033",
  "total_roles": 6,
  "filled_roles": 4,
  "team_members": [
    {
      "user_id": "507f1f77bcf86cd799439044",
      "username": "john.doe",
      "role": "Cinematographer",
      "avatar_url": "https://cdn.example.com/pic.jpg",
      "invitation_status": "accepted",
      "joined_at": "2026-05-02T09:00:00"
    }
  ],
  "deadlines": [
    {
      "id": "507f1f77bcf86cd799439055",
      "title": "First Cut Delivery",
      "due_date": "2026-06-15T00:00:00",
      "priority": "high",
      "status": "pending",
      "assigned_to": ["507f1f77bcf86cd799439044"]
    }
  ],
  "start_date": "2026-05-01T00:00:00",
  "end_date": "2026-07-30T00:00:00",
  "created_at": "2026-04-20T10:00:00",
  "updated_at": "2026-06-03T14:00:00"
}
```

**Error `404`** — Project not found

---

### Get Project Timeline ✅ Ready

```
GET /admin/projects/{project_id}/timeline
```

Returns the full `ActivityLog` feed for a project — every action that happened.

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Default `1` |
| `page_size` | int | Default `50`, max `100` |
| `activity_type` | string | `user_joined` · `milestone_completed` · `status_changed` · `file_uploaded` · `deadline_approaching` |

**Success `200`**

```json
{
  "project_id": "507f1f77bcf86cd799439011",
  "project_title": "Short Film — Lagos Stories",
  "total": 24,
  "page": 1,
  "page_size": 50,
  "has_more": false,
  "timeline": [
    {
      "id": "507f1f77bcf86cd799439066",
      "activity_type": "milestone_completed",
      "message": "john.doe completed milestone: Pre-production wrap",
      "actor_id": "507f1f77bcf86cd799439044",
      "actor_name": "john.doe",
      "actor_avatar": "https://cdn.example.com/pic.jpg",
      "metadata": { "milestone_id": "abc123", "amount": 2500 },
      "created_at": "2026-06-01T12:00:00"
    }
  ]
}
```

**Activity types**

| Type | Meaning |
|------|---------|
| `user_joined` | Team member accepted invitation |
| `milestone_completed` | A project milestone was marked done |
| `status_changed` | Project status changed (e.g. active → review) |
| `file_uploaded` | A file was added to the project |
| `deadline_approaching` | System alert — deadline within 48 h |

---

## 7. Module: Disputes

> File: `app/api/routers/escrow_router.py` — `dispute_router`  
> File: `app/api/routers/admin_router.py` — alternate route  
> Prefix: `/disputes`

### 6.1 List All Disputes *(Admin)* ✅ Ready

```
GET /disputes/all
Authorization: Bearer <admin_token>
```

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Default `1` |
| `page_size` | int | Default `25`, max `100` |
| `status` | string | `open` · `under_review` · `resolved_creator_favor` · `resolved_client_favor` |

**Success `200`**

```json
{
  "total": 4,
  "page": 1,
  "page_size": 25,
  "has_more": false,
  "disputes": [
    {
      "id": "507f1f77bcf86cd799439033",
      "escrow_id": "507f1f77bcf86cd799439044",
      "status": "open",
      "reason": "Deliverables not as described",
      "raised_by": "507f1f77bcf86cd799439011",
      "raised_against": "507f1f77bcf86cd799439022",
      "created_at": "2026-05-28T14:20:00"
    }
  ]
}
```

Also available as `GET /admin/disputes` — same data.

---

### 6.2 Get Dispute Detail ✅ Ready

```
GET /disputes/{dispute_id}
Authorization: Bearer <token>
```

---

### 6.3 Admin Self-Assign Dispute ✅ Ready

```
PATCH /disputes/{dispute_id}/assign
Authorization: Bearer <admin_token>
```

---

### 6.4 Resolve Dispute ✅ Ready

```
PATCH /disputes/{dispute_id}/resolve
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request body**

```json
{
  "outcome": "refund_client",
  "resolution_note": "Deliverables did not meet the agreed specification.",
  "release_to_creator": false
}
```

---

## 8. Module: Reviews Queue

> File: `app/api/routers/review_router.py` — `admin_router`  
> Prefix: `/admin/reviews`

### 7.1 List Review Queue ✅ Ready

```
GET /admin/reviews/queue
Authorization: Bearer <admin_token>
```

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `pending` · `approved` · `rejected` |
| `page` | int | Default `1` |
| `page_size` | int | Default `25`, max `100` |

---

### 7.2 Review Queue Stats ✅ Ready

```
GET /admin/reviews/stats
Authorization: Bearer <admin_token>
```

Returns: pending count, approved today, rejected today, avg review time.

---

### 7.3 Get Review Detail ✅ Ready

```
GET /admin/reviews/{review_id}
Authorization: Bearer <admin_token>
```

---

### 7.4 Self-Assign Review ✅ Ready

```
PATCH /admin/reviews/{review_id}/assign
Authorization: Bearer <admin_token>
```

---

### 7.5 Approve Review ✅ Ready

```
PATCH /admin/reviews/{review_id}/approve
Authorization: Bearer <admin_token>
Content-Type: application/json
```

---

### 7.6 Reject Review ✅ Ready

```
PATCH /admin/reviews/{review_id}/reject
Authorization: Bearer <admin_token>
Content-Type: application/json
```

---

## 9. Module: Skill Challenges

> File: `app/api/routers/skill_challenge_router.py`  
> Prefix: `/skill-challenges`

### 8.1 List Pending Submissions ✅ Ready

```
GET /skill-challenges/submissions/pending
Authorization: Bearer <admin_token>
```

---

### 8.2 Evaluate Submission ✅ Ready

```
PATCH /skill-challenges/submissions/{submission_id}/evaluate
Authorization: Bearer <admin_token>
Content-Type: application/json
```

```json
{
  "passed": true,
  "score": 88,
  "feedback": "Strong composition, minor issues with focus pulling."
}
```

---

### 8.3 Create Challenge ✅ Ready

```
POST /skill-challenges/
Authorization: Bearer <admin_token>
```

---

### 8.4 Update Challenge ✅ Ready

```
PATCH /skill-challenges/{challenge_id}
Authorization: Bearer <admin_token>
```

---

### 8.5 Revoke Badge ✅ Ready

```
PATCH /skill-challenges/badges/{badge_id}/revoke
Authorization: Bearer <admin_token>
```

---

## 10. Module: Transactions / Payments

> File: `app/api/routers/admin_router.py`

### 9.1 List All Escrow Transactions ✅ Ready

```
GET /admin/transactions
Authorization: Bearer <admin_token>
```

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Default `1` |
| `page_size` | int | Default `25`, max `100` |
| `status` | string | `active` · `completed` · `disputed` · `refunded` |

**Success `200`**

```json
{
  "total": 890,
  "page": 1,
  "page_size": 25,
  "has_more": true,
  "transactions": [
    {
      "id": "507f1f77bcf86cd799439055",
      "status": "completed",
      "total_amount": 2500.00,
      "funded_amount": 2500.00,
      "released_amount": 2500.00,
      "currency": "USD",
      "client_id": "507f1f77bcf86cd799439011",
      "creator_id": "507f1f77bcf86cd799439066",
      "created_at": "2026-05-20T11:00:00"
    }
  ]
}
```

---

### Planned Payment Endpoints *(next PR)*

```
GET  /admin/payments/{id}      →  full escrow detail with milestones
POST /admin/payments/{id}/refund →  body: { reason }
GET  /admin/escrows            →  all escrow balances summary
```

---

## 11. Module: ETF Points

> File: `app/api/routers/admin_router.py`

### 10.1 ETF Platform Summary ✅ Ready

```
GET /admin/etf/stats
Authorization: Bearer <admin_token>
```

**Success `200`**

```json
{
  "total_accounts": 4200,
  "total_lifetime_points": 2450000,
  "total_redeemed_points": 380000,
  "level_breakdown": {
    "bronze": 2800,
    "silver": 1150,
    "gold": 210,
    "platinum": 40
  }
}
```

---

## 12. Module: Audit Log *(to build — PR 1)*

> New file: `app/services/audit_service.py`  
> New section in: `app/api/routers/admin_router.py`  
> New model: `AuditLog` in `app/models/schema.py`

### 11.1 List Audit Events

```
GET /admin/audit
Authorization: Bearer <admin_token>
```

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Default `1` |
| `page_size` | int | Default `50`, max `100` |
| `event_type` | string | e.g. `user.login`, `admin.user.suspended` |
| `actor_id` | string | Filter by who did it |
| `target_id` | string | Filter by affected resource |
| `severity` | string | `debug` · `info` · `warning` · `error` · `critical` |
| `since` | datetime | ISO 8601 — for live-tail polling |
| `until` | datetime | ISO 8601 |

**Success `200`**

```json
{
  "total": 48210,
  "page": 1,
  "page_size": 50,
  "has_more": true,
  "events": [
    {
      "id": "507f1f77bcf86cd799439077",
      "event_type": "admin.user.suspended",
      "severity": "critical",
      "actor_username": "superadmin",
      "actor_role": "admin",
      "target_type": "user",
      "target_id": "507f1f77bcf86cd799439011",
      "ip_address": "192.168.1.1",
      "request_path": "/admin/users/507f.../suspend",
      "request_method": "PATCH",
      "metadata": { "reason": "Repeated ToS violations" },
      "created_at": "2026-06-03T08:45:00"
    }
  ]
}
```

### 11.2 Export Audit Log (CSV)

```
GET /admin/audit/export
Authorization: Bearer <admin_token>
```

Accepts same query params. Returns `Content-Type: text/csv`.

---

### Event Type Reference

| Event | Severity |
|-------|----------|
| `user.signup` | info |
| `user.login` | info |
| `user.login_failed` | warning |
| `user.email_verified` | info |
| `user.password_reset_requested` | info |
| `user.password_reset_completed` | warning |
| `job.created` | info |
| `job.applied` | info |
| `project.created` | info |
| `project.milestone_completed` | info |
| `payment.escrow_funded` | info |
| `payment.released` | info |
| `payment.refunded` | warning |
| `dispute.opened` | warning |
| `dispute.resolved` | info |
| `admin.user.suspended` | critical |
| `admin.user.promoted` | critical |
| `admin.user.viewed` | info |
| `admin.payment.refunded` | critical |
| `admin.content.removed` | warning |
| `system.error` | error |
| `system.rate_limit_hit` | warning |

---

## 13. Module: Reports Inbox *(to build)*

> New section in: `app/api/routers/admin_router.py`

### 12.1 List Reports

```
GET /admin/reports
Authorization: Bearer <admin_token>
```

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Default `1` |
| `page_size` | int | Default `25`, max `100` |
| `status` | string | `pending` · `resolved` · `dismissed` |

**Success `200`**

```json
{
  "total": 3,
  "page": 1,
  "page_size": 25,
  "has_more": false,
  "reports": [
    {
      "id": "507f1f77bcf86cd799439088",
      "reported_by": "507f1f77bcf86cd799439011",
      "target_type": "user",
      "target_id": "507f1f77bcf86cd799439099",
      "reason": "Harassment in messages",
      "status": "pending",
      "created_at": "2026-06-02T16:10:00"
    }
  ]
}
```

### 12.2 Resolve Report

```
PATCH /admin/reports/{report_id}/resolve
Authorization: Bearer <admin_token>
Content-Type: application/json
```

```json
{
  "action_taken": "user_suspended",
  "note": "Confirmed harassment. User suspended for 30 days."
}
```

**Success `200`**

```json
{ "id": "507f1f77bcf86cd799439088", "status": "resolved" }
```

---

## 14. Module: Broadcast Notifications *(to build)*

> New section in: `app/api/routers/admin_router.py`

### 13.1 Get Broadcast History

```
GET /admin/notifications/broadcast
Authorization: Bearer <admin_token>
```

### 13.2 Send Broadcast

```
POST /admin/notifications/broadcast
Authorization: Bearer <admin_token>
Content-Type: application/json
```

```json
{
  "title": "Platform maintenance on Sunday",
  "body": "Spectrum Connect will be down for 2 hours on Sunday June 8 from 2–4 AM UTC.",
  "target": "all",
  "severity": "info"
}
```

`target` options: `all` · `crew` · `producers` · `verified_only`

**Success `200`**

```json
{
  "broadcast_id": "507f1f77bcf86cd799439100",
  "recipients_queued": 12348,
  "message": "Broadcast queued successfully."
}
```

---

## 15. AuditLog Data Model *(to build)*

Add to `app/models/schema.py` and register in `app/main.py`.

```python
class AuditLog(Document):
    actor_id: Optional[PydanticObjectId] = None
    actor_role: Optional[str] = None
    actor_username: Optional[str] = None
    event_type: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_path: Optional[str] = None
    request_method: Optional[str] = None
    status_code: Optional[int] = None
    metadata: Optional[dict] = None
    severity: str = "info"
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "audit_logs"
        indexes = [
            "actor_id", "event_type", "target_type",
            "target_id", "created_at", "severity",
            IndexModel("expires_at", expireAfterSeconds=0),
            [("event_type", 1), ("created_at", -1)],
            [("actor_id", 1), ("created_at", -1)],
        ]
```

**Retention policy**

| Severity | Retain for |
|----------|-----------|
| `critical` (`admin.*`, `payment.*`) | 7 years |
| `warning` | 1 year |
| `info` | 90 days |
| `debug` | 30 days |

---

## 16. Security Rules

| Rule | Status |
|------|--------|
| Every `/admin/*` endpoint uses `Depends(get_admin_user)` | ✅ Enforced |
| Frontend checks `is_admin === true` from login response | Must implement in new FE |
| Every admin mutation emits audit log entry | Partially — add after AuditLog PR |
| `ADMIN_REGISTRATION_KEY` never sent to browser | ✅ Enforced |
| 2FA (TOTP) required on admin accounts | Plan before go-live |
| Soft-delete only — `deleted_at` field exists on User | ✅ Field exists |
| `is_active` + `suspended_at` fields on User | ✅ Added |
| PII masking in user detail view | Implement in FE layer |
| Separate `moderator` (read) vs `admin` (write) roles | ✅ Role model exists |
| Rate limiting on admin endpoints | ✅ Partial |
| Impersonation uses scoped JWT with `impersonator_id` | Phase 5 |

---

## 17. Build Order

### ✅ Done — Stats & Overview
- `GET /admin/stats` — platform deep stats
- `GET /admin/stats/overview` — all 6 dashboard cards
- `GET /admin/stats/timeseries` — chart data per metric

### ✅ Done — Project Management
- `GET /admin/projects` — list with search / status / category filters
- `GET /admin/projects/{id}` — full detail with team members and deadlines
- `GET /admin/projects/{id}/timeline` — full ActivityLog feed, filterable by type

### ✅ Done — User Management
- `GET /admin/users` — list with `role` / `status` filters
- `GET /admin/users/export` — CSV download
- `GET /admin/users/{id}` — full detail with country, joined, last_login
- `PATCH /admin/users/{id}/suspend` — sets `is_active=false` + `suspended_at`
- `PATCH /admin/users/{id}/activate` — clears suspension
- `PATCH /admin/users/{id}/role` — change role
- `PATCH /admin/users/{id}/verify` — toggle verification

### Next — PR 1: Audit Log Foundation *(2–3 days)*
1. Add `AuditLog` model to `app/models/schema.py`
2. Register in `app/main.py`
3. Create `app/services/audit_service.py` with `log_event` helper
4. Wire into login, register, suspend, activate, role change
5. `GET /admin/audit` + `GET /admin/audit/export`

### Next — PR 2: Disputes, Reviews, Payments *(3 days)*
1. Wire dispute endpoints to admin panel FE
2. Wire review queue to admin panel FE
3. `GET /admin/payments` full escrow ledger
4. `POST /admin/payments/{id}/refund`
5. `GET /admin/escrows`

### Later — PR 3: Reports + Broadcast *(2 days)*
1. `GET /admin/reports` + `PATCH /admin/reports/{id}/resolve`
2. `POST /admin/notifications/broadcast`
3. `DELETE /admin/users/{id}` soft delete + PII redact
4. `GET /admin/users/{id}/export` GDPR ZIP

---

## 18. Pagination Convention

All list endpoints return the same envelope:

```json
{
  "total": 12348,
  "page": 1,
  "page_size": 25,
  "has_more": true,
  "items": [ ... ]
}
```

- `page` starts at `1`
- Maximum `page_size` is `100`
- Always return `total` — frontend shows `"Showing 1–25 of 12,348"`
- Sort: **newest first** using ObjectId `generation_time` or `created_at`

---

*Last updated: 2026-06-04 — Spectrum Connect Admin Backend v3*
