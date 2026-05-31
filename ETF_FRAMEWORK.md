# ETF — Earn Trust Framework

**Document:** Phase 1 (MVP) implementation notes + Phase 2 roadmap
**Status:** Phase 1 shipped end-to-end (backend + frontend, all configurable)

---

## 1. What ETF is

A points-based trust and loyalty system. Every meaningful action a user takes on Spectrum Connect — posting a project, funding a milestone, delivering work, getting verified, etc. — awards ETF Points. Lifetime points determine a visible level (Bronze / Silver / Gold / Platinum). Higher levels appear with a badge on profiles, creator cards, and Smart Connect results, and earn a small ranking boost in the matching algorithm.

The internal point-to-USD ratio is `100 points = $1.00` for future cash-out math. **This value is never exposed to end users.** Every user-facing surface shows points, levels, and progress only.

---

## 2. What shipped in Phase 1

### Backend

| Component | Location |
|---|---|
| `EtfPoints` document (per-user balance + level) | `app/models/etf_points.py` |
| `EtfEvent` document (immutable audit log, idempotent) | `app/models/etf_points.py` |
| `EtfPointsService` (award, balance, level, events, badge, cashout) | `app/services/etf_points_service.py` |
| Config (point values, level thresholds, cashout flags) | `app/core/config.py` + `.env.example` |
| `GET  /etf/me` (balance + level + progress) | `app/api/routers/etf_router.py` |
| `GET  /etf/me/events` (paginated activity) | same |
| `GET  /etf/badge/{user_id}` (public — for cards) | same |
| `GET  /etf/me/cashout` (eligibility check) | same |
| `POST /etf/me/cashout` (request — stub, admin reviews) | same |
| Smart Connect ranking bonus (0/3/5/8 pts by level) | `app/services/smart_connect_service.py` |
| Hooks: project posted → client points | `app/services/job_service.py` |
| Hooks: milestone funded → client points | `app/services/escrow_service.py` |
| Hooks: milestone released → both sides | `app/services/escrow_service.py` |
| Hooks: project completed → both sides bonus | `app/services/escrow_service.py` + `app/services/project_service.py` |
| Hooks: profile verified → one-shot bonus | `app/services/review_queue_service.py` |
| Tests (17 passing, all hermetic) | `tests/test_etf_points.py` |

### Frontend

| Component | Location |
|---|---|
| API client + types | `lib/api.ts` (`etfPoints.*`, `EtfBalance`, `EtfEvent`, `EtfLevelInfo`) |
| Reusable badge chip | `components/EtfBadge.tsx` |
| Dashboard widget | `components/EtfWidget.tsx` |
| Creator ETF page (full) | `app/(creator)/creator/etf/page.tsx` |
| Client ETF page (full) | `app/(client)/client/etf/page.tsx` |
| Widget on creator dashboard | `app/(creator)/creator/dashboard/page.tsx` |
| Widget on client dashboard | `app/(client)/client/dashboard/page.tsx` |
| Badge on Smart Connect creator cards | `app/(client)/client/smart-connect/page.tsx` |
| ETF link in creator profile dropdown | `app/(creator)/layout.tsx` |
| ETF link in client profile dropdown | `app/(client)/layout.tsx` |

### Anti-abuse rules (already enforced in code)

1. **Idempotency per (action, source_type, source_id).** Re-running the same milestone release can never double-award.
2. **Self-deal blocked.** When `actor_id == counterparty_id` (e.g. client and creator are the same account), the award is silently dropped.
3. **Draft posts excluded.** Posting a draft job does not award points; only published posts qualify.
4. **Zero/negative amounts silently skipped.** Service callers can pass `points=0` defensively without writing junk events.
5. **Awards never raise.** Auditing/award failures are logged and swallowed so the request path never breaks.

---

## 3. Point values (current defaults)

All amounts are configurable via env vars without redeploy:

| Action | Default points | Env var |
|---|---|---|
| Client posts a (published) project | 5 | `ETF_POINTS_PROJECT_POSTED` |
| Client hires a creator (proposal accepted) | 20 | `ETF_POINTS_PROJECT_HIRED` |
| Client funds a milestone | 10 | `ETF_POINTS_MILESTONE_FUNDED` |
| Client releases a milestone | 15 | `ETF_POINTS_MILESTONE_RELEASED_CLIENT` |
| Creator gets paid on a milestone | 50 | `ETF_POINTS_MILESTONE_RELEASED_CREATOR` |
| Whole project completes — client bonus | 50 | `ETF_POINTS_PROJECT_COMPLETED_CLIENT` |
| Whole project completes — creator bonus | 100 | `ETF_POINTS_PROJECT_COMPLETED_CREATOR` |
| Review submitted | 15 | `ETF_POINTS_REVIEW_SUBMITTED` |
| Repeat client bonus | 25 | `ETF_POINTS_REPEAT_CLIENT_BONUS` |
| Profile verified (one-shot) | 100 | `ETF_POINTS_PROFILE_VERIFIED` |

Internal cash-out conversion: `100 points = $1.00 USD` (configurable via `ETF_POINTS_PER_USD`, **never surfaced to users**).

---

## 4. Level thresholds

| Level | Lifetime points | Smart Connect bonus | Env var |
|---|---|---|---|
| Bronze | 0 – 249 | +0 | (start) |
| Silver | 250 – 999 | +3 | `ETF_LEVEL_SILVER` |
| Gold | 1,000 – 4,999 | +5 | `ETF_LEVEL_GOLD` |
| Platinum | 5,000+ | +8 | `ETF_LEVEL_PLATINUM` |

Each level has a distinct chip color and Font Awesome icon (see `components/EtfBadge.tsx`). The level is computed from `lifetime_points` so spending on rewards or cash-out never demotes a user.

---

## 5. Cash-out (Phase 1 — eligibility check only)

`POST /etf/me/cashout` is wired but treated as a **stub**: it debits the balance and queues a request. **No money actually moves yet** — that requires the payment processor work in Phase 2.

Default eligibility rules:
- `ETF_CASHOUT_ENABLED=true` master kill switch (currently `false` in production)
- ≥ `ETF_CASHOUT_MIN_POINTS` (default 1,000 points = $10 internally)
- ≥ `ETF_CASHOUT_MIN_ACCOUNT_AGE_DAYS` (default 365 days) old account
- `is_verified == True`

These are exposed as a structured `eligible: bool, reasons: [str]` payload so the UI can show "Eligible in 234 days" / "Need 250 more points" instead of a blanket "no".

---

## 6. How it integrates with what already exists

- **Smart Connect.** Score breakdown now has an `etf_level` factor (0/3/5/8 bonus pts). Creator cards in `/client/smart-connect` render an `EtfBadge` chip next to the trust tier. No N+1 fetches — the level rides inline on the match payload.
- **Commission split.** Independent. Commission is a Decimal-money calculation; ETF is an integer-points calculation. They don't share code.
- **Existing ETF Vault** (`ETFVault` document, `etf_service.py`). Left untouched. The vault remains the internal USD reserve that will back future cash-outs. Its frontend page has been replaced with the points UI — the vault is now backend-only and hidden from users.
- **Security audit.** All new endpoints respect the existing auth + rate-limit middleware. The public badge endpoint is intentionally unauthenticated so it can be cached by the CDN.

---

## 7. Deferred to Phase 2

Each of these is sketched but not built. The Phase 1 data model and APIs can accommodate them without breaking changes.

### 7.1 Rewards storefront
Spending points on:
- Profile boost / featured placement (creator side)
- Featured job listing / priority matching (client side)
- Premium feature unlocks
- Subscription upgrade credit

Backend stub: extend `EtfEvent.action` with `reward.redeemed.{kind}` and add `EtfPointsService.redeem_reward(user, reward_id)` that decrements `balance` and persists a redemption record. UI: a `/etf/rewards` catalog page per side.

### 7.2 Real cash-out
- Wire `POST /etf/me/cashout` through to a payment processor (Stripe Connect / Wise / PayPal).
- Add admin approval queue (use the existing `ReviewQueue` pattern).
- Fraud check: velocity per IP/device, declined-payment-method history, identity verification.
- Emit a real `Transaction` (type=`payout`) per cash-out so it appears in the existing earnings/transactions ledger.

### 7.3 Notifications
Phase 1 records events; it does not push them. To complete:
- Reuse the existing `Notification` model (`app/models/schema.py`).
- After each successful `award_points`, also insert a `Notification` for the user.
- Trigger a notification when the user crosses a level threshold.
- Optional: email digest of weekly ETF activity.

### 7.4 Admin controls UI
Backend rates are already env-configurable. To make them runtime-configurable:
- New `EtfConfig` document holding overrides for each `ETF_POINTS_*` constant.
- `EtfPointsService._default_points_for` reads the override if present, falls back to env.
- Admin page (in the planned `(admin)/` route group from `ADMIN_DASHBOARD_GUIDE.md`) to edit values.

### 7.5 Repeat-client bonus
The `repeat_client.bonus` action and points value exist, but no trigger fires it yet. Phase 2: when the matching service detects the same `(client_id, creator_id)` pair completing a 2nd+ project, award the bonus to the creator.

### 7.6 Active-platform-usage points
The spec lists "consistent communication" and "active platform usage" as earning conditions. Phase 1 doesn't reward those because we don't yet measure activity at a granular level. Phase 2 candidates:
- Daily login bonus (5 pts, capped at 1/day per user, deduped via the date in the idempotency key).
- Message-thread liveness (only if both parties posted in the last N days).

### 7.7 Skill challenge integration
`/creator/skill-challenges` already issues badges. Phase 2: also award 100 ETF Points per skill badge earned (one-shot per challenge_id).

---

## 8. How to verify Phase 1 is working

After backend deploy:

```bash
BE=http://spectrum-connect-prod.eba-dnnmz6mt.ap-south-1.elasticbeanstalk.com

# Public badge for an arbitrary user (always returns at least bronze)
curl -sS "$BE/etf/badge/000000000000000000000000"

# Your own balance (requires Bearer token)
TOKEN=...
curl -sS -H "Authorization: Bearer $TOKEN" "$BE/etf/me"
curl -sS -H "Authorization: Bearer $TOKEN" "$BE/etf/me/events?limit=10"
curl -sS -H "Authorization: Bearer $TOKEN" "$BE/etf/me/cashout"
```

After frontend deploy:

- Visit `/creator/dashboard` or `/client/dashboard` → see ETF widget.
- Click the widget → land on `/creator/etf` or `/client/etf` with balance / level / progress / activity feed.
- Visit `/client/smart-connect` → creator cards show an ETF chip next to their trust tier.
- Confirm **no `$` appears** anywhere on either ETF page or the widget.

---

## 9. Sign-off checklist for the dev team

- [ ] All 17 ETF unit tests pass locally (`pytest tests/test_etf_points.py`).
- [ ] `/etf/me` returns the expected `{ balance, lifetime_points, level }` shape for a logged-in user.
- [ ] `/etf/badge/{user_id}` returns at least bronze for a user with no events.
- [ ] Dashboard widget renders progress bar that fills as you cross thresholds.
- [ ] Smart Connect creator cards show the ETF chip.
- [ ] Releasing a milestone awards points to both client and creator (verify via `/etf/me/events`).
- [ ] Re-running the same release does NOT award points a second time.
- [ ] Self-deal (client = creator) does NOT award points.
- [ ] Cash-out endpoint refuses when `ETF_CASHOUT_ENABLED=false` (default).
- [ ] No `$` is rendered anywhere in the user-facing ETF UI.

---

*This document is intentionally Phase-1-narrow. Everything in §7 has been deliberately deferred to keep the first rollout simple, scalable, and production-ready while leaving room to expand.*
