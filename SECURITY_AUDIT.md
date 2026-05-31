# Spectrum Connect — Pre-Launch Security Audit

**Date:** 2026-05-30
**Scope:** Full stack — Next.js frontend (Vercel), FastAPI backend (Elastic Beanstalk), MongoDB Atlas, S3 uploads, OAuth, auth, deployment configuration.
**Status:** Code-level fixes deployed (frontend + backend). Operational follow-ups required from the dev/ops team — see "Outstanding actions" below.

---

## 1. Executive summary

The audit covered authentication & authorization, API security, database access, frontend XSS surface, file uploads, secrets handling, infrastructure configuration, transport security, and dependency hygiene.

We found and fixed **17 issues** across **CRITICAL**, **HIGH**, and **MEDIUM** severity. All code-level fixes have been deployed:

- Frontend: https://spectrum-nextjs.vercel.app (deployment `dpl_HEgPN9upVoN4RfE4v3WHqusL11vk`)
- Backend: http://spectrum-connect-prod.eba-dnnmz6mt.ap-south-1.elasticbeanstalk.com (deployment `app-69c8-260530_153351703501`)

**Six outstanding operational items** remain and require the dev/ops team's intervention. The highest-priority outstanding items are:

1. Rotate the leaked Google OAuth client secret (was tracked in git).
2. Revoke the leaked MongoDB Atlas user `nasireaglines_db_user` (was tracked in git).
3. Set a strong `SECRET_KEY` and `ADMIN_REGISTRATION_KEY` on the Elastic Beanstalk environment, and flip `ENVIRONMENT=production`.
4. Enable HTTPS on the Elastic Beanstalk load balancer.

Until items 1–4 are completed, **the platform should not be considered production-ready**, even with all code fixes in place.

---

## 2. Findings and resolutions

### 2.1 CRITICAL

#### C-1 Real Google OAuth client secret committed to git
- **File:** `project-master-spectrum/.env.example`
- **Detail:** The "example" environment file shipped with real values:
  - `GOOGLE_CLIENT_ID=944564225554-d49f6ae70pq9di6aebr0306qsh1nulrf.apps.googleusercontent.com`
  - `GOOGLE_CLIENT_SECRET=GOCSPX-REDACTED-rotate-immediately`
- **Risk:** Anyone with repo access (and the public if the repo was ever public) can impersonate the application's Google OAuth client, intercept OAuth flows, and phish users.
- **Fix:** Replaced the file with a sanitized UTF-8 placeholder template. The file is also now blocked from leaking again by a stricter `.gitignore`.
- **Outstanding:** **Rotate the secret in Google Cloud Console** — once committed, the secret must be considered compromised. See §4.

#### C-2 Hardcoded production-class MongoDB Atlas credentials in source
- **File:** `project-master-spectrum/inspect_database.py`
- **Detail:** `MONGO_URI = "mongodb+srv://nasireaglines_db_user:REDACTED@rag.d74ni5g.mongodb.net"`
- **Risk:** Full read/write access to that MongoDB Atlas cluster for anyone with repo access.
- **Fix:** Script now loads `MONGO_URI` from environment (via `.env`) and aborts if unset; the URL is no longer printed to stdout.
- **Outstanding:** **Revoke the `nasireaglines_db_user` user in MongoDB Atlas.** If the `rag.d74ni5g.mongodb.net` cluster still exists, audit its access logs.

#### C-3 OTPs logged in plaintext to server stdout
- **File:** `app/auth/router.py`
- **Detail:** `print(f"📧 OTP for {email}: {otp}")` and `print(f"🆕 NEW USER: {username} | OTP: {otp}")` ran on every signup / OTP send. CloudWatch / EB log streams retained the codes.
- **Risk:** Any account that successfully verifies email can be compromised by anyone with log access (which on a shared EB environment can be quite broad).
- **Fix:** Removed all OTP `print` statements. Logger now records *that* an OTP was issued without echoing the code.

#### C-4 OTPs leaked back over the API on email failure
- **File:** `app/auth/router.py` (`send_otp`, `register_user`)
- **Detail:** When the email send call failed, the API returned `{"dev_otp": "<code>"}` in the JSON response. An attacker who could disrupt the email provider (or any provider outage) could harvest live OTPs from the API.
- **Risk:** Trivial account takeover during email infra incidents.
- **Fix:** `dev_otp` is now only echoed back when **both** `ENVIRONMENT != production` **and** the email actually failed. Production environments never expose OTPs over the API.

#### C-5 OTPs had no brute-force protection
- **File:** `app/auth/router.py` (`verify_otp`)
- **Detail:** A 6-digit numeric code with no attempt limit can be brute forced in well under 1M requests. Rate limiting alone was insufficient because failed attempts didn't invalidate the code.
- **Fix:** Per-OTP attempts counter (max 5); OTP is invalidated on excess. Comparison is now constant-time (`secrets.compare_digest`) to prevent timing oracles.

#### C-6 OTP generated with non-cryptographic RNG
- **File:** `app/auth/router.py`
- **Detail:** `random.randint(100000, 999999)` is predictable from seed observation.
- **Fix:** Switched to `secrets.randbelow(1_000_000)`.

#### C-7 Weak default `SECRET_KEY` & `ADMIN_REGISTRATION_KEY`
- **File:** `app/core/config.py`
- **Detail:** Defaults were `"spectrum-dev-secret-change-in-prod"` (JWT signing key) and `"spectrum-admin-secret-2025"` (admin-creation gate). If either env var was unset in production, the defaults would be used silently. JWT forgery and unauthorized admin creation would both be trivial.
- **Fix:** Backend now refuses to start in production when:
  - `SECRET_KEY` is the sentinel value, or is shorter than 32 chars.
  - `ADMIN_REGISTRATION_KEY` is the sentinel value, or is shorter than 24 chars.
- **Outstanding:** Set both env vars on the EB environment — see §4.

---

### 2.2 HIGH

#### H-1 CORS hardcoded a stale Vercel preview origin and allowed localhost in production
- **File:** `app/main.py`
- **Fix:** Origins are now derived from `FRONTEND_URL` and `ALLOWED_ORIGINS` env vars only, with no localhost defaults in production. Allowed methods and headers are explicitly enumerated instead of wildcarded.

#### H-2 Admin key comparison susceptible to timing attacks
- **File:** `app/auth/router.py` (`register_admin`, `promote_to_admin`)
- **Fix:** Replaced `!=` with `secrets.compare_digest`.

#### H-3 Missing rate limits on sensitive endpoints
- **Affected:** `/auth/register`, `/auth/otp/send`, `/auth/otp/verify`, `/auth/promote-to-admin`, `/upload/avatar`, `/upload/cover`.
- **Fix:** Per-IP rate limits applied (5–20 requests / 1–5 minutes depending on endpoint), with `Retry-After` headers on `429` responses.

#### H-4 Rate limiter blind behind the load balancer
- **File:** `app/core/rate_limit.py`
- **Detail:** Used `request.client.host`, which on the EB Classic LB resolves to the LB's internal IP — every request would share the same bucket.
- **Fix:** Limiter now reads `X-Forwarded-For` (which EB's LB safely overwrites) and falls back to the direct peer for local development.

#### H-5 Upload endpoints accepted any `image/*` / `video/*` MIME and used `ACL=public-read`
- **File:** `app/api/routers/upload_router.py`
- **Risks:**
  - Permissive MIME prefix-check let users upload e.g. `image/svg+xml` containing scripts, which browsers may render inline.
  - `ACL=public-read` is incompatible with modern S3 buckets that block ACLs, and bypasses bucket-policy-based access control.
- **Fix:**
  - Explicit MIME allowlist (`image/jpeg|png|gif|webp|svg+xml`, `video/mp4|webm|quicktime|x-msvideo`).
  - Extension allowlist & sanitization (defends against path traversal in `file.filename`).
  - `ACL` arg removed; rely on bucket policy.
  - `Content-Disposition: inline` set so the API can't be turned into a file-host for malicious binaries.

#### H-6 No security headers on either the API or the web app
- **Fix:**
  - **Backend** middleware (`app/main.py`): adds `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` to every response. Adds `Strict-Transport-Security` only in production (browsers ignore HSTS over HTTP).
  - **Frontend** (`next.config.mjs`): adds the same set globally, plus HSTS, and disables the `X-Powered-By` header.
- **Verified live:** see §3 for `curl` output.

#### H-7 No password complexity enforced on signup / reset
- **File:** `app/auth/schemas.py`
- **Fix:** `UserCreate` and `PasswordResetConfirm` now require ≥ 8 chars with at least one letter and one digit; `username` is restricted to `[A-Za-z0-9._-]`; `account_type` is enumerated.

#### H-8 `/docs` and `/redoc` exposed in production
- **File:** `app/main.py`
- **Fix:** Both are disabled when `ENVIRONMENT=production`.

#### H-9 XSS sink in AI assistant page
- **File:** `spectrum-nextjs/app/(creator)/creator/ai-assistant/page.tsx`
- **Detail:** `formatContent` interpolated raw text directly into `dangerouslySetInnerHTML`. As soon as the assistant is wired to a real LLM backend (or echoes any user-controlled string), `<script>` payloads execute.
- **Fix:** HTML-escape every line before applying the markdown-lite formatting. Only the `<strong>` substitution and the per-line `<p>` / `<br>` wrappers are produced as raw markup.

---

### 2.3 MEDIUM / hardening

| ID | Area | Issue | Fix |
|----|------|-------|-----|
| M-1 | `.gitignore` | Only `node_modules`, `.next`, `dist`, `build`, `.env` — silently allowed `.env.example`, `.env.local`, `.env.production`, `*.pem`, `*.key`. | Expanded to cover `.env.*` (with `!.env.example` carve-out), keys, certs, IDE files, build artifacts. |
| M-2 | Dependencies | `requirements.txt` left `fastapi`, `uvicorn`, `python-jose`, etc. unpinned. | Pinned to known-safe upper bounds (e.g. `fastapi>=0.110,<0.116`). |
| M-3 | Logging | `print()` statements in `main.py` and route handlers leaked DB names and stack traces. | Replaced with `logger.*` and `logger.exception`. |
| M-4 | Debug endpoint | `/auth/me/role` had a "remove after fixing" comment from a past investigation. | Reviewed — it returns only the caller's own role and is safe; comment removed and audit note added. |
| M-5 | OAuth callback cookies | `Secure` flag conditional on `ENVIRONMENT == "production"` (already correct in original code), but the env wasn't set in production. | Same code; addressed operationally by setting `ENVIRONMENT=production` (see §4). |

---

## 3. Verification — headers live in production

### Backend

```bash
$ curl -sS -I http://spectrum-connect-prod.eba-dnnmz6mt.ap-south-1.elasticbeanstalk.com/health
HTTP/1.1 200 OK
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
permissions-policy: geolocation=(), microphone=(), camera=()
```
*(HSTS is intentionally absent — it only fires once `ENVIRONMENT=production` is set and there is an HTTPS endpoint to upgrade to.)*

### Frontend

```bash
$ curl -sS -I https://spectrum-nextjs.vercel.app/
HTTP/2 200
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
# (no x-powered-by)
```

---

## 4. Outstanding actions for the dev/ops team

These items cannot be resolved from code alone and must be executed by whoever holds the AWS, MongoDB Atlas, and Google Cloud credentials. **Sequence matters — do them in this order.**

### 4.1 Rotate exposed third-party secrets (do first)

#### Google OAuth client secret
1. Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → select the production client.
2. **Reset Secret** (this invalidates `GOCSPX-REDACTED-rotate-immediately`).
3. Copy the new secret.
4. Update Elastic Beanstalk:
   ```bash
   eb setenv GOOGLE_CLIENT_SECRET="<NEW_SECRET>" --region ap-south-1
   ```

#### MongoDB Atlas
1. Atlas → Database Access → locate `nasireaglines_db_user`.
2. **Delete the user.** The cluster `rag.d74ni5g.mongodb.net` should also be reviewed — if it's still active and unused, decommission it; if it holds real data, audit Atlas access logs for unexpected reads/writes.
3. Optionally also rotate `spectrumapp` (the user currently in EB env vars) for defense in depth; it was never in git but rotating closes any uncertainty.
   - Atlas → Database Access → edit `spectrumapp` → **Edit Password**.
   - Update EB:
     ```bash
     eb setenv MONGO_URI="<NEW_FULL_URI>" --region ap-south-1
     ```

### 4.2 Configure strong production secrets on Elastic Beanstalk

The backend will refuse to start in production mode until these are set with sufficient strength. **Run this single command:**

```bash
eb setenv \
  ENVIRONMENT=production \
  SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')" \
  ADMIN_REGISTRATION_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')" \
  FRONTEND_URL=https://spectrum-nextjs.vercel.app \
  --region ap-south-1
```

Why each value:
- `ENVIRONMENT=production` — turns on HSTS, hides `/docs`, disables OTP echo, sets `Secure` cookies, and arms the startup safety checks.
- `SECRET_KEY` — the current value is 28 chars; the new minimum is 32. The startup check will exit with a clear error otherwise.
- `ADMIN_REGISTRATION_KEY` — currently unset, so the backend has been using the well-known default `spectrum-admin-secret-2025`. **Any party who knows that string can register or promote admin accounts** until this is set.
- `FRONTEND_URL` — used by the production CORS allowlist (in production we no longer ship a localhost fallback).

### 4.3 Enable HTTPS on the Elastic Beanstalk load balancer

The backend currently serves HTTP only on port 80. JWTs and OAuth cookies travel in cleartext over the public internet. To fix:

1. Provision a domain (e.g. `api.spectrumconnect.com`) and a TLS certificate via AWS Certificate Manager (us-east-1 for CloudFront, ap-south-1 for ELB — make sure it's ap-south-1 here).
2. Elastic Beanstalk console → environment → **Configuration → Load balancer** → add an **HTTPS:443** listener using the new ACM cert, terminating to instance port 8000.
3. Update the Next.js rewrite destination in `spectrum-nextjs/next.config.mjs` to use the HTTPS URL.
4. Add a DNS record (Route 53 or your DNS provider) pointing the domain at the EB CNAME.

Once HTTPS is in place, the HSTS header on the backend will start protecting clients automatically.

### 4.4 Purge the leaked secrets from git history (recommended)

The Google secret and MongoDB credentials are in commit `6ab51ac` and survive on every developer's clone and on GitHub. Even after rotation, anyone with a clone or a fork retains the old secrets. To purge:

```bash
# Install git-filter-repo (preferred over BFG for this use case)
pip install git-filter-repo

# In a fresh clone of the repo:
git filter-repo --invert-paths --path project-master-spectrum/inspect_database.py
# Then re-add inspect_database.py with the sanitized version from this audit.

# For .env.example, replace text instead of removing the file:
git filter-repo --replace-text <(cat <<'EOF'
GOCSPX-REDACTED-rotate-immediately==>REDACTED
nasireaglines_db_user:Mk9%239AvT==>REDACTED
EOF
)

# Force-push the rewritten history.
git push origin --force --all
git push origin --force --tags
```

Coordinate this with everyone who has the repo cloned — they will need to re-clone.

### 4.5 Move state to Redis once you scale beyond one instance

The in-memory OTP store and rate-limit buckets do not share across replicas. The Auto Scaling group is currently `MinSize=1`, but once it grows (peak load, blue/green, etc.), users may hit different instances on each request and see inconsistent OTP/rate-limit behavior. When that becomes a real concern:

- Provision an ElastiCache Redis instance.
- Swap `app/core/rate_limit.py` for [`fastapi-limiter`](https://github.com/long2ice/fastapi-limiter) (Redis-backed).
- Move `_otp_store` to Redis with TTL-based expiration.

### 4.6 Optional follow-ups

- Add a CSP (Content-Security-Policy) header on the frontend once you finalize the script/font/image origins (Tailwind CDN, FontAwesome, Vercel analytics, etc.). Keeping it `default-src 'self'` plus the explicit allowlist is the gold standard.
- Add automated dependency scanning (`pip-audit`, `npm audit`, Dependabot, or Snyk) to CI.
- Add structured access logging (request id, user id when authenticated, IP, status) to make incident response possible.

---

## 5. Files changed in this audit

| File | Purpose |
|------|---------|
| `.gitignore` | Strengthened to cover `.env.*`, keys, certs, IDE files, build artifacts. |
| `project-master-spectrum/.env.example` | Replaced UTF-16 file containing real secrets with sanitized UTF-8 template. |
| `project-master-spectrum/inspect_database.py` | Removed hardcoded MongoDB URI, switched to env-var lookup with explicit abort. |
| `project-master-spectrum/app/core/config.py` | Added production-mode startup safety checks for `SECRET_KEY` and `ADMIN_REGISTRATION_KEY`. |
| `project-master-spectrum/app/core/rate_limit.py` | X-Forwarded-For aware, added `Retry-After` header. |
| `project-master-spectrum/app/main.py` | Tightened CORS, added security-headers middleware, hid docs in production, replaced `print` with `logger`. |
| `project-master-spectrum/app/auth/router.py` | Removed OTP `print`s, removed `dev_otp` leak in prod, added OTP attempt counter, `secrets.compare_digest` for admin keys, rate-limited register/OTP/promote-to-admin, CSPRNG OTP generation. |
| `project-master-spectrum/app/auth/schemas.py` | Password complexity, username charset, account-type validators. |
| `project-master-spectrum/app/api/routers/upload_router.py` | MIME allowlist, extension sanitization, dropped `ACL=public-read`, added rate limits to avatar/cover. |
| `project-master-spectrum/requirements.txt` | Pinned dependency version ranges. |
| `spectrum-nextjs/next.config.mjs` | Added security headers, disabled `X-Powered-By`. |
| `spectrum-nextjs/app/(creator)/creator/ai-assistant/page.tsx` | HTML-escape before `dangerouslySetInnerHTML`. |

Commit: `69c8a4c` — "Security hardening: secrets, auth, OTP, CORS, headers, uploads"
Branch: `main`
Pushed: yes (GitHub `spectrumconnectin/spectrum-connect-full-stack-project-`).

---

## 6. Sign-off checklist for the dev team

Before sharing the URL publicly (investors / customers / testers), confirm each box:

- [ ] Google OAuth client secret rotated; new value in EB env.
- [ ] MongoDB user `nasireaglines_db_user` revoked in Atlas; access logs reviewed.
- [ ] `eb setenv ENVIRONMENT=production SECRET_KEY=... ADMIN_REGISTRATION_KEY=... FRONTEND_URL=...` executed.
- [ ] Backend redeploy after `eb setenv` succeeded; `/health` returns 200.
- [ ] HTTPS listener added on the EB load balancer; cert valid.
- [ ] `next.config.mjs` rewrite destination updated to the HTTPS backend URL.
- [ ] `curl -I https://api.<your-domain>/health` shows `strict-transport-security` header.
- [ ] Verified Google sign-in flow still works end-to-end after secret rotation.
- [ ] (Optional) Git history purged with `git filter-repo`; all clones refreshed.
- [ ] (Optional) Dependency scanning enabled in CI.

When all of the above are green, the platform is ready for public testing and investor demos at the security posture targeted by this audit.

---

*Audit conducted by Claude (Anthropic). Questions or follow-ups can be addressed by re-running the same audit prompt against this repository at any time.*
