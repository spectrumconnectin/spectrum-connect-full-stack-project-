# Spectrum Connect — Admin Dashboard Guide

> **Access level required:** `admin` or `moderator` role  
> **Base URL:** `http://localhost:8000` (development) / your production domain  
> **Authentication:** Bearer JWT token in every request header

---

## Table of Contents

1. [Quick Start — Becoming an Admin](#1-quick-start--becoming-an-admin)
2. [Authentication](#2-authentication)
3. [Platform Stats](#3-platform-stats)
4. [User Management](#4-user-management)
5. [Job / Project Management](#5-job--project-management)
6. [Disputes](#6-disputes)
7. [Transactions](#7-transactions)
8. [ETF Points](#8-etf-points)
9. [Revenue Reporting](#9-revenue-reporting)
10. [Role Reference](#10-role-reference)
11. [Security Notes](#11-security-notes)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Quick Start — Becoming an Admin

There are two paths to getting admin access.

---

### Path A — Register a fresh admin account

Use this when creating a brand-new admin user from scratch.

**Endpoint:** `POST /auth/register-admin`

```json
{
  "email": "admin@spectrumconnect.com",
  "username": "spectrum_admin",
  "password": "SecurePass123",
  "admin_key": "YOUR_ADMIN_REGISTRATION_KEY",
  "user_role": "admin"
}
```

| Field | Required | Description |
|---|---|---|
| `email` | ✅ | Admin email address |
| `username` | ✅ | Unique username |
| `password` | ✅ | Min 8 characters, must contain letters + digits |
| `admin_key` | ✅ | Must match `ADMIN_REGISTRATION_KEY` in your `.env` file |
| `user_role` | Optional | `admin` (default) or `moderator` |

> **Finding your admin key:** Open `.env` in the project root. Look for `ADMIN_REGISTRATION_KEY=...`  
> Default development key: `spectrum-admin-secret-2025`

**Note:** Admin accounts created via this endpoint are **pre-verified** — no OTP step required. Log in immediately after registration.

---

### Path B — Promote an existing user to admin

Use this when you already have an account registered normally and want to elevate it.

**Endpoint:** `PATCH /auth/promote-to-admin`

```http
PATCH /auth/promote-to-admin?email=yourname@email.com
X-Admin-Key: YOUR_ADMIN_REGISTRATION_KEY
```

No request body needed — the email is a query parameter and the admin key goes in the `X-Admin-Key` header.

---

## 2. Authentication

All admin endpoints require a valid JWT Bearer token. The token is obtained by logging in.

### Step 1 — Log In

```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=admin@spectrumconnect.com&password=SecurePass123
```

> ⚠️ The login endpoint uses **form data** (not JSON). Set `Content-Type: application/x-www-form-urlencoded` in Postman or your HTTP client.

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Step 2 — Use the Token

Add this header to every admin request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token lifespan:** 24 hours. Re-login after expiry.

### Verify Your Admin Status

```http
GET /auth/me
Authorization: Bearer <token>
```

Response includes `"is_admin": true` if your role is `admin` or `moderator`.

---

## 3. Platform Stats

A single endpoint that returns all headline metrics for the admin dashboard overview.

**Endpoint:** `GET /admin/stats`

```http
GET /admin/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "users": {
    "total": 1240,
    "creators": 850,
    "clients": 390,
    "admins": 3,
    "verified": 670,
    "suspended": 12,
    "new_last_30_days": 87
  },
  "escrow": {
    "total_volume_usd": 142500.00,
    "platform_fees_usd": 17100.00,
    "client_fee_usd": 5700.00,
    "creator_fee_usd": 11400.00,
    "active_count": 34,
    "completed_count": 218,
    "disputed_count": 5
  },
  "etf": {
    "total_points_awarded": 485200,
    "platinum_users": 7,
    "gold_users": 43
  }
}
```

| Field | Description |
|---|---|
| `users.creators` | Accounts with `account_type: crew` or `both` |
| `users.clients` | Accounts with `account_type: producer` or `both` |
| `users.suspended` | Accounts with `is_active: false` |
| `escrow.total_volume_usd` | Sum of all completed transaction amounts |
| `escrow.platform_fees_usd` | Total 12% commission collected (8% creator + 4% client) |
| `etf.total_points_awarded` | Lifetime points across all users |

---

## 4. User Management

### 4.1 List All Users

Paginated, filterable list of every user on the platform.

```http
GET /admin/users
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|---|---|---|---|
| `page` | int | Page number (default: 1) | `?page=2` |
| `page_size` | int | Results per page, max 100 (default: 25) | `?page_size=50` |
| `search` | string | Search by email, username, or display name | `?search=dilshan` |
| `account_type` | string | Filter: `crew`, `producer`, `both` | `?account_type=crew` |
| `user_role` | string | Filter: `user`, `admin`, `moderator` | `?user_role=admin` |
| `is_verified` | bool | Filter by verified status | `?is_verified=true` |
| `is_active` | bool | Filter by active/suspended status | `?is_active=false` |

**Example — find all suspended creators:**
```http
GET /admin/users?account_type=crew&is_active=false
```

**Response:**
```json
{
  "total": 2,
  "page": 1,
  "page_size": 25,
  "has_more": false,
  "users": [
    {
      "id": "683a1f2b...",
      "email": "creator@test.com",
      "username": "dilshan_photo",
      "account_type": "crew",
      "user_role": "user",
      "is_verified": true,
      "is_active": false,
      "created_at": "2025-01-15T10:30:00",
      "display_name": "Dilshan Fernando",
      "profile_picture": "https://...",
      "trust_score": 85,
      "trust_tier": "gold"
    }
  ]
}
```

---

### 4.2 Get Full User Detail

Returns complete profile data for a single user.

```http
GET /admin/users/{user_id}
Authorization: Bearer <token>
```

**Response adds a `profile` object:**
```json
{
  "id": "683a1f2b...",
  "email": "creator@test.com",
  ...
  "profile": {
    "bio": "Professional photographer with 8 years experience",
    "tagline": "Capturing moments that matter",
    "location": "Colombo, Sri Lanka",
    "skills": ["Photography", "Video Editing", "Lightroom"],
    "hourly_rate_min": 2500,
    "hourly_rate_max": 5000,
    "portfolio_item_count": 12
  }
}
```

---

### 4.3 Change User Role

Promote or demote any user's role.

```http
PATCH /admin/users/{user_id}/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_role": "moderator"
}
```

| Value | Description |
|---|---|
| `user` | Standard account (default for all signups) |
| `moderator` | Can access all `/admin/*` endpoints, cannot suspend other admins |
| `admin` | Full admin access |

> **Guard:** Only someone with the `ADMIN_REGISTRATION_KEY` can create the first admin. After that, existing admins can promote others via this endpoint.

---

### 4.4 Suspend a User

Immediately deactivates the account and forces them offline.

```http
PATCH /admin/users/{user_id}/suspend
Authorization: Bearer <token>
```

**What this does:**
- Sets `is_active: false` on the user document
- Calls `PresenceService.set_offline()` — the user appears Offline instantly across the platform
- The user's JWT token remains valid until expiry, but all protected routes will check `is_active` if that guard is implemented on specific endpoints

**Restrictions:** Cannot suspend another `admin` or `moderator` — returns `403 Forbidden`.

**Response:**
```json
{ "id": "683a1f2b...", "is_active": false }
```

---

### 4.5 Reactivate a Suspended User

```http
PATCH /admin/users/{user_id}/activate
Authorization: Bearer <token>
```

**Response:**
```json
{ "id": "683a1f2b...", "is_active": true }
```

---

### 4.6 Toggle Email Verification

Manually verify or un-verify a user's email (useful for customer support cases).

```http
PATCH /admin/users/{user_id}/verify
Authorization: Bearer <token>
```

This **toggles** the current state — if `is_verified: true`, it becomes `false`, and vice versa. Check the current state via `/admin/users/{user_id}` first.

**Response:**
```json
{ "id": "683a1f2b...", "is_verified": true }
```

---

## 5. Job / Project Management

### 5.1 List All Job Postings

```http
GET /admin/jobs
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Description | Example |
|---|---|---|
| `page` | Page number | `?page=1` |
| `page_size` | Results per page (max 100) | `?page_size=50` |
| `search` | Search job title or description | `?search=photography` |
| `status` | Filter by status | `?status=open` |

**Job status values:** `open` · `active` · `delivered` · `approved` · `closed` · `removed`

**Response:**
```json
{
  "total": 145,
  "page": 1,
  "page_size": 25,
  "has_more": true,
  "jobs": [
    {
      "id": "683b2c3d...",
      "title": "Annual Prize Giving Photography Coverage",
      "status": "active",
      "client_id": "683a1f2b...",
      "department": "Photography",
      "proposal_count": 7,
      "created_at": "2025-06-01T08:00:00"
    }
  ]
}
```

---

### 5.2 Update Job Status

Remove spam listings, close inactive jobs, or reopen closed ones.

```http
PATCH /admin/jobs/{job_id}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "removed"
}
```

**Common use cases:**
- `"removed"` — Take down spam or inappropriate listings
- `"closed"` — Manually close a job that the client abandoned
- `"open"` — Reopen a job on client request

---

## 6. Disputes

### List All Disputes

```http
GET /admin/disputes
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Description | Example |
|---|---|---|
| `page` | Page number | `?page=1` |
| `page_size` | Results per page | `?page_size=25` |
| `status` | Filter by dispute status | `?status=open` |

**Dispute status values:** `open` · `under_review` · `resolved` · `closed`

**Response:**
```json
{
  "total": 5,
  "disputes": [
    {
      "id": "683c3d4e...",
      "escrow_id": "683b2c3d...",
      "status": "open",
      "reason": "Delivered work does not match brief",
      "raised_by": "683a1f2b...",
      "created_at": "2025-06-08T14:22:00"
    }
  ]
}
```

> **To resolve a dispute**, use the Dispute resolution endpoint in the escrow router:  
> `POST /escrow/{escrow_id}/disputes/{dispute_id}/resolve` (admin only)

---

## 7. Transactions

### List All Transactions

Full transaction ledger across the entire platform.

```http
GET /admin/transactions
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Description | Example |
|---|---|---|
| `page` | Page number | `?page=1` |
| `page_size` | Results per page | `?page_size=25` |
| `status` | Filter by status | `?status=completed` |

**Transaction status values:** `pending` · `processing` · `completed` · `failed` · `refunded` · `cancelled`

**Response:**
```json
{
  "total": 312,
  "transactions": [
    {
      "id": "683d4e5f...",
      "status": "completed",
      "type": "payment",
      "amount": 35000.00,
      "currency": "LKR",
      "platform_fee": 4200.00,
      "client_fee": 1400.00,
      "creator_fee": 2800.00,
      "commission_version": "v1.split.8_4",
      "client_id": "683a1f2b...",
      "creator_id": "683b2c3d...",
      "created_at": "2025-06-05T11:45:00"
    }
  ]
}
```

**Commission breakdown per transaction:**
```
Gross project amount:      LKR 35,000
Client pays extra (4%):    LKR  1,400   → Total client pays: LKR 36,400
Creator fee deducted (8%): LKR  2,800   → Creator receives:  LKR 32,200
Platform takes total:      LKR  4,200   (12% of project amount)
```

---

## 8. ETF Points

### Platform ETF Summary

```http
GET /admin/etf/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_accounts": 1240,
  "total_lifetime_points": 485200,
  "total_redeemed_points": 12400,
  "level_breakdown": {
    "bronze": 890,
    "silver": 230,
    "gold": 87,
    "platinum": 30,
    "diamond": 3
  }
}
```

**ETF Level Thresholds** (configured in `.env`):
| Level | Points Required |
|---|---|
| Bronze | 0 (default) |
| Silver | 250 |
| Gold | 1,000 |
| Platinum | 5,000 |
| Diamond | Custom / future tier |

---

## 9. Revenue Reporting

Detailed fee revenue breakdown — the most important financial report for the business.

```http
GET /admin/revenue
Authorization: Bearer <token>
```

**Response structure:**

```json
{
  "monthly": [
    {
      "month": "2025-01",
      "client_fees": 1820.50,
      "creator_fees": 3641.00,
      "total_fees": 5461.50,
      "volume": 45512.50,
      "count": 18
    },
    ...
  ],
  "totals": {
    "client_fees": 5700.00,
    "creator_fees": 11400.00,
    "platform_total": 17100.00,
    "volume": 142500.00,
    "transaction_count": 218
  },
  "top_projects": [
    {
      "id": "683d4e5f...",
      "amount": 150000.00,
      "platform_fee": 18000.00,
      "client_fee": 6000.00,
      "creator_fee": 12000.00,
      "client_id": "...",
      "creator_id": "...",
      "created_at": "2025-05-20T09:00:00",
      "status": "completed"
    }
  ],
  "commission_info": {
    "version": "v1.split.8_4",
    "client_rate_pct": 4.0,
    "creator_rate_pct": 8.0,
    "total_rate_pct": 12.0,
    "note": "Client pays +4% on top of project amount. Creator receives amount minus 8%."
  }
}
```

**`monthly` array** — last 12 months only, sorted oldest→newest  
**`top_projects`** — top 10 transactions by platform fee (highest-value projects)  
**`commission_info`** — live commission configuration currently active on the platform

---

## 10. Role Reference

| Role | Can Access `/admin/*` | Can Suspend Admins | Notes |
|---|---|---|---|
| `user` | ❌ | ❌ | Default role for all signups |
| `moderator` | ✅ | ❌ | Can manage users/jobs/disputes, cannot touch other admins |
| `admin` | ✅ | ❌ | Full access. No admin can suspend another admin. |

> **Design note:** There is no "super admin" role. Suspension of admin accounts must be done directly in MongoDB if absolutely necessary. This prevents accidental lockouts.

---

## 11. Security Notes

### Admin Key Storage
The `ADMIN_REGISTRATION_KEY` in `.env` is the only gate to creating admin accounts. Keep it secret. Rotate it immediately if you suspect it has been exposed.

**Production checklist:**
- [ ] `ADMIN_REGISTRATION_KEY` is at least 24 characters, randomly generated
- [ ] `ADMIN_REGISTRATION_KEY` is not the default value (`spectrum-admin-secret-2025`)
- [ ] `.env` file is not committed to the repository
- [ ] Admin accounts use strong passwords (16+ characters)

### Generating a Secure Admin Key
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Rate Limiting on Admin Registration
The `/auth/promote-to-admin` endpoint is rate-limited to **5 requests per 5 minutes per IP**. Brute-force attempts to guess the admin key are throttled.

### CORS
Admin API calls from browser clients must come from an origin in `ALLOWED_ORIGINS` or `FRONTEND_URL`. Postman and server-side clients bypass CORS.

### JWT Expiry
Admin tokens expire after **24 hours**. There is no refresh token mechanism currently. Re-login is required daily.

---

## 12. Troubleshooting

### `403 Forbidden — Admin access required`
Your JWT token is valid but your account's `user_role` is not `admin` or `moderator`. Use `/auth/promote-to-admin` or `/admin/users/{id}/role` from an existing admin account.

### `401 Unauthorized`
Token is missing, expired, or tampered. Re-run `POST /auth/login` to get a fresh token.

### `422 Unprocessable Entity` on login
Login uses **form data**, not JSON. Set `Content-Type: application/x-www-form-urlencoded` and pass `username` (your email) + `password` as form fields.

### Admin `/stats` or `/revenue` shows all zeros
This was caused by a Beanie 2.0 aggregation API incompatibility (now fixed). If you see zero revenue/user stats after a fresh deployment, ensure you are running the latest version of the codebase. The fix is in `admin_router.py` — all aggregation calls now use `get_pymongo_collection().aggregate(pipeline).to_list(None)`.

### Cannot suspend user — returns `200` but `is_active` doesn't change
The `is_active` field must exist on the `User` model. If it doesn't (older user documents), the suspend action silently skips the write. Run the database migration or manually set `is_active: false` in MongoDB Compass.

### Rate limit hit during testing (`429 Too Many Requests`)
Set `RATE_LIMIT_MULTIPLIER=20` in your `.env` to raise the per-IP limits during development. Never set this above 1 in production.

---

## Quick Reference Card

```
SETUP
─────────────────────────────────────────────────────────────
Register admin:    POST /auth/register-admin          (body: JSON)
Promote user:      PATCH /auth/promote-to-admin       (header: X-Admin-Key)
Login:             POST /auth/login                   (body: FORM DATA)
Verify admin:      GET  /auth/me                      (Bearer token)

PLATFORM OVERVIEW
─────────────────────────────────────────────────────────────
Stats:             GET  /admin/stats
Revenue:           GET  /admin/revenue
ETF summary:       GET  /admin/etf/stats

USER MANAGEMENT
─────────────────────────────────────────────────────────────
List users:        GET  /admin/users?search=&account_type=&is_active=
User detail:       GET  /admin/users/{id}
Change role:       PATCH /admin/users/{id}/role        {"user_role": "moderator"}
Suspend:           PATCH /admin/users/{id}/suspend
Reactivate:        PATCH /admin/users/{id}/activate
Toggle verified:   PATCH /admin/users/{id}/verify

CONTENT & PAYMENTS
─────────────────────────────────────────────────────────────
List jobs:         GET  /admin/jobs?search=&status=
Update job:        PATCH /admin/jobs/{id}/status       {"status": "removed"}
List disputes:     GET  /admin/disputes?status=open
All transactions:  GET  /admin/transactions?status=completed
```
