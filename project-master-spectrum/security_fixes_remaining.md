# Security Plan Rev. 2 — Remaining Fixes

Verified against the live codebase on 2026-08-06. Of the 6 findings in the plan's
Final Vulnerability Report, 4 are confirmed fixed (route ordering in
`proposals_router.py`, undeclared escrow fields, client-trusted release amount,
escrow double-spend). These 2 are still open. Both are small, contained
changes — this doc gives you the exact diff, why it's shaped that way, and how
to prove it's fixed.

---

## 1. `/register-admin` has no rate limiter

**Severity:** HIGH
**File:** `app/auth/router.py`

### The problem

Every other sensitive endpoint in this file — `/register`, `/login`,
`/otp/send`, `/otp/verify`, `/password-reset`, even the sibling
`/promote-to-admin` — has a `Depends(rate_limiter(...))` guard. `/register-admin`
doesn't. The secret-key check itself is fine (`secrets.compare_digest`, constant-time),
but with no rate limit an attacker can throw unlimited requests at it, which
matters because it's the endpoint that mints new admin accounts.

### Current code (~line 931)

```python
@router.post("/register-admin", summary="Register admin user (requires secret key)")
async def register_admin(request: AdminRegisterRequest):
```

### The fix

Add the same dependency pattern used by `/register` (line ~171) and
`/promote-to-admin` (line ~1016) in this same file — a request body param
followed by the rate-limiter dependency:

```python
@router.post("/register-admin", summary="Register admin user (requires secret key)")
async def register_admin(
    request: AdminRegisterRequest,
    _: None = Depends(rate_limiter("register_admin_ip", limit=3, window_seconds=3600)),
):
```

That's the whole change. `rate_limiter` is already imported at the top of this
file (`from app.core.rate_limit import rate_limiter`, line 19) — no new import
needed. `limit=3, window_seconds=3600` matches the plan's own suggested value
(3 attempts/hour — tighter than the `promote_admin_ip` limiter's 5/300s since
this endpoint *creates* an admin outright, not just promotes an existing user).

### How to test

```bash
# Fire 4 rapid requests with a deliberately wrong admin_key — the 4th must 429
for i in 1 2 3 4; do
  curl -s -o /dev/null -w "attempt $i: %{http_code}\n" \
    -X POST https://<api-domain>/auth/register-admin \
    -H "Content-Type: application/json" \
    -d '{"email":"t@example.com","username":"testadmin","password":"testpass123","phone_number":"+10000000000","admin_key":"wrong-key"}'
done
```

Expect: attempts 1–3 return `403` (bad key, correctly rejected on content),
attempt 4 returns `429` (rate limited) before the key is even checked.

### Done when

- [ ] `429` lands on the 4th attempt within the hour window
- [ ] A correct `admin_key` still succeeds on attempt 1–3 (rate limiter isn't blocking legitimate use)

---

## 2. SVG uploads render inline — stored XSS

**Severity:** MEDIUM
**File:** `app/api/routers/upload_router.py`

### The problem

`image/svg+xml` is in the allowed image list (line 25). The magic-byte check
for SVG only confirms the file *looks like* XML/SVG (line 71–74) — it never
scans for `<script>` or `on*` event-handler attributes. And critically, the S3
upload sets:

```python
ContentDisposition="inline" if content_type.startswith("image/") else "attachment",
```

`image/svg+xml` starts with `"image/"`, so it gets `inline` — meaning a browser
that navigates straight to the uploaded file's S3 URL renders it as a live SVG
document, including any embedded `<script>` tag. The comment directly above
this line says the intent is to *"prevent inline rendering of potentially
dangerous content (e.g. SVG with inline JS)"* — the code just doesn't actually
carve SVG out of the `image/` branch, so today it does the opposite of what it
says.

### The fix (recommended: attachment-only, not sanitization)

Sanitizing SVG (stripping `<script>`, `on*` handlers, `javascript:` URIs, XML
entities) is a real parser problem — regex-based stripping is easy to bypass
and not worth building or trusting here. The simpler, fully-safe fix: SVGs
never render inline in a browser context, full stop. Serve them as an
attachment, like every non-image type already is.

**Current code (`_upload_to_s3`, line ~121):**

```python
def _upload_to_s3(content: bytes, folder: str, ext: str, content_type: str) -> str:
    """Upload bytes to S3 and return the public URL."""
    safe_folder = folder.replace("..", "").replace("/", "_").strip("/") or "uploads"
    key = f"{safe_folder}/{uuid.uuid4().hex}{ext}"
    s3 = boto3.client("s3", region_name=S3_REGION)
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=content,
        ContentType=content_type,
        # Use attachment for non-image types to prevent inline rendering of
        # potentially dangerous content (e.g. SVG with inline JS).
        ContentDisposition="inline" if content_type.startswith("image/") else "attachment",
        # Encrypt at rest using the bucket's default SSE-S3 key.
        ServerSideEncryption="AES256",
    )
    return f"{S3_BASE_URL}/{key}"
```

**Fixed:**

```python
def _upload_to_s3(content: bytes, folder: str, ext: str, content_type: str) -> str:
    """Upload bytes to S3 and return the public URL."""
    safe_folder = folder.replace("..", "").replace("/", "_").strip("/") or "uploads"
    key = f"{safe_folder}/{uuid.uuid4().hex}{ext}"
    s3 = boto3.client("s3", region_name=S3_REGION)
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=content,
        ContentType=content_type,
        # SVG is excluded from inline rendering even though it's an "image/"
        # type — an SVG can carry an embedded <script>, and inline is exactly
        # what lets that script execute in the viewer's browser.
        ContentDisposition=(
            "attachment" if content_type == "image/svg+xml"
            else "inline" if content_type.startswith("image/")
            else "attachment"
        ),
        # Encrypt at rest using the bucket's default SSE-S3 key.
        ServerSideEncryption="AES256",
    )
    return f"{S3_BASE_URL}/{key}"
```

One-line version if you prefer it more compact:

```python
ContentDisposition="attachment" if (content_type == "image/svg+xml" or not content_type.startswith("image/")) else "inline",
```

### A UI consequence to know about before you ship this

Anywhere the app currently `<img src>`-references an uploaded SVG expecting it
to render as a picture (e.g. a user-uploaded SVG avatar or portfolio image)
will now force-download instead of displaying. Grep the frontend for where
`profile_picture` / `cover_image` / portfolio media URLs get rendered and
confirm none of them depend on SVG rendering inline:

```bash
grep -rn "image/svg\|\.svg" spectrum-nextjs/components spectrum-nextjs/app | grep -v node_modules
```

If SVG avatars/covers are a real product need, the honest follow-up isn't to
revert this fix — it's adding a real sanitization step (e.g. Python's
`bleach` or a dedicated SVG sanitizer library) at upload time, then inline
becomes safe again. Don't half-fix this by reverting the disposition change
without adding sanitization; that reopens the vulnerability.

### How to test

```bash
# 1. A benign SVG should upload fine and download as attachment
printf '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>' > safe.svg
curl -s -X POST https://<api-domain>/upload/image \
  -H "Authorization: Bearer <token>" \
  -F "file=@safe.svg;type=image/svg+xml"
# grab the returned URL, then:
curl -sI "<returned-url>" | grep -i content-disposition
# expect: Content-Disposition: attachment

# 2. A malicious SVG must never execute when opened directly
printf '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>' > evil.svg
curl -s -X POST https://<api-domain>/upload/image \
  -H "Authorization: Bearer <token>" \
  -F "file=@evil.svg;type=image/svg+xml"
# open the returned URL directly in a real browser tab —
# it must download, never execute the alert.
```

### Done when

- [ ] Every uploaded SVG's response has `Content-Disposition: attachment`
- [ ] Opening an SVG URL directly in a browser downloads it, doesn't render/execute it
- [ ] Confirmed no existing frontend surface silently breaks from SVGs no longer rendering inline (grep above)

---

## Sign-off

| Fix | File | Status |
|---|---|---|
| `/register-admin` rate limiter | `app/auth/router.py` | ☐ |
| SVG attachment-only disposition | `app/api/routers/upload_router.py` | ☐ |

Once both are checked off, all 6 findings from the Rev. 2 vulnerability report
are closed.

Developer — name & date: _______________________
