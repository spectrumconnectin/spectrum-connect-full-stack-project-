"""
Portfolio Builder Router
========================
Rich multi-media portfolio projects + the public portfolio page aggregator,
quality score, and smart-assist endpoints.

Mounted at prefix /portfolio-builder (see main.py). The legacy flat portfolio
(/portfolio/*) remains untouched for backward compatibility.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.auth.auth import get_current_user, get_current_user_optional, get_password_hash, verify_password
from app.core.rate_limit import rate_limiter
from app.models.schema import ContentBlock, PortfolioProject, ProjectMedia, User
from app.services import portfolio_assist_service as assist
from app.services.portfolio_access_service import create_portfolio_access_token, verify_portfolio_access_token
from app.services.portfolio_quality_service import compute_quality_score
from app.api.schemas.portfolio_builder_schemas import (
    AnalyticsResponse,
    AssistBioRequest,
    AssistProjectDescriptionRequest,
    AssistProjectTitleRequest,
    AssistResponse,
    AssistSkillsSummaryRequest,
    ContentBlockCreate,
    ContentBlockRead,
    MediaReorderRequest,
    PasscodeSetRequest,
    PortfolioProjectCreate,
    PortfolioProjectRead,
    PortfolioProjectUpdate,
    ProjectListResponse,
    ProjectMediaCreate,
    ProjectMediaRead,
    ProjectReorderRequest,
    ProjectViewSummary,
    PublicPortfolioResponse,
    PublicProjectResponse,
    QualityScoreResponse,
    UnlockRequest,
    UnlockResponse,
    ViewRequest,
)

router = APIRouter()

MAX_PROJECTS = 12
MAX_MEDIA_PER_PROJECT = 10
MAX_CONTENT_BLOCKS = 40
_DAILY_VIEWS_PRUNE_THRESHOLD = 35  # prune once the map grows past this many days
_DAILY_VIEWS_RETAIN_DAYS = 30

_YOUTUBE_RE = re.compile(r"(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_\-]{11})")
_VIMEO_RE = re.compile(r"(?:https?://)?(?:www\.)?vimeo\.com/(\d+)")


def _classify_media_url(url: str) -> tuple[str, str]:
    """Classify a media URL → (type, media_type). Falls back to external link."""
    url = url.strip()
    if _YOUTUBE_RE.search(url):
        return "video", "youtube"
    if _VIMEO_RE.search(url):
        return "video", "vimeo"
    lower = url.lower().split("?")[0]
    if lower.endswith(".mp4") or lower.endswith(".webm"):
        return "video", "mp4"
    if lower.endswith((".jpg", ".jpeg")):
        return "image", "jpg"
    if lower.endswith(".png"):
        return "image", "png"
    if lower.endswith(".webp"):
        return "image", "webp"
    if lower.endswith(".gif"):
        return "image", "gif"
    if lower.endswith(".pdf"):
        return "file", "pdf"
    if lower.endswith(".doc"):
        return "file", "doc"
    if lower.endswith(".docx"):
        return "file", "docx"
    if url.startswith("http://") or url.startswith("https://"):
        return "link", "external"
    raise ValueError("URL must start with http(s) or be a supported media file")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _projects(user: User) -> list[PortfolioProject]:
    if user.profile is None:
        return []
    return user.profile.portfolio_projects or []


def _ensure_profile(user: User) -> None:
    if user.profile is None:
        from app.models.schema import Profile
        user.profile = Profile()
    if user.profile.portfolio_projects is None:
        user.profile.portfolio_projects = []


def _find_project(user: User, project_id: str) -> PortfolioProject:
    match = next((p for p in _projects(user) if p.id == project_id), None)
    if not match:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return match


def _to_read(p: PortfolioProject) -> PortfolioProjectRead:
    media = sorted(p.media or [], key=lambda m: m.order)
    blocks = sorted(p.content_blocks or [], key=lambda b: b.order)
    return PortfolioProjectRead(
        id=p.id, slug=p.slug, title=p.title, description=p.description, category=p.category,
        client=p.client, completion_date=p.completion_date, external_link=p.external_link,
        media=[ProjectMediaRead(**m.model_dump()) for m in media],
        content_blocks=[ContentBlockRead(**b.model_dump()) for b in blocks],
        cover_media_id=p.cover_media_id or (media[0].id if media else None),
        is_featured=p.is_featured, order=p.order, view_count=p.view_count,
        created_at=p.created_at, updated_at=p.updated_at,
    )


def _sorted_reads(user: User) -> list[PortfolioProjectRead]:
    return [_to_read(p) for p in sorted(_projects(user), key=lambda p: p.order)]


def _slugify(raw: str) -> str:
    """Lowercase, hyphenate — same normalization as the top-level handle slug,
    but this one has no reserved-word/global-uniqueness concept; it's scoped
    to a single owner's own project list."""
    s = (raw or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    s = re.sub(r"-{2,}", "-", s)
    return s[:80]


def _generate_project_slug(user: User, title: str, *, exclude_id: Optional[str] = None) -> str:
    """Auto-derive a per-project URL slug from the title, deduped against this
    same user's other projects (not globally unique — scoped under /portfolio/{handle}/)."""
    base = _slugify(title) or "project"
    existing = {p.slug for p in _projects(user) if p.slug and p.id != exclude_id}
    if base not in existing:
        return base
    i = 2
    while f"{base}-{i}" in existing:
        i += 1
    return f"{base}-{i}"


def _build_blocks(payloads: list[ContentBlockCreate]) -> list[ContentBlock]:
    blocks: list[ContentBlock] = []
    for i, b in enumerate(payloads):
        blocks.append(ContentBlock(
            type=b.type, text=b.text, attribution=b.attribution,
            media_id=b.media_id, before_media_id=b.before_media_id, after_media_id=b.after_media_id,
            order=i,
        ))
    return blocks


def _build_media(payload: ProjectMediaCreate, order: int) -> ProjectMedia:
    try:
        m_type, media_type = _classify_media_url(payload.url)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    return ProjectMedia(
        type=m_type, media_type=media_type, url=payload.url.strip(),
        thumbnail=payload.thumbnail, caption=payload.caption, order=order,
    )


async def _get_review_stats(user_id) -> tuple[list, int, Optional[float]]:
    """Return (reviews ≤10 newest, total, average) from Application.client_rating."""
    from app.models.schema import Application
    try:
        apps = await Application.find(Application.crew_id == user_id).to_list()
    except Exception:
        return [], 0, None
    reviews = []
    for app in apps:
        cr = app.client_rating
        if not cr:
            continue
        reviews.append({
            "overall": cr.get("overall", 0),
            "ratings": cr.get("ratings", {}),
            "review": cr.get("review", ""),
            "tags": cr.get("tags", []),
            "reviewed_at": cr.get("reviewed_at"),
        })
    total = len(reviews)
    avg = round(sum(float(r["overall"] or 0) for r in reviews) / total, 2) if total else None
    reviews.sort(key=lambda r: str(r["reviewed_at"] or ""), reverse=True)
    return reviews[:10], total, avg


def _today_str() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


async def _prune_daily_views_if_needed(user_id) -> None:
    """Best-effort cleanup: once the daily-views map grows past the threshold,
    drop entries older than the retention window. Runs as a follow-up to the
    atomic $inc, not blocking it — keeps the map bounded without a time-series
    collection."""
    try:
        doc = await User.get_motor_collection().find_one(
            {"_id": user_id}, projection={"profile.portfolio_daily_views": 1}
        )
        daily = ((doc or {}).get("profile") or {}).get("portfolio_daily_views") or {}
        if len(daily) <= _DAILY_VIEWS_PRUNE_THRESHOLD:
            return
        cutoff = (datetime.utcnow() - timedelta(days=_DAILY_VIEWS_RETAIN_DAYS)).strftime("%Y-%m-%d")
        stale = [d for d in daily if d < cutoff]
        if stale:
            await User.get_motor_collection().update_one(
                {"_id": user_id},
                {"$unset": {f"profile.portfolio_daily_views.{d}": "" for d in stale}},
            )
    except Exception:
        pass  # analytics cleanup must never break the view-count path


def _owner_summary(user: User) -> dict:
    p = user.profile
    full_name = None
    if p:
        full_name = p.display_name or f"{p.first_name or ''} {p.last_name or ''}".strip() or None
    return {
        "id": str(user.id),
        "username": user.username,
        "handle": (p.portfolio_slug if p and p.portfolio_slug else user.username),
        "display_name": full_name or user.username,
        "profile_picture": p.profile_picture if p else None,
        "portfolio_template": (p.portfolio_template if p else None) or "visual",
    }


async def _resolve_portfolio_user(username: str) -> User:
    """Resolve by clean portfolio slug first, then username. 404s if not found
    or inactive — shared by every public-facing portfolio endpoint."""
    user = await User.find_one({"profile.portfolio_slug": username})
    if not user:
        user = await User.find_one(User.username == username)
    if not user or user.deleted_at or user.is_active is False:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Portfolio not found")
    return user


def _is_unlocked(user: User, current_user: Optional[User], access_token: Optional[str]) -> bool:
    """True if the viewer may see a password-protected portfolio: owner, or a
    valid access token scoped to this owner."""
    if current_user and str(current_user.id) == str(user.id):
        return True
    if not access_token:
        return False
    return verify_portfolio_access_token(access_token) == str(user.id)


# ── Project CRUD ──────────────────────────────────────────────────────────────
# NOTE: /projects/reorder is registered BEFORE /projects/{project_id} on purpose
# (FastAPI matches in declaration order).

@router.get("/projects/me", response_model=ProjectListResponse, summary="List own portfolio projects")
async def list_my_projects(current_user: User = Depends(get_current_user)):
    return ProjectListResponse(projects=_sorted_reads(current_user), max_projects=MAX_PROJECTS)


@router.put("/projects/reorder", response_model=ProjectListResponse, summary="Reorder projects")
async def reorder_projects(
    payload: ProjectReorderRequest,
    current_user: User = Depends(get_current_user),
):
    projects = _projects(current_user)
    by_id = {p.id: p for p in projects}
    if set(payload.project_ids) != set(by_id.keys()):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "project_ids must include every existing project id exactly once")
    for idx, pid in enumerate(payload.project_ids):
        by_id[pid].order = idx
    await current_user.save()
    return ProjectListResponse(projects=_sorted_reads(current_user), max_projects=MAX_PROJECTS)


@router.post(
    "/projects",
    response_model=PortfolioProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a portfolio project",
)
async def create_project(
    payload: PortfolioProjectCreate,
    current_user: User = Depends(get_current_user),
):
    _ensure_profile(current_user)
    projects = current_user.profile.portfolio_projects
    if len(projects) >= MAX_PROJECTS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Maximum {MAX_PROJECTS} projects allowed.")

    media_payloads = payload.media or []
    if len(media_payloads) > MAX_MEDIA_PER_PROJECT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Maximum {MAX_MEDIA_PER_PROJECT} media items per project.")

    block_payloads = payload.content_blocks or []
    if len(block_payloads) > MAX_CONTENT_BLOCKS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Maximum {MAX_CONTENT_BLOCKS} content blocks per project.")

    slug = _slugify(payload.slug) if payload.slug else ""
    slug = _generate_project_slug(current_user, slug or payload.title)

    project = PortfolioProject(
        slug=slug,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        client=payload.client,
        completion_date=payload.completion_date,
        external_link=payload.external_link,
        is_featured=bool(payload.is_featured),
        media=[_build_media(m, i) for i, m in enumerate(media_payloads)],
        content_blocks=_build_blocks(block_payloads),
        order=len(projects),
    )
    projects.append(project)
    await current_user.save()
    return _to_read(project)


@router.put("/projects/{project_id}", response_model=PortfolioProjectRead, summary="Update a project")
async def update_project(
    project_id: str,
    payload: PortfolioProjectUpdate,
    current_user: User = Depends(get_current_user),
):
    project = _find_project(current_user, project_id)
    data = payload.model_dump(exclude_unset=True)
    if "cover_media_id" in data and data["cover_media_id"] is not None:
        if not any(m.id == data["cover_media_id"] for m in project.media or []):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "cover_media_id does not match any media on this project")

    # Special-case fields that need conversion/validation beyond a plain setattr.
    if "slug" in data:
        raw = data.pop("slug")
        norm = _slugify(raw) if raw else ""
        if not norm:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid slug.")
        project.slug = _generate_project_slug(current_user, norm, exclude_id=project.id)
    if "content_blocks" in data:
        blocks = data.pop("content_blocks") or []
        if len(blocks) > MAX_CONTENT_BLOCKS:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Maximum {MAX_CONTENT_BLOCKS} content blocks per project.")
        project.content_blocks = _build_blocks([ContentBlockCreate(**b) for b in blocks])

    for key, value in data.items():
        setattr(project, key, value)
    project.updated_at = datetime.utcnow()
    await current_user.save()
    return _to_read(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a project")
async def delete_project(project_id: str, current_user: User = Depends(get_current_user)):
    projects = _projects(current_user)
    remaining = [p for p in projects if p.id != project_id]
    if len(remaining) == len(projects):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    for idx, p in enumerate(sorted(remaining, key=lambda p: p.order)):
        p.order = idx
    current_user.profile.portfolio_projects = remaining
    await current_user.save()


# ── Media ─────────────────────────────────────────────────────────────────────

@router.post(
    "/projects/{project_id}/media",
    response_model=ProjectMediaRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add media to a project",
)
async def add_media(
    project_id: str,
    payload: ProjectMediaCreate,
    current_user: User = Depends(get_current_user),
):
    project = _find_project(current_user, project_id)
    if len(project.media or []) >= MAX_MEDIA_PER_PROJECT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Maximum {MAX_MEDIA_PER_PROJECT} media items per project.")
    media = _build_media(payload, len(project.media or []))
    if project.media is None:
        project.media = []
    project.media.append(media)
    project.updated_at = datetime.utcnow()
    await current_user.save()
    return ProjectMediaRead(**media.model_dump())


@router.put("/projects/{project_id}/media/reorder", summary="Reorder media within a project")
async def reorder_media(
    project_id: str,
    payload: MediaReorderRequest,
    current_user: User = Depends(get_current_user),
):
    project = _find_project(current_user, project_id)
    by_id = {m.id: m for m in project.media or []}
    if set(payload.media_ids) != set(by_id.keys()):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "media_ids must include every media id exactly once")
    for idx, mid in enumerate(payload.media_ids):
        by_id[mid].order = idx
    project.updated_at = datetime.utcnow()
    await current_user.save()
    return {"media": [ProjectMediaRead(**m.model_dump()) for m in sorted(project.media, key=lambda m: m.order)]}


@router.delete(
    "/projects/{project_id}/media/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a media item",
)
async def delete_media(
    project_id: str,
    media_id: str,
    current_user: User = Depends(get_current_user),
):
    project = _find_project(current_user, project_id)
    media = project.media or []
    remaining = [m for m in media if m.id != media_id]
    if len(remaining) == len(media):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media item not found")
    for idx, m in enumerate(sorted(remaining, key=lambda m: m.order)):
        m.order = idx
    project.media = remaining
    if project.cover_media_id == media_id:
        project.cover_media_id = remaining[0].id if remaining else None
    project.updated_at = datetime.utcnow()
    await current_user.save()


# ── Quality score ─────────────────────────────────────────────────────────────

@router.get("/quality-score", response_model=QualityScoreResponse, summary="Own portfolio quality score")
async def get_quality_score(current_user: User = Depends(get_current_user)):
    _, total, avg = await _get_review_stats(current_user.id)
    return QualityScoreResponse(**compute_quality_score(current_user, _projects(current_user), total, avg))


# ── Portfolio slug (clean public handle) ──────────────────────────────────────

_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$")
_RESERVED_SLUGS = {
    "portfolio", "admin", "api", "backend", "blog", "login", "signup", "signin",
    "creator", "client", "about", "pricing", "help", "how-it-works", "community",
    "settings", "dashboard", "search", "explore", "new", "edit", "me", "null",
    "undefined", "spectrum", "support", "contact", "terms", "privacy", "icons",
}


def _normalize_slug(raw: str) -> str:
    s = (raw or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    s = re.sub(r"-{2,}", "-", s)
    return s[:30]


async def _slug_available(slug: str, *, exclude_user_id) -> bool:
    """A slug is free if no OTHER user uses it as their portfolio_slug or username."""
    clash = await User.find_one({
        "$and": [
            {"_id": {"$ne": exclude_user_id}},
            {"$or": [{"profile.portfolio_slug": slug}, {"username": slug}]},
        ]
    })
    return clash is None


@router.get("/slug/check", summary="Check portfolio handle availability")
async def check_slug(slug: str, current_user: User = Depends(get_current_user)):
    norm = _normalize_slug(slug)
    if not _SLUG_RE.match(norm):
        return {"slug": norm, "available": False, "reason": "3–30 chars, letters/numbers/hyphens only."}
    if norm in _RESERVED_SLUGS:
        return {"slug": norm, "available": False, "reason": "That handle is reserved."}
    ok = await _slug_available(norm, exclude_user_id=current_user.id)
    return {"slug": norm, "available": ok, "reason": None if ok else "That handle is already taken."}


@router.post("/slug", summary="Set the portfolio handle")
async def set_slug(
    body: dict,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(rate_limiter("pb_slug", limit=20, window_seconds=300)),
):
    norm = _normalize_slug(body.get("slug", ""))
    if not _SLUG_RE.match(norm):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Handle must be 3–30 characters: letters, numbers, hyphens.")
    if norm in _RESERVED_SLUGS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That handle is reserved.")
    if not await _slug_available(norm, exclude_user_id=current_user.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "That handle is already taken.")
    _ensure_profile(current_user)
    current_user.profile.portfolio_slug = norm
    await current_user.save()
    return {"slug": norm}


# ── Public aggregator ─────────────────────────────────────────────────────────

@router.get(
    "/public/{username}",
    response_model=PublicPortfolioResponse,
    response_model_exclude_none=True,
    summary="Public portfolio page payload (one call)",
)
async def get_public_portfolio(
    username: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_portfolio_access: Optional[str] = Header(None, alias="X-Portfolio-Access"),
):
    user = await _resolve_portfolio_user(username)

    p = user.profile
    is_owner = bool(current_user and str(current_user.id) == str(user.id))
    published = bool(p.portfolio_published) if p and p.portfolio_published is not None else True

    if not published and not is_owner:
        return PublicPortfolioResponse(published=False)

    if p and p.portfolio_access == "password" and not _is_unlocked(user, current_user, x_portfolio_access):
        return PublicPortfolioResponse(published=True, locked=True)

    reviews, total, avg = await _get_review_stats(user.id)

    quality = None
    if is_owner:
        quality = QualityScoreResponse(**compute_quality_score(user, _projects(user), total, avg))

    sid = getattr(user, "spectrum_id", None)
    full_name = None
    if p:
        full_name = p.display_name or f"{p.first_name or ''} {p.last_name or ''}".strip() or None

    return PublicPortfolioResponse(
        published=published,
        user={
            "id": str(user.id),
            "username": user.username,
            "is_verified": user.is_verified,
            "spectrum_tier": getattr(sid, "tier", None) if sid else None,
        },
        profile={
            "display_name": full_name or user.username,
            "profile_picture": p.profile_picture if p else None,
            "cover_image": p.cover_image if p else None,
            "bio": p.bio if p else None,
            "tagline": p.tagline if p else None,
            "headline": p.headline if p else None,
            "location": p.location.model_dump() if p and p.location else None,
            "website": p.website if p else None,
            "social_links": p.social_links.model_dump() if p and p.social_links else None,
            "skills": [s.model_dump() for s in (p.skills or [])] if p else [],
            "hourly_rate_min": p.hourly_rate_min if p else None,
            "hourly_rate_max": p.hourly_rate_max if p else None,
            "rating": p.rating if p else None,
            "review_count": p.review_count if p else None,
            "portfolio_template": (p.portfolio_template if p else None) or "visual",
            "portfolio_slug": (p.portfolio_slug if p else None),
            "handle": (p.portfolio_slug if p and p.portfolio_slug else user.username),
        },
        experience=[e.model_dump() for e in (p.experience or [])] if p else [],
        education=[e.model_dump() for e in (p.education or [])] if p else [],
        certifications=[c.model_dump() for c in (p.certifications or [])] if p else [],
        projects=_sorted_reads(user),
        reviews={"reviews": reviews, "total": total, "average": avg},
        quality_score=quality,
    )


@router.get(
    "/public/{username}/projects/{slug}",
    response_model=PublicProjectResponse,
    response_model_exclude_none=True,
    summary="Public single-project case-study page",
)
async def get_public_project(
    username: str,
    slug: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_portfolio_access: Optional[str] = Header(None, alias="X-Portfolio-Access"),
):
    user = await _resolve_portfolio_user(username)
    p = user.profile
    is_owner = bool(current_user and str(current_user.id) == str(user.id))
    published = bool(p.portfolio_published) if p and p.portfolio_published is not None else True

    if not published and not is_owner:
        return PublicProjectResponse(published=False)
    if p and p.portfolio_access == "password" and not _is_unlocked(user, current_user, x_portfolio_access):
        return PublicProjectResponse(published=True, locked=True)

    project = next(
        (proj for proj in _projects(user) if proj.slug == slug or proj.id == slug),
        None,
    )
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    return PublicProjectResponse(published=True, owner=_owner_summary(user), project=_to_read(project))


# ── Analytics ──────────────────────────────────────────────────────────────────

@router.post("/public/{username}/view", summary="Record a portfolio (and optionally project) view")
async def record_view(username: str, payload: ViewRequest):
    """Best-effort atomic view counter. Never raises — a tracking failure must
    never break the page for a reader."""
    try:
        user = await _resolve_portfolio_user(username)
    except HTTPException:
        return {"ok": False}
    try:
        today = _today_str()
        await User.get_motor_collection().update_one(
            {"_id": user.id},
            {"$inc": {
                "profile.portfolio_total_views": 1,
                f"profile.portfolio_daily_views.{today}": 1,
            }},
        )
        if payload.project_slug:
            # Legacy projects created before slugs existed have no `slug` — fall
            # back to matching by `id` (mirrors the same slug-or-id lookup used
            # to resolve the project in get_public_project).
            await User.get_motor_collection().update_one(
                {"_id": user.id},
                {"$inc": {"profile.portfolio_projects.$[proj].view_count": 1}},
                array_filters=[{"$or": [{"proj.slug": payload.project_slug}, {"proj.id": payload.project_slug}]}],
            )
        await _prune_daily_views_if_needed(user.id)
        return {"ok": True}
    except Exception:
        return {"ok": False}


@router.get("/analytics", response_model=AnalyticsResponse, summary="Own portfolio view analytics")
async def get_analytics(current_user: User = Depends(get_current_user)):
    p = current_user.profile
    daily = (p.portfolio_daily_views or {}) if p else {}
    last_7 = sorted(daily.keys())[-7:]
    this_week = sum(daily.get(d, 0) for d in last_7)

    top = sorted(_projects(current_user), key=lambda proj: proj.view_count, reverse=True)[:5]
    return AnalyticsResponse(
        total_views=(p.portfolio_total_views if p else 0) or 0,
        this_week_views=this_week,
        top_projects=[ProjectViewSummary(title=proj.title, slug=proj.slug, view_count=proj.view_count) for proj in top],
    )


# ── Sharing controls (password-protected portfolios) ────────────────────────────

@router.post("/passcode", summary="Set portfolio access mode (public/password)")
async def set_passcode(
    payload: PasscodeSetRequest,
    current_user: User = Depends(get_current_user),
):
    _ensure_profile(current_user)
    if payload.access == "password":
        if payload.passcode:
            current_user.profile.portfolio_passcode_hash = get_password_hash(payload.passcode)
        elif not current_user.profile.portfolio_passcode_hash:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "A passcode is required to enable password protection.")
        current_user.profile.portfolio_access = "password"
    else:
        current_user.profile.portfolio_access = "public"
        current_user.profile.portfolio_passcode_hash = None
    await current_user.save()
    return {"access": current_user.profile.portfolio_access}


@router.post(
    "/public/{username}/unlock",
    response_model=UnlockResponse,
    summary="Unlock a password-protected portfolio",
)
async def unlock_portfolio(
    username: str,
    payload: UnlockRequest,
    _rl: None = Depends(rate_limiter("pb_unlock", limit=10, window_seconds=300)),
):
    user = await _resolve_portfolio_user(username)
    p = user.profile
    if not p or p.portfolio_access != "password" or not p.portfolio_passcode_hash:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This portfolio is not password-protected.")
    if not verify_password(payload.passcode, p.portfolio_passcode_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect passcode.")
    return UnlockResponse(token=create_portfolio_access_token(str(user.id)))


# ── Smart assist ──────────────────────────────────────────────────────────────

@router.post("/assist/bio", response_model=AssistResponse, summary="Improve bio")
async def assist_bio(
    payload: AssistBioRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(rate_limiter("pb_assist", limit=30, window_seconds=300)),
):
    return AssistResponse(suggestions=assist.improve_bio(
        payload.current_text or "",
        role=payload.role, years_experience=payload.years_experience, skills=payload.skills,
    ))


@router.post("/assist/project-description", response_model=AssistResponse, summary="Improve project description")
async def assist_project_description(
    payload: AssistProjectDescriptionRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(rate_limiter("pb_assist", limit=30, window_seconds=300)),
):
    return AssistResponse(suggestions=assist.improve_project_description(
        payload.current_text or "",
        project_title=payload.project_title, category=payload.category, client=payload.client,
    ))


@router.post("/assist/project-title", response_model=AssistResponse, summary="Improve project title")
async def assist_project_title(
    payload: AssistProjectTitleRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(rate_limiter("pb_assist", limit=30, window_seconds=300)),
):
    return AssistResponse(suggestions=assist.improve_project_title(
        payload.current_text or "", category=payload.category,
    ))


@router.post("/assist/skills-summary", response_model=AssistResponse, summary="Generate skills summary")
async def assist_skills_summary(
    payload: AssistSkillsSummaryRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(rate_limiter("pb_assist", limit=30, window_seconds=300)),
):
    return AssistResponse(suggestions=assist.improve_skills_summary(
        skills=payload.skills, role=payload.role,
    ))
