from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List
import base64
import uuid
import os

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.auth.auth import get_current_user
from app.models.schema import User
from app.core.rate_limit import rate_limiter

router = APIRouter()

S3_BUCKET = os.getenv("S3_MEDIA_BUCKET", "spectrum-connect-media-217989999840")
S3_REGION = os.getenv("AWS_DEFAULT_REGION", "ap-south-1")
S3_BASE_URL = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com"


def _upload_to_s3(content: bytes, folder: str, original_filename: str, content_type: str) -> str:
    """Upload bytes to S3 and return the public URL."""
    ext = os.path.splitext(original_filename)[1] or ".jpg"
    key = f"{folder}/{uuid.uuid4().hex}{ext}"
    s3 = boto3.client("s3", region_name=S3_REGION)
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=content,
        ContentType=content_type,
        ACL="public-read",
    )
    return f"{S3_BASE_URL}/{key}"


@router.post("/avatar", summary="Upload profile avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a profile picture to S3 and return the public URL."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 5 MB limit")
    try:
        url = _upload_to_s3(content, "avatars", file.filename, file.content_type)
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(500, f"Upload failed: {e}")
    return {"url": url, "filename": file.filename}


@router.post("/cover", summary="Upload cover image")
async def upload_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a cover image to S3 and return the public URL."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 10 MB limit")
    try:
        url = _upload_to_s3(content, "covers", file.filename, file.content_type)
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(500, f"Upload failed: {e}")
    return {"url": url, "filename": file.filename}


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
        if not file.content_type.startswith("image/"):
            raise HTTPException(400, f"{file.filename} is not an image")
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(400, f"{file.filename} exceeds 5 MB limit")
        try:
            url = _upload_to_s3(content, "images", file.filename, file.content_type)
        except (BotoCoreError, ClientError) as e:
            raise HTTPException(500, f"Upload failed for {file.filename}: {e}")
        results.append({"filename": file.filename, "url": url})
    return results


@router.post("/videos", summary="Upload videos")
async def upload_videos(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limiter("upload_videos_ip", limit=10, window_seconds=600)),
):
    """Upload videos and return base64 data URLs."""
    if len(files) > 3:
        raise HTTPException(400, "Maximum 3 videos allowed")
    results = []
    for file in files:
        if not file.content_type.startswith("video/"):
            raise HTTPException(400, f"{file.filename} is not a video")
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(400, f"{file.filename} exceeds 50 MB limit")
        base64_data = base64.b64encode(content).decode()
        data_url = f"data:{file.content_type};base64,{base64_data}"
        results.append({"filename": file.filename, "url": data_url})
    return results
