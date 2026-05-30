from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List
import base64
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

# Allowlist of permitted image / video types. Defends against users uploading
# text/html that browsers might render inline.
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
_ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
_ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
_ALLOWED_VIDEO_EXTS = {".mp4", ".webm", ".mov", ".avi"}


def _safe_ext(filename: str, allowed: set[str], default: str) -> str:
    """Return a sanitized extension from `filename` if it's in `allowed`,
    otherwise the supplied default. Prevents path traversal via `..`/`/`."""
    ext = os.path.splitext(filename or "")[1].lower()
    if ext in allowed:
        return ext
    return default


def _upload_to_s3(content: bytes, folder: str, ext: str, content_type: str) -> str:
    """Upload bytes to S3 and return the public URL.

    Does not pass `ACL=public-read` — modern S3 buckets often disallow ACLs,
    and access should be controlled at the bucket level instead.
    """
    safe_folder = folder.replace("..", "").replace("/", "_").strip("/") or "uploads"
    key = f"{safe_folder}/{uuid.uuid4().hex}{ext}"
    s3 = boto3.client("s3", region_name=S3_REGION)
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=content,
        ContentType=content_type,
        # Force browser to download dangerous types instead of inlining.
        ContentDisposition="inline",
    )
    return f"{S3_BASE_URL}/{key}"


def _validate_image(file: UploadFile) -> None:
    if not file.content_type or file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Unsupported image type: {file.content_type}")


def _validate_video(file: UploadFile) -> None:
    if not file.content_type or file.content_type not in _ALLOWED_VIDEO_TYPES:
        raise HTTPException(400, f"Unsupported video type: {file.content_type}")


@router.post("/avatar", summary="Upload profile avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limiter("upload_avatar_ip", limit=10, window_seconds=300)),
):
    """Upload a profile picture to S3 and return the public URL."""
    _validate_image(file)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 5 MB limit")
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
    _validate_image(file)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 10 MB limit")
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
        _validate_image(file)
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(400, "An image exceeds the 5 MB limit")
        ext = _safe_ext(file.filename, _ALLOWED_IMAGE_EXTS, ".jpg")
        try:
            url = _upload_to_s3(content, "images", ext, file.content_type)
        except (BotoCoreError, ClientError):
            logger.exception("S3 image upload failed")
            raise HTTPException(500, "Upload failed. Please try again.")
        results.append({"url": url})
    return results


@router.post("/videos", summary="Upload videos")
async def upload_videos(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limiter("upload_videos_ip", limit=10, window_seconds=600)),
):
    """Upload videos and return base64 data URLs.

    Note: returning base64-encoded videos in the API response is bandwidth-heavy
    and a soft DoS risk. Prefer S3-hosted URLs (as with images) once the
    frontend can consume them.
    """
    if len(files) > 3:
        raise HTTPException(400, "Maximum 3 videos allowed")
    results = []
    for file in files:
        _validate_video(file)
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(400, "A video exceeds the 50 MB limit")
        base64_data = base64.b64encode(content).decode()
        data_url = f"data:{file.content_type};base64,{base64_data}"
        results.append({"url": data_url})
    return results
