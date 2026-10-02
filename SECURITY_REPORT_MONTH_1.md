# Spectrum Connect — Month 1 Security Report

**Period:** Weeks 1–4 of the 90-day plan
**Prepared by:** Nasir (Main Developer)
**Date:** 2 October 2026
**Builds on:** `SECURITY_AUDIT.md` (pre-launch audit, 30 May 2026)

---

## 1. Summary

The platform's code is in good shape. Over the month we fixed every security problem we found in the code, and tested logins, admin access, record access and payments with 165 automated checks — all passing.

**The main remaining risk is not in the code.** Two passwords leaked into the project's history earlier this year, and one of them was still visible in a project document until this week. Until those passwords are changed on the live services, they should be treated as known to outsiders.

| Area | Status |
|---|---|
| Login, sign-up and email codes | ✅ Secure |
| Admin access | ✅ Admins only |
| Who can see / change whose records | ✅ Tested — no gaps |
| Payments (escrow) | ✅ Tested — only the right person can release, refund or approve |
| File uploads | ✅ Risky file type blocked |
| Leaked passwords | ⚠️ **Must be changed on the live services** |
| Secure connection (HTTPS) to the server | ⚠️ Not switched on yet |

---

## 2. What we found and fixed this month

### Week 1 — Security lockdown
- Confirmed every admin page and action requires an admin account; wiping data requires a top-level admin and their password; creating admin accounts is limited to 3 tries an hour.
- Production safety settings switched on: API documentation hidden, browsers told to use secure connections only, one-time login codes never shown.
- Blocked SVG image uploads — an SVG can carry hidden code that runs when its link is opened.
- Added sign-up tracking so the team can see where new users drop off.

### Week 2 — Sign-up and onboarding
- New users were sent back to the login page after verifying their email and lost what they had typed. Fixed.
- Creators could not finish profile setup at all (server error). Fixed.
- Signup form now checks password rules up front; Google sign-up can no longer be used to pick an unexpected account type.

### Week 3 — Record access and account settings
- **Record access test:** a stranger with a normal account tried 52 different ways to read, change or delete other people's jobs, proposals, services, portfolios, team projects, messages and payments. **All were refused**, nothing changed, and the real owners could still do everything. No code changes were needed.
- **Password change** accepted weak passwords (letters only) that sign-up rejects. Fixed — same rule everywhere now.
- **Wrong current password** caused a server error instead of a clear message. Fixed.
- **Seven account settings pages** hid their real error messages behind a generic server error. Fixed.
- **Cleared profile fields** (website, bio, etc.) came back after saving. Fixed.
- A client's budget and timeline are kept off their public profile.

### Week 4 — Leaked passwords
- Found that the **database password was still written in `SECURITY_AUDIT.md`** — in the example clean-up command — on GitHub's main branch. Removed this week.
- Found that the **Google sign-in secret** is also in the project's history inside a file saved in an unusual text format (UTF-16), which normal searches miss. The earlier clean-up instructions would not have removed either password.
- Built and tested a clean-up that removes both passwords from all 293 commits of history (see §4).

---

## 3. Testing

All tests run on a private copy of the system with test data and test passwords — no real accounts, money or passwords were used.

| What was tested | Checks | Result |
|---|---|---|
| Sign-up tracking, admin access, uploads | 21 | ✅ |
| Google sign-in with a new secret | 10 | ✅ |
| Production settings (secure cookies, hidden docs, codes never shown) | 8 | ✅ |
| Sign-up and onboarding fixes | 18 | ✅ |
| Record access incl. payments | 67 | ✅ |
| Profile and account settings | 41 | ✅ |
| **Total** | **165** | **✅ all passing** |

**Not yet tested:** real file storage, real emails, and a click-through in a browser. These should be checked right after the next deploy.

---

## 4. Open risks and what to do

Listed most urgent first.

### 4.1 Change the leaked passwords — **urgent**
Both passwords have been readable on GitHub. Removing them from files does not make them safe again.
1. **Database:** in MongoDB Atlas, delete the user `nasireaglines_db_user`, and check Atlas's access log for unknown activity.
2. **Google sign-in:** in Google Cloud Console, reset the OAuth client secret and put the new one on the server.

### 4.2 Remove the passwords from the project history
Ready to run. Tested on a separate copy: both passwords removed from all 293 commits, all branches kept, 0 copies left.
- **Needs approval** — it rewrites the shared history, so everyone must re-download the project afterwards.
- Do it **after** 4.1; it doesn't replace changing the passwords.

### 4.3 Switch on secure connections (HTTPS) for the server
The website already uses HTTPS, but its connection to the server does not. Login cookies are already marked "secure only", so this must be done before or with the next deploy, or logins will stop working in production.

### 4.4 Before more than one server runs
Login codes and rate limits are kept in the server's memory. That's fine with one server; with two or more they need a shared store (Redis). Planned for Week 8.

### 4.5 Lower priority
- Add a content security policy to the website (extra protection against injected scripts).
- Automatic checks for known-vulnerable libraries.
- Confirm a few record-access checks again on the live site after deploy.

---

## 5. Next month

- Week 5: referral programme and second round of UI simplification.
- Week 6: deeper review of file storage and messaging security.
- Week 8: performance and moving login codes / rate limits to a shared store.
