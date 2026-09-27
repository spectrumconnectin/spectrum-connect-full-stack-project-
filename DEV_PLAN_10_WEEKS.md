# Spectrum Connect: 10-Week Developer Plan

**Owner:** Nasir (Main Developer)
**Source:** "spectrum 3 month work list" (12-week plan), fitted into 10 weeks
**Last updated:** 2026-09-27

**Status key:** ✅ Done · 🟡 Partly done · ⏳ Pending

**User targets:** 1,000 users by Week 4 · 4,000 by Week 7 · 10,000 by Week 10

---

## Summary

| Week | Focus | Status |
|---|---|---|
| 1 | Security lockdown + tracking | ✅ Done (dummy-tested) — live values + deploy left |
| 2 | Fix findings + start onboarding UX | ✅ Done (dummy-tested) — deploy left |
| 3 | Onboarding UX + API access review | 🟡 Partly done |
| 4 | Month 1 security report | ⏳ Pending |
| 5 | Referral MVP + UI sprint 2 | ⏳ Pending |
| 6 | Upload, storage and messaging security | 🟡 Partly done |
| 7 | Fix signup drop-offs | ⏳ Pending |
| 8 | Performance + scaling | ⏳ Pending |
| 9 | Project discovery + API/DB speed | ⏳ Pending |
| 10 | Final security + production check | ⏳ Pending |

---

## Week 1: Security lockdown + tracking

| # | Task | Status | Notes |
|---|---|---|---|
| 1.1 | Security audit of auth, API, uploads, secrets, config | ✅ Done | 17 issues fixed in code (see `SECURITY_AUDIT.md`) |
| 1.2 | Check login, roles and admin access | ✅ Done | All `/admin` routes require an admin; `/wipe-data` requires a superadmin and their password; `/register-admin` rate-limited (3/hour). **Tested locally ✅** |
| 1.3 | Set `ENVIRONMENT=production`, `SECRET_KEY`, `ADMIN_REGISTRATION_KEY` on EB | ✅ Done | Live: `/docs` returns 404, HSTS header sent |
| 1.4 | Rotate the Google OAuth client secret | ✅ Done (dummy-tested) | Google sign-in works end to end with a new dummy secret (10/10). Secret is read only from env, none left in code. **Live:** Reset Secret in Google Cloud → `eb setenv GOOGLE_CLIENT_SECRET=...` |
| 1.5 | Delete the MongoDB user `nasireaglines_db_user` | ✅ Done (dummy-tested) | App connects with any DB user given in `MONGO_URI`; no DB passwords left in code. **Live:** delete the user in Atlas (old password is still in 3 git-history commits) |
| 1.6 | Turn on HTTPS for the backend | ✅ Done (dummy-tested) | Production mode tested (7/7): HSTS on, `/docs` hidden, OTP never echoed, cookies Secure + HttpOnly; weak `SECRET_KEY` refused. **Live:** ACM cert + 443 listener; set `next.config.mjs` line 52 to `https://` |
| 1.7 | Set up signup and activation tracking | ✅ Done (dummy-tested) | Code done and **tested locally ✅** incl. Google sign-up (mocked Google), **not yet deployed**. Events: `user.signup` (email + Google), `user.email_verified`, `user.onboarding_completed`, `portfolio.item_added`, `job.posted`, `application.submitted`, `conversation.started`. Funnel report: `GET /admin/stats/funnel?days=30`. Confirm the event list with Ashish |

**Done when:** no critical security gaps remain and signup events are recorded.

### Local test results (2026-09-27)

Run with dummy secrets, an in-memory fake MongoDB and mocked email — no real credentials used. **17/17 checks passed.**

| Area | What was tested | Result |
|---|---|---|
| Tracking | Signup, email verify, onboarding, portfolio item, conversation all recorded; repeat conversation not double-counted | ✅ |
| Funnel report | `/admin/stats/funnel` correct (2 signed up → 2 verified → 1 onboarded → 1 portfolio → 1 conversation); normal user gets 403 | ✅ |
| SVG upload | `.svg` with a script inside rejected (400) | ✅ |
| `/register-admin` | Blocked after 3 tries (4th = 429) | ✅ |
| Admin routes | Blocked for normal users and for anyone not logged in (403) | ✅ |
| Record access | Bob can't delete Alice's portfolio item (404) or her message (403) | ✅ |

### Credential tasks — dummy tests (2026-09-27)

Dummy Google client ID/secret, dummy MongoDB user, production mode, mocked Google. **18/18 passed.**

| Task | What was tested | Result |
|---|---|---|
| 1.4 OAuth | Secret comes from env; login redirects to Google with the new client ID; callback creates + verifies the user; one-time exchange code (no token in URL, can't reuse); forged or replayed `state` rejected; `user.signup` logged as `google` | ✅ 10/10 |
| 1.5 MongoDB | App connects with the DB user in `MONGO_URI`; no leaked Google secret or DB password anywhere in current code | ✅ |
| 1.6 HTTPS / production | HSTS header; `/docs` 404; register + login work; OTP never returned; session cookie `Secure` + `HttpOnly`; app refuses to start with a weak `SECRET_KEY` | ✅ 8/8 |

**Not tested locally:** real S3 uploads, real email sending. Check these after deploy.

**Live values still to set** (each is a console change, the code needs nothing more): new Google secret, delete old Atlas user, HTTPS listener + `https://` in `next.config.mjs`.

---

## Week 2: Fix findings + start onboarding UX

| # | Task | Status | Notes |
|---|---|---|---|
| 2.1 | Fix critical/high findings in code | ✅ Done | OTP, CORS, headers, rate limits, passwords, XSS |
| 2.2 | Remove SVG from the upload allowlist | ✅ Done (dummy-tested) | `upload_router.py`; `.svg` rejected in local test. **Live:** deploy |
| 2.3 | Update `SECURITY_AUDIT.md` | ✅ Done | New backend URL (line 16); H-5 no longer lists SVG |
| 2.4 | Signup/onboarding UX sprint 1 | ✅ Done (dummy-tested) | 6 bugs + 6 product items fixed (below). **Live:** deploy |

**Done when:** Sprint 1 changes are live.

### Signup/onboarding review (2026-09-27)

Read in full: signup, verify-email, login, OAuth callback, creator onboarding, client onboarding (frontend) and register, OTP, login, Google callback, profile update, onboarding (backend).

**Bugs fixed:**

| # | Bug | Fix |
|---|---|---|
| B1 | **New users weren't logged in after verifying email.** "Complete Profile" opened onboarding with no session → first save got 401 → user bounced to login and lost their input | Signup logs in right after OTP verify. The standalone verify page sends users to login, and their first login goes to onboarding |
| B2 | `user.onboarding_completed` never fired — the onboarding pages don't call the endpoint the event was on | New `POST /onboarding/complete/{creator\|producer}`, called by both onboarding pages; logged once per account |
| B3 | Any username error showed "That username is taken" | Only a real "already taken" error shows that message (username field now removed, see P6) |
| B4 | Signup form didn't check the letter + number password rule, so the backend rejected it after submit | Form checks the same rules as the backend before submitting |
| B5 | Unverified user trying to log in got a dead-end message | Message has a "Verify now" link to the verify page |
| B6 | **Creator onboarding "Finish setup" always failed (500).** It sends `availability_status`, which the Profile model doesn't have | Availability saved to `user.settings` (where talent search reads it); bad values get a 400. Bio limited to 500 chars in the form to match the server |

**Product items fixed** (defaults chosen — Ashish/Pulindu can adjust):

| # | Issue | Fix |
|---|---|---|
| P1 | Client onboarding never saved categories, budget or timeline | New profile fields `hiring_categories`, `typical_budget`, `typical_timeline`; saved on finish |
| P2 | Creator "remote only" checkbox never saved | New profile field `remote_only`; saved on finish (with `availability_label`) |
| P3 | Login/signup claimed "50,000+ Active Creators", "100,000+ Projects Completed", "thousands of creators" | Replaced with accurate copy: "A Growing Creative Community", "Secure Payments" (escrow) |
| P4 | Login "I'm signing in as Creator/Client" toggle did nothing | Removed — login already routes by the real account type |
| P5 | Google sign-up always made a creator account; new Google clients skipped onboarding | Signup's Google button passes the chosen type (crew/producer only; anything else ignored). New Google users of either type go to onboarding. Existing accounts unchanged |
| P6 | Signup had 8 fields | Username field removed — server makes a unique one from the email (`jane.doe`, `jane.doe2`…); changeable later in settings. Phone stays optional |

**Tested:** Week 2 backend 18/18 ✅ · Week 1 regression 21/21 ✅ · credential tests 18/18 ✅ · frontend type-check ✅. Not yet clicked through in a browser.

---

## Week 3: Onboarding UX + API access review

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1 | Review API authorization and object-level access (code) | ✅ Done | Jobs, services, workspace, messages, project members, portfolio all check ownership |
| 3.2 | Test object-level access with two real accounts | 🟡 Partly done | Tested locally ✅: portfolio items and messages. Still to test: jobs, services, portfolio projects, project members — and repeat on live after deploy |
| 3.3 | Finish the onboarding and profile UX sprint | ⏳ Pending | Epun sends a QA list on the new UI |

**Done when:** onboarding changes are live and no critical API access gaps exist.

---

## Week 4: Month 1 security report

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Write the Month 1 security report | ⏳ Pending | Base it on `SECURITY_AUDIT.md` + Week 1–3 results |
| 4.2 | Purge leaked secrets from git history | ⏳ Pending | Optional; `git filter-repo`, then everyone re-clones |

**Milestone:** 1,000 total users.

---

## Week 5: Referral MVP + UI sprint 2

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | Build the referral MVP | ⏳ Pending | Needs Ashish's referral spec and reward logic |
| 5.2 | Second UI simplification sprint | ⏳ Pending | Fix the top 5 friction items |

**Done when:** referral MVP is live.

---

## Week 6: Upload, storage and messaging security

| # | Task | Status | Notes |
|---|---|---|---|
| 6.1 | Block SVG uploads | 🟡 Partly done | Same as 2.2; tested locally ✅, deploy needed |
| 6.2 | Remove old SVG uploads from S3 | ⏳ Pending | Check the bucket for `.svg` files uploaded before the fix |
| 6.3 | Review file upload, storage and messaging security | ⏳ Pending | S3 bucket policy, file size/quota, message access |

**Done when:** no critical upload issues.

---

## Week 7: Fix signup drop-offs

| # | Task | Status | Notes |
|---|---|---|---|
| 7.1 | Fix the top signup funnel drop-offs | ⏳ Pending | Ashish finds the drop-offs from tracking data |
| 7.2 | Add a Content-Security-Policy header on the frontend | ⏳ Pending | Optional hardening |

**Milestone:** 4,000 total users.

---

## Week 8: Performance + scaling

| # | Task | Status | Notes |
|---|---|---|---|
| 8.1 | Test site speed and fix slow areas | ⏳ Pending | No critical bottlenecks |
| 8.2 | Move OTPs and rate limits to Redis | ⏳ Pending | Needed before running more than one server |

**Done when:** the site is ready for higher traffic.

---

## Week 9: Project discovery + API/DB speed

| # | Task | Status | Notes |
|---|---|---|---|
| 9.1 | Improve project discovery and Smart Connect | ⏳ Pending | Ashish scopes the changes |
| 9.2 | Speed up APIs and database | ⏳ Pending | Indexes, slow queries |

**Done when:** sprint delivered and performance improved.

---

## Week 10: Final security + production check

| # | Task | Status | Notes |
|---|---|---|---|
| 10.1 | Final security regression testing | ⏳ Pending | Re-test everything from Weeks 1, 3 and 6 |
| 10.2 | Final production check | ⏳ Pending | Run the sign-off checklist in `SECURITY_AUDIT.md` §6 |
| 10.3 | Add dependency scanning to CI | ⏳ Pending | Optional; `pip-audit`, `npm audit` or Dependabot |

**Milestone:** 10,000 total users.

---

## Start here

1. Rotate the OAuth secret (1.4)
2. Delete the MongoDB user (1.5)
3. Turn on HTTPS (1.6)
4. Deploy the backend (SVG fix 2.2 + tracking 1.7)
5. After deploy: sign up a test account, then check `GET /admin/stats/funnel`
