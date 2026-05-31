"""
Portfolio Router — CRUD endpoints for creator portfolio items.

Limits enforced server-side:
  • max 2 videos  (type == "video")
  • max 3 images  (type == "image")

Supported media_types:
  videos : youtube | vimeo | mp4
  images : jpg | png | webp
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from app.auth.auth import get_current_user
from app.models.schema import PortfolioItemEmbed, User

router = APIRouter()

MAX_VIDEOS = 2
MAX_IMAGES = 3

_YOUTUBE_RE = re.compile(
    r"(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_\-]{11})"
)
_VIMEO_RE = re.compile(
    r"(?:https?://)?(?:www\.)?vimeo\.com/(\d+)"
)


def _classify_url(url: str) -> tuple[str, str]:
    """Return (type, media_type) for a given URL or raise ValueError."""
    url = url.strip()
    if _YOUTUBE_RE.search(url):
        return "video", "youtube"
    if _VIMEO_RE.search(url):
        return "video", "vimeo"
    lower = url.lower().split("?")[0]
    if lower.endswith(".mp4"):
        return "video", "mp4"
    if lower.endswith(".jpg") or lower.endswith(".jpeg"):
        return "image", "jpg"
    if lower.endswith(".png"):
        return "image", "png"
    if lower.endswith(".webp"):
        return "image", "webp"
    raise ValueError(f"Unsupported URL format: {url}")


# ── Schemas ───────────────────────────────────────────────────────────────────

class PortfolioItemCreate(BaseModel):
    url: str
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    # type & media_type are derived from url — clients don't send them

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title must not be empty")
        if len(v) > 120:
            raise ValueError("title must be 120 characters or fewer")
        return v

    @field_validator("description")
    @classmethod
    def description_max_len(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) > 500:
            raise ValueError("description must be 500 characters or fewer")
        return v.strip() if v else v


class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("title must not be empty")
            if len(v) > 120:
                raise ValueError("title must be 120 characters or fewer")
        return v

    @field_validator("description")
    @classmethod
    def description_max_len(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) > 500:
            raise ValueError("description must be 500 characters or fewer")
        return v.strip() if v else v


class PortfolioItemRead(BaseModel):
    id: str
    type: str
    media_type: str
    url: str
    thumbnail: Optional[str] = None
    title: str
    description: Optional[str] = None
    created_at: datetime


class PortfolioResponse(BaseModel):
    items: list[PortfolioItemRead]
    video_count: int
    image_count: int
    max_videos: int = MAX_VIDEOS
    max_images: int = MAX_IMAGES


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_items(user: User) -> list[PortfolioItemEmbed]:
    if user.profile is None:
        return []
    return user.profile.portfolio_items or []


def _to_read(item: PortfolioItemEmbed) -> PortfolioItemRead:
    return PortfolioItemRead(
        id=item.id,
        type=item.type,
        media_type=item.media_type,
        url=item.url,
        thumbnail=item.thumbnail,
        title=item.title,
        description=item.description,
        created_at=item.created_at,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/portfolio/me", response_model=PortfolioResponse, summary="Get own portfolio")
async def get_my_portfolio(current_user: User = Depends(get_current_user)):
    items = _get_items(current_user)
    return PortfolioResponse(
        items=[_to_read(i) for i in items],
        video_count=sum(1 for i in items if i.type == "video"),
        image_count=sum(1 for i in items if i.type == "image"),
    )


@router.get("/portfolio/{user_id}", response_model=PortfolioResponse, summary="Get public portfolio")
async def get_public_portfolio(user_id: str):
    """Returns the public portfolio for any user (no auth required)."""
    from bson import ObjectId
    from bson.errors import InvalidId
    try:
        oid = ObjectId(user_id)
    except (InvalidId, Exception):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user = await User.get(oid)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    items = _get_items(user)
    return PortfolioResponse(
        items=[_to_read(i) for i in items],
        video_count=sum(1 for i in items if i.type == "video"),
        image_count=sum(1 for i in items if i.type == "image"),
    )


@router.post(
    "/portfolio/items",
    response_model=PortfolioItemRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a portfolio item",
)
async def add_portfolio_item(
    payload: PortfolioItemCreate,
    current_user: User = Depends(get_current_user),
):
    try:
        item_type, media_type = _classify_url(payload.url)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))

    items = _get_items(current_user)
    video_count = sum(1 for i in items if i.type == "video")
    image_count = sum(1 for i in items if i.type == "image")

    if item_type == "video" and video_count >= MAX_VIDEOS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Maximum {MAX_VIDEOS} videos allowed. Delete one to add another.",
        )
    if item_type == "image" and image_count >= MAX_IMAGES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Maximum {MAX_IMAGES} images allowed. Delete one to add another.",
        )

    new_item = PortfolioItemEmbed(
        id=uuid.uuid4().hex,
        type=item_type,
        media_type=media_type,
        url=payload.url.strip(),
        thumbnail=payload.thumbnail,
        title=payload.title,
        description=payload.description,
        created_at=datetime.utcnow(),
    )

    if current_user.profile is None:
        from app.models.schema import Profile
        current_user.profile = Profile()
    if current_user.profile.portfolio_items is None:
        current_user.profile.portfolio_items = []

    current_user.profile.portfolio_items.append(new_item)
    await current_user.save()
    return _to_read(new_item)


@router.put(
    "/portfolio/items/{item_id}",
    response_model=PortfolioItemRead,
    summary="Update a portfolio item (title / description / thumbnail)",
)
async def update_portfolio_item(
    item_id: str,
    payload: PortfolioItemUpdate,
    current_user: User = Depends(get_current_user),
):
    items = _get_items(current_user)
    match = next((i for i in items if i.id == item_id), None)
    if not match:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Portfolio item not found")

    if payload.title is not None:
        match.title = payload.title
    if payload.description is not None:
        match.description = payload.description
    if payload.thumbnail is not None:
        match.thumbnail = payload.thumbnail

    await current_user.save()
    return _to_read(match)


@router.delete(
    "/portfolio/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a portfolio item",
)
async def delete_portfolio_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
):
    items = _get_items(current_user)
    new_items = [i for i in items if i.id != item_id]
    if len(new_items) == len(items):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Portfolio item not found")
    current_user.profile.portfolio_items = new_items
    await current_user.save()
