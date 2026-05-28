from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List
import base64
import uuid
import os
from pathlib import Path

from app.auth.auth import get_current_user
from app.models.schema import User
from app.core.rate_limit import rate_limiter

router = APIRouter()

STORAGE_DIR = Path(__file__).resolve().parents[3] / "storage"
STORAGE_DIR.mkdir(exist_ok=True)
(STORAGE_DIR / "avatars").mkdir(exist_ok=True)
(STORAGE_DIR / "covers").mkdir(exist_ok=True)
(STORAGE_DIR / "images").mkdir(exist_ok=True)

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")


def _save_file(content: bytes, folder: str, original_filename: str) -> str:
    ext = Path(original_filename).suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = STORAGE_DIR / folder / filename
    dest.write_bytes(content)
    return f"{BASE_URL}/storage/{folder}/{filename}"


@router.post("/avatar", summary="Upload profile avatar (saved locally)")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a profile picture. Saved to storage/avatars/ and returns a URL."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 5MB limit")
    url = _save_file(content, "avatars", file.filename)
    return {"url": url, "filename": file.filename}


@router.post("/cover", summary="Upload cover image (saved locally)")
async def upload_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a cover image. Saved to storage/covers/ and returns a URL."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 10MB limit")
    url = _save_file(content, "covers", file.filename)
    return {"url": url, "filename": file.filename}


@router.post("/images", summary="Upload images (returns local URLs)")
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limiter("upload_images_ip", limit=20, window_seconds=300)),
):
    """Upload up to 10 images. Saved locally and returns URLs."""
    if len(files) > 10:
        raise HTTPException(400, "Maximum 10 images allowed")
    results = []
    for file in files:
        if not file.content_type.startswith("image/"):
            raise HTTPException(400, f"{file.filename} is not an image")
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(400, f"{file.filename} exceeds 5MB limit")
        url = _save_file(content, "images", file.filename)
        results.append({"filename": file.filename, "url": url})
    return results

@router.post("/videos", summary="Upload videos")
async def upload_videos(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limiter("upload_videos_ip", limit=10, window_seconds=600)),
):
    """
    Upload videos and return base64 data URLs.

    Note: Authentication is required even in dev to reduce abuse surface.
    """
    if len(files) > 3:
        raise HTTPException(400, "Maximum 3 videos allowed")
    
    results = []
    for file in files:
        if not file.content_type.startswith('video/'):
            raise HTTPException(400, f"{file.filename} is not a video")
        
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(400, f"{file.filename} exceeds 50MB limit")
        
        base64_data = base64.b64encode(content).decode()
        data_url = f"data:{file.content_type};base64,{base64_data}"
        results.append({"filename": file.filename, "url": data_url})
    
    return results
