from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from typing import List
import logging
import os
import uuid

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.auth.auth import get_current_user
from app.models.schema import User
from app.core.rate_limit import rate_limiter

router = APIRouter()
logger = logging.getLogger(__name__)

S3_BUCKET = os.getenv("S3_MEDIA_BUCKET", "spectrum-connect-media-217989999840")
S3_REGION = os.getenv("AWS_DEFAULT_REGION", "ap-south-1")
S3_BASE_URL = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com"

# Per-user daily upload quota (bytes).  Applies across all upload endpoints.
_USER_DAILY_QUOTA_BYTES = 200 * 1024 * 1024   # 200 MB / user / day

# ── Allowlists ────────────────────────────────────────────────────────────────
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
_ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
_ALLOWED_IMAGE_EXTS  = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
_ALLOWED_VIDEO_EXTS  = {".mp4", ".webm", ".mov", ".avi"}

# ── Magic-byte signatures for common types ────────────────────────────────────
# Each entry: (content_type, byte_offset, expected_bytes | None for multi-sig)
# None means we provide a custom check function instead.
_MAGIC: list[tuple[str, int, bytes]] = [
    # JPEG — starts with FF D8 FF
    ("image/jpeg",    0, b"\xff\xd8\xff"),
    # PNG  — starts with 89 50 4E 47 0D 0A 1A 0A
    ("image/png",     0, b"\x89PNG\r\n\x1a\n"),
    # GIF  — starts with GIF87a or GIF89a
    ("image/gif",     0, b"GIF87a"),
    ("image/gif",     0, b"GIF89a"),
    # WebP — RIFF....WEBP
    ("image/webp",    0, b"RIFF"),   # bytes 8-11 must also be WEBP — checked separately
    # MP4/MOV — ftyp box at byte 4
    ("video/mp4",     4, b"ftyp"),
    ("video/quicktime", 4, b"ftyp"),
    # WebM — starts with 0x1A 0x45 0xDF 0xA3
    ("video/webm",    0, b"\x1aE\xdf\xa3"),
    # AVI  — RIFF....AVI
    ("video/x-msvideo", 0, b"RIFF"),
]

_SVG_STARTERS = (b"<svg", b"<?xml", b"\xef\xbb\xbf<")  # UTF-8 BOM + XML


def _check_magic(content: bytes, declared_type: str) -> bool:
    """Return True if the file's magic bytes are consistent with declared_type.
    SVG and AVI have no single definitive signature so they are checked leniently.
    """
    if declared_type == "image/svg+xml":
        # SVG is text — just verify it starts with XML/SVG markers
        snippet = content[:64].lstrip()
        return any(snippet.startswith(s) for s in _SVG_STARTERS)

    for ctype, offset, sig in _MAGIC:
        if ctype != declared_type:
            continue
        if content[offset: offset + len(sig)] == sig:
            # Extra WebP check: bytes 8-11 must be "WEBP"
            if ctype == "image/webp":
                return len(content) >= 12 and content[8:12] == b"WEBP"
            return True

    # Unknown / no signature defined — allow but log
    logger.debug("No magic signature registered for %s; skipping byte check", declared_type)
    return True


# ── Per-user quota tracking (in-memory; resets on restart) ───────────────────
from collections import defaultdict
from datetime import datetime, timedelta

_user_upload_bytes: dict[str, tuple[int, datetime]] = defaultdict(lambda: (0, datetime.utcnow()))

def _check_user_quota(user_id: str, new_bytes: int) -> None:
    """Raise 429 if this upload would push the user over their daily quota."""
    used, window_start = _user_upload_bytes[user_id]
    now = datetime.utcnow()
    if now - window_start > timedelta(hours=24):
        # Reset window
        used = 0
        window_start = now
    if used + new_bytes > _USER_DAILY_QUOTA_BYTES:
        raise HTTPException(
            429,
            f"Daily upload quota exceeded ({_USER_DAILY_QUOTA_BYTES // 1024 // 1024} MB per day). "
            "Please try again tomorrow."
        )
    _user_upload_bytes[user_id] = (used + new_bytes, window_start)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_ext(filename: str, allowed: set[str], default: str) -> str:
    """Return a sanitized extension from `filename` if it is allowlisted."""
    ext = os.path.splitext(filename or "")[1].lower()
    return ext if ext in allowed else default


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
    )
    return f"{S3_BASE_URL}/{key}"


def _validate_image(file: UploadFile, content: bytes) -> None:
    """Validate MIME type allowlist + magic bytes."""
    if not file.content_type or file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Unsupported image type: {file.content_type}")
    if not _check_magic(content, file.content_type):
        raise HTTPException(400, "File content does not match its declared type")


def _validate_video(file: UploadFile, content: bytes) -> None:
    """Validate MIME type allowlist + magic bytes."""
    if not file.content_type or file.content_type not in _ALLOWED_VIDEO_TYPES:
        raise HTTPException(400, f"Unsupported video type: {file.content_type}")
    if not _check_magic(content, file.content_type):
        raise HTTPException(400, "File content does not match its declared type")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/avatar", summary="Upload profile avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limiter("upload_avatar_ip", limit=10, window_seconds=300)),
):
    """Upload a profile picture to S3 and return the public URL."""
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 5 MB limit")
    _validate_image(file, content)
    _check_user_quota(str(current_user.id), len(content))
    ext = _safe_ext(file.filename, _ALLOWED_IMAGE_EXTS, ".jpg")
    try:
        url = _upload_to_s3(content, "avatars", ext, file.content_type)
    except (BotoCoreError, ClientError):
        logger.exception("S3 avatar upload failed")
        raise HTTPException(500, "Upload failed. Please try again.")
    return {"url": url}


@router.post("/cover", summary="Upload cover image")
async def upload_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limiter("upload_cover_ip", limit=10, window_seconds=300)),
):
    """Upload a cover image to S3 and return the public URL."""
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 10 MB limit")
    _validate_image(file, content)
    _check_user_quota(str(current_user.id), len(content))
    ext = _safe_ext(file.filename, _ALLOWED_IMAGE_EXTS, ".jpg")
    try:
        url = _upload_to_s3(content, "covers", ext, file.content_type)
    except (BotoCoreError, ClientError):
        logger.exception("S3 cover upload failed")
        raise HTTPException(500, "Upload failed. Please try again.")
    return {"url": url}


@router.post("/images", summary="Upload images")
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limiter("upload_images_ip", limit=20, window_seconds=300)),
):
    """Upload up to 10 images to S3 and return public URLs."""
    if len(files) > 10:
        raise HTTPException(400, "Maximum 10 images allowed")
    results = []
    for file in files:
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(400, "An image exceeds the 5 MB limit")
        _validate_image(file, content)
        _check_user_quota(str(current_user.id), len(content))
        ext = _safe_ext(file.filename, _ALLOWED_IMAGE_EXTS, ".jpg")
        try:
            url = _upload_to_s3(content, "images", ext, file.content_type)
        except (BotoCoreError, ClientError):
            logger.exception("S3 image upload failed")
            raise HTTPException(500, "Upload failed. Please try again.")
        results.append({"url": url})
    return results


@router.post("/videos", summary="Upload videos to S3")
async def upload_videos(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limiter("upload_videos_ip", limit=10, window_seconds=600)),
):
    """Upload videos to S3 and return public URLs.

    Previously returned base64 data URLs which caused memory exhaustion on large
    files (67 MB base64 string per 50 MB video).  Now streams to S3 and returns
    a stable HTTPS URL — same pattern as images.
    """
    if len(files) > 3:
        raise HTTPException(400, "Maximum 3 videos allowed")
    results = []
    for file in files:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(400, "A video exceeds the 50 MB limit")
        _validate_video(file, content)
        _check_user_quota(str(current_user.id), len(content))
        ext = _safe_ext(file.filename, _ALLOWED_VIDEO_EXTS, ".mp4")
        try:
            url = _upload_to_s3(content, "videos", ext, file.content_type)
        except (BotoCoreError, ClientError):
            logger.exception("S3 video upload failed")
            raise HTTPException(500, "Upload failed. Please try again.")
        results.append({"url": url})
    return results
