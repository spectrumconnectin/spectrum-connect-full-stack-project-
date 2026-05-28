"""
Service/Gig Router - Fiverr-style Service Marketplace Endpoints
Film Industry specific services
"""
from fastapi import APIRouter, Depends, HTTPException, status, Path, Query, UploadFile, File, Form
from typing import List, Optional
import base64

from app.models.schema import User, Service
from app.auth.auth import get_current_user
from app.services.service_service import ServiceService
from app.api.schemas.service_schemas import (
    ServiceCreate,
    ServiceUpdate,
    ServiceRead,
    ServiceListRead,
    ServiceStatusUpdate,
    ServiceSearchFilters,
    PackageCreate,
    PackageUpdate,
    PackageRead,
)


router = APIRouter()


# Helper function to convert Beanie Service to dict
def service_to_dict(service: Service) -> dict:
    """Convert Service Beanie model to dict for Pydantic response"""
    service_dict = service.model_dump()
    service_dict['id'] = str(service.id)
    service_dict['user_id'] = str(service.user_id)
    service_dict['created_at'] = service.id.generation_time if service.id else None
    return service_dict


# ============================================================================
# SERVICE CRUD ENDPOINTS
# ============================================================================

@router.post(
    "/",
    response_model=ServiceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create new service/gig",
    description="Create a new Fiverr-style service offering. Service starts in 'draft' status."
)
async def create_service(
    service_data: ServiceCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new service/gig with packages, extras, and requirements.

    **Film Industry Departments:**
    - Camera, Sound, Lighting, Grip, Electric
    - Art Department, Costume, Makeup & Hair, VFX
    - Post-Production, Editing, Color Grading, Sound Design
    - Music Composition, Production Management
    - Directing, Producing, Cinematography
    - Scripting, Storyboarding, Animation
    - 3D Modeling, Motion Graphics

    **Example:**
    ```json
    {
        "title": "Professional Cinematography for Short Films",
        "description": "Expert cinematographer with 10 years experience...",
        "department": "Cinematography",
        "role": "Director of Photography",
        "tags": ["cinematography", "short-film", "documentary"],
        "packages": [
            {
                "name": "basic",
                "description": "1-day shoot with basic equipment",
                "price": 500,
                "delivery_time": 3,
                "revisions": 1,
                "features": ["8 hours shooting", "Basic camera package", "Raw footage delivery"]
            }
        ]
    }
    ```
    """
    service = await ServiceService.create_service(current_user, service_data)
    return service_to_dict(service)


@router.get(
    "/me",
    response_model=List[ServiceListRead],
    summary="Get my services",
    description="Get all services created by the current user"
)
async def get_my_services(
    status_filter: Optional[str] = Query(None, description="Filter by status: draft, active, paused"),
    current_user: User = Depends(get_current_user)
):
    """
    Get all your services with optional status filter.
    """
    services = await ServiceService.get_my_services(current_user, status_filter)
    return [service_to_dict(s) for s in services]


@router.get(
    "/search",
    response_model=dict,
    summary="Search/browse services",
    description="Search and filter services with pagination"
)
async def search_services(
    department: Optional[str] = Query(None, description="Filter by department"),
    role: Optional[str] = Query(None, description="Filter by role"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum rating"),
    delivery_time: Optional[int] = Query(None, gt=0, description="Max delivery days"),
    search: Optional[str] = Query(None, description="Search text"),
    skip: int = Query(0, ge=0, description="Skip N results"),
    limit: int = Query(20, ge=1, le=100, description="Limit results"),
    sort_by: str = Query("created_at", description="Sort field: created_at, rating, price, popularity, orders"),
    sort_order: str = Query("desc", description="Sort order: asc or desc")
):
    """
    Search and filter services with comprehensive options.

    **Example:**
    ```
    GET /services/search?department=Cinematography&min_rating=4&sort_by=rating&sort_order=desc
    ```

    **Returns:**
    ```json
    {
        "total": 150,
        "skip": 0,
        "limit": 20,
        "services": [...]
    }
    ```
    """
    filters = ServiceSearchFilters(
        department=department,
        role=role,
        tags=tags,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        delivery_time=delivery_time,
        search=search,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )

    result = await ServiceService.search_services(filters)
    result['services'] = [service_to_dict(s) for s in result['services']]
    return result


@router.get(
    "/user/{user_id}",
    response_model=List[ServiceListRead],
    summary="Get user's public services",
    description="Get all active services by a specific user"
)
async def get_user_services(
    user_id: str = Path(..., description="User ID")
):
    """
    Get all active (public) services created by a specific user.
    """
    services = await ServiceService.get_user_services(user_id, public_only=True)
    return [service_to_dict(s) for s in services]


@router.get(
    "/{service_id}",
    response_model=ServiceRead,
    summary="Get service by ID",
    description="Get detailed service information"
)
async def get_service(
    service_id: str = Path(..., description="Service ID")
):
    """
    Get complete service details including packages, extras, requirements, and stats.

    Also increments the view count.
    """
    service = await ServiceService.get_service_by_id(service_id)

    # Increment view count (fire and forget)
    await ServiceService.increment_views(service_id)

    return service_to_dict(service)


@router.get(
    "/slug/{slug}",
    response_model=ServiceRead,
    summary="Get service by slug",
    description="Get service by URL-friendly slug"
)
async def get_service_by_slug(
    slug: str = Path(..., description="Service slug")
):
    """
    Get service by slug (URL-friendly identifier).
    """
    service = await ServiceService.get_service_by_slug(slug)
    await ServiceService.increment_views(str(service.id))
    return service_to_dict(service)


@router.put(
    "/{service_id}",
    response_model=ServiceRead,
    summary="Update service",
    description="Update service details (owner only)"
)
async def update_service(
    service_id: str = Path(..., description="Service ID"),
    update_data: ServiceUpdate = ...,
    current_user: User = Depends(get_current_user)
):
    """
    Update service details. Only the service owner can update.
    """
    service = await ServiceService.get_service_by_id(service_id)
    updated_service = await ServiceService.update_service(service, current_user, update_data)
    return service_to_dict(updated_service)


@router.patch(
    "/{service_id}/status",
    response_model=ServiceRead,
    summary="Update service status",
    description="Change service status: draft, active, paused"
)
async def update_service_status(
    service_id: str = Path(..., description="Service ID"),
    status_data: ServiceStatusUpdate = ...,
    current_user: User = Depends(get_current_user)
):
    """
    Update service status.

    **Status transitions:**
    - `draft` → `active` (publish service)
    - `active` → `paused` (temporarily disable)
    - `paused` → `active` (re-enable)
    - Any → `draft` (unpublish)
    """
    service = await ServiceService.get_service_by_id(service_id)
    updated_service = await ServiceService.update_service_status(service, current_user, status_data)
    return service_to_dict(updated_service)


@router.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete service",
    description="Delete service (owner only, no active orders)"
)
async def delete_service(
    service_id: str = Path(..., description="Service ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a service permanently. Cannot delete if there are orders in queue.
    """
    service = await ServiceService.get_service_by_id(service_id)
    await ServiceService.delete_service(service, current_user)
    return {"message": "Service deleted successfully"}


# ============================================================================
# PACKAGE MANAGEMENT ENDPOINTS
# ============================================================================

@router.post(
    "/{service_id}/packages",
    response_model=ServiceRead,
    summary="Add package to service",
    description="Add a new pricing package (max 3 per service)"
)
async def add_package(
    service_id: str = Path(..., description="Service ID"),
    package_data: PackageCreate = ...,
    current_user: User = Depends(get_current_user)
):
    """
    Add a new package to service (Basic, Standard, or Premium).

    **Example:**
    ```json
    {
        "name": "premium",
        "description": "3-day shoot with professional equipment",
        "price": 2000,
        "delivery_time": 7,
        "revisions": 3,
        "features": [
            "24 hours shooting",
            "Full camera package",
            "2 camera operators",
            "Raw footage + edited highlights"
        ]
    }
    ```
    """
    service = await ServiceService.get_service_by_id(service_id)
    updated_service = await ServiceService.add_package(service, current_user, package_data.model_dump())
    return service_to_dict(updated_service)


@router.put(
    "/{service_id}/packages/{index}",
    response_model=ServiceRead,
    summary="Update package",
    description="Update package details by index"
)
async def update_package(
    service_id: str = Path(..., description="Service ID"),
    index: int = Path(..., ge=0, le=2, description="Package index (0-2)"),
    package_data: PackageUpdate = ...,
    current_user: User = Depends(get_current_user)
):
    """
    Update package by index (0 = first package, 1 = second, 2 = third).
    """
    service = await ServiceService.get_service_by_id(service_id)
    updated_service = await ServiceService.update_package(
        service, current_user, index, package_data.model_dump(exclude_unset=True)
    )
    return service_to_dict(updated_service)


@router.delete(
    "/{service_id}/packages/{index}",
    response_model=ServiceRead,
    summary="Delete package",
    description="Delete package by index (must keep at least 1)"
)
async def delete_package(
    service_id: str = Path(..., description="Service ID"),
    index: int = Path(..., ge=0, le=2, description="Package index (0-2)"),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a package by index. Service must have at least one package.
    """
    service = await ServiceService.get_service_by_id(service_id)
    updated_service = await ServiceService.delete_package(service, current_user, index)
    return service_to_dict(updated_service)


# ============================================================================
# SERVICE STATS & ANALYTICS
# ============================================================================

@router.get(
    "/{service_id}/stats",
    response_model=dict,
    summary="Get service statistics",
    description="Get views, orders, revenue stats"
)
async def get_service_stats(
    service_id: str = Path(..., description="Service ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Get service statistics (owner only).

    **Returns:**
    ```json
    {
        "views": 1250,
        "impressions": 5430,
        "clicks": 234,
        "orders": 45,
        "in_queue": 3,
        "completed_orders": 42,
        "cancelled_orders": 0,
        "revenue": 21500.00
    }
    ```
    """
    service = await ServiceService.get_service_by_id(service_id)

    # Verify ownership
    if service.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view these stats"
        )

    return service.stats.model_dump()


# ============================================================================
# MEDIA UPLOAD ENDPOINTS (File Upload Support)
# ============================================================================

@router.post(
    "/{service_id}/media/upload",
    response_model=dict,
    summary="Upload media files",
    description="Upload images/videos as files (stored as base64 in database)"
)
async def upload_service_media(
    service_id: str = Path(..., description="Service ID"),
    media_type: str = Form(..., description="thumbnail, image, or video"),
    file: UploadFile = File(..., description="Image or video file"),
    current_user: User = Depends(get_current_user)
):
    """
    Upload media files for a service. Files are converted to base64 and stored in database.

    **Supported formats:**
    - Images: JPEG, PNG, GIF, WebP (max 5MB)
    - Videos: MP4, MOV, AVI, WebM (max 50MB)

    **Media types:**
    - `thumbnail` - Main service thumbnail (replaces existing)
    - `image` - Add to images array (max 10 total)
    - `video` - Add to videos array (max 3 total)

    **Example Response:**
    ```json
    {
        "message": "Media uploaded successfully",
        "media_type": "thumbnail",
        "filename": "thumbnail.jpg",
        "size": 245678
    }
    ```
    """
    # Verify service ownership
    service = await ServiceService.get_service_by_id(service_id)
    if service.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload media to this service"
        )

    # Validate media type
    if media_type not in ['thumbnail', 'image', 'video']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="media_type must be 'thumbnail', 'image', or 'video'"
        )

    # Get file info
    content_type = file.content_type
    filename = file.filename

    # Validate file type
    if media_type in ['thumbnail', 'image']:
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        max_size = 5 * 1024 * 1024  # 5MB
    else:  # video
        allowed_types = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
        max_size = 50 * 1024 * 1024  # 50MB

    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    # Read file content
    file_content = await file.read()
    file_size = len(file_content)

    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: {max_size // (1024*1024)}MB"
        )

    # Convert to base64
    base64_data = base64.b64encode(file_content).decode('utf-8')

    # Create media item structure
    media_item = {
        "type": "upload",
        "data": f"data:{content_type};base64,{base64_data}",
        "filename": filename,
        "content_type": content_type
    }

    # Initialize media dict if doesn't exist
    if not service.media:
        service.media = {}

    # Add media based on type
    if media_type == 'thumbnail':
        service.media['thumbnail'] = media_item
    elif media_type == 'image':
        if 'images' not in service.media:
            service.media['images'] = []
        if len(service.media['images']) >= 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 images allowed per service"
            )
        service.media['images'].append(media_item)
    else:  # video
        if 'videos' not in service.media:
            service.media['videos'] = []
        if len(service.media['videos']) >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 3 videos allowed per service"
            )
        service.media['videos'].append(media_item)

    # Save service
    await service.save()

    return {
        "message": "Media uploaded successfully",
        "media_type": media_type,
        "filename": filename,
        "size": file_size
    }


@router.post(
    "/{service_id}/media/url",
    response_model=dict,
    summary="Add media via URL",
    description="Add images/videos via URL (stored as string)"
)
async def add_service_media_url(
    service_id: str = Path(..., description="Service ID"),
    media_type: str = Form(..., description="thumbnail, image, or video"),
    url: str = Form(..., description="Media URL"),
    current_user: User = Depends(get_current_user)
):
    """
    Add media URLs to a service.

    **Media types:**
    - `thumbnail` - Main service thumbnail (replaces existing)
    - `image` - Add to images array (max 10 total)
    - `video` - Add to videos array (max 3 total)

    **Example:**
    ```json
    {
        "media_type": "thumbnail",
        "url": "https://example.com/thumbnail.jpg"
    }
    ```
    """
    # Verify service ownership
    service = await ServiceService.get_service_by_id(service_id)
    if service.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this service"
        )

    # Validate media type
    if media_type not in ['thumbnail', 'image', 'video']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="media_type must be 'thumbnail', 'image', or 'video'"
        )

    # Create media item structure
    media_item = {
        "type": "url",
        "data": url,
        "filename": None,
        "content_type": None
    }

    # Initialize media dict if doesn't exist
    if not service.media:
        service.media = {}

    # Add media based on type
    if media_type == 'thumbnail':
        service.media['thumbnail'] = media_item
    elif media_type == 'image':
        if 'images' not in service.media:
            service.media['images'] = []
        if len(service.media['images']) >= 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 images allowed per service"
            )
        service.media['images'].append(media_item)
    else:  # video
        if 'videos' not in service.media:
            service.media['videos'] = []
        if len(service.media['videos']) >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 3 videos allowed per service"
            )
        service.media['videos'].append(media_item)

    # Save service
    await service.save()

    return {
        "message": "Media URL added successfully",
        "media_type": media_type,
        "url": url
    }


@router.delete(
    "/{service_id}/media",
    response_model=dict,
    summary="Delete media item",
    description="Delete specific media item from service"
)
async def delete_service_media(
    service_id: str = Path(..., description="Service ID"),
    media_type: str = Query(..., description="thumbnail, image, or video"),
    index: Optional[int] = Query(None, description="Index for images/videos array (not needed for thumbnail)"),
    current_user: User = Depends(get_current_user)
):
    """
    Delete media from service.

    **Examples:**
    - Delete thumbnail: `DELETE /services/{id}/media?media_type=thumbnail`
    - Delete 2nd image: `DELETE /services/{id}/media?media_type=image&index=1`
    - Delete 1st video: `DELETE /services/{id}/media?media_type=video&index=0`
    """
    # Verify service ownership
    service = await ServiceService.get_service_by_id(service_id)
    if service.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this service"
        )

    if not service.media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No media found"
        )

    # Delete based on type
    if media_type == 'thumbnail':
        if 'thumbnail' not in service.media:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No thumbnail found")
        del service.media['thumbnail']
    elif media_type in ['image', 'video']:
        if index is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"index parameter required for {media_type} deletion"
            )

        media_key = 'images' if media_type == 'image' else 'videos'
        if media_key not in service.media or not service.media[media_key]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No {media_key} found")

        if index < 0 or index >= len(service.media[media_key]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid index. Must be 0-{len(service.media[media_key])-1}"
            )

        service.media[media_key].pop(index)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="media_type must be 'thumbnail', 'image', or 'video'"
        )

    # Save service
    await service.save()

    return {
        "message": f"{media_type.capitalize()} deleted successfully"
    }
