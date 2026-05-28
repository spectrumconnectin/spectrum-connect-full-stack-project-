"""
Blog API Routes

Endpoints for blog post, comment, and category management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, Dict, Any

from app.models.schema import User
from app.services.blog_service import BlogService
from app.api.schemas.blog_schemas import (
    BlogPostCreate,
    BlogPostUpdate,
    CommentCreate,
    CommentModerate,
    BlogCategoryCreate,
    BlogCategoryUpdate
)
from app.auth.auth import get_current_user

router = APIRouter(prefix="/blog", tags=["Blog"])


# ===== BLOG POST ENDPOINTS =====

@router.get("/posts")
async def get_posts(
    status: str = Query("published", description="Filter by status (draft, published, archived)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    search: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Posts per page"),
    offset: int = Query(0, ge=0, description="Pagination offset")
) -> Dict[str, Any]:
    """
    Get paginated blog posts with filters

    Query params:
    - status: draft, published, archived (default: published)
    - category: Filter by category
    - tag: Filter by tag
    - search: Search query
    - limit: Posts per page (default: 20, max: 100)
    - offset: Pagination offset (default: 0)

    Returns:
    - posts: List of blog posts
    - total: Total count
    - limit: Posts per page
    - offset: Current offset
    - has_more: Whether more posts exist
    """
    try:
        result = await BlogService.get_all_posts(
            status=status,
            category=category,
            tag=tag,
            search=search,
            limit=limit,
            offset=offset
        )

        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch posts: {str(e)}"
        )


@router.get("/posts/{slug}")
async def get_post(slug: str) -> Dict[str, Any]:
    """
    Get single blog post by slug

    Automatically increments view count

    Returns:
    - Full post data with content, author, stats, comments count
    """
    try:
        post = await BlogService.get_post_by_slug(slug, increment_views=True)

        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )

        return post

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch post: {str(e)}"
        )


@router.post("/posts")
async def create_post(
    request: BlogPostCreate,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create new blog post (admin only)

    Requires admin role

    Returns:
    - Created post data
    """
    try:
        # Check if user is admin
        if current_user.user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can create blog posts"
            )

        result = await BlogService.create_post(
            user_id=str(current_user.id),
            data=request.dict()
        )

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create post: {str(e)}"
        )


@router.patch("/posts/{post_id}")
async def update_post(
    post_id: str,
    request: BlogPostUpdate,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update blog post (admin only)

    Returns:
    - Success status
    """
    try:
        # Check if user is admin
        if current_user.user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update blog posts"
            )

        result = await BlogService.update_post(
            post_id=post_id,
            data=request.dict(exclude_unset=True)
        )

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update post: {str(e)}"
        )


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    hard_delete: bool = Query(False, description="Permanently delete (true) or archive (false)"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete blog post (admin only)

    Query params:
    - hard_delete: If true, permanently delete; if false, archive

    Returns:
    - Success status
    """
    try:
        # Check if user is admin
        if current_user.user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete blog posts"
            )

        success = await BlogService.delete_post(post_id, hard_delete=hard_delete)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )

        return {
            "success": True,
            "message": "Post deleted successfully" if hard_delete else "Post archived successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete post: {str(e)}"
        )


@router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str) -> Dict[str, Any]:
    """
    Toggle like on blog post

    Optional authentication (guest likes supported)

    Returns:
    - New like count
    """
    try:
        result = await BlogService.toggle_like(post_id)

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle like: {str(e)}"
        )


# ===== COMMENT ENDPOINTS =====

@router.get("/posts/{post_id}/comments")
async def get_comments(
    post_id: str,
    comment_status: str = Query("approved", description="Filter by status")
) -> Dict[str, Any]:
    """
    Get approved comments for a blog post

    Query params:
    - comment_status: Filter by status (approved, pending)

    Returns:
    - List of comments
    """
    try:
        comments = await BlogService.get_comments(
            post_id=post_id,
            status=comment_status
        )

        return {"comments": comments}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch comments: {str(e)}"
        )


@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    request: CommentCreate,
    current_user: Optional[User] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create comment on blog post

    Supports both authenticated and guest comments

    Returns:
    - Created comment data
    """
    try:
        # Determine if authenticated or guest
        user_id = str(current_user.id) if current_user else None

        result = await BlogService.create_comment(
            post_id=post_id,
            content=request.content,
            user_id=user_id,
            guest_name=request.guest_name,
            guest_email=request.guest_email,
            parent_comment_id=request.parent_comment_id
        )

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create comment: {str(e)}"
        )


@router.patch("/comments/{comment_id}/moderate")
async def moderate_comment(
    comment_id: str,
    request: CommentModerate,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Moderate comment (admin only)

    Actions: approve, spam, deleted

    Returns:
    - Success status
    """
    try:
        # Check if user is admin
        if current_user.user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can moderate comments"
            )

        success = await BlogService.moderate_comment(
            comment_id=comment_id,
            status=request.status
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )

        return {
            "success": True,
            "message": f"Comment {request.status} successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to moderate comment: {str(e)}"
        )


# ===== CATEGORY ENDPOINTS =====

@router.get("/categories")
async def get_categories() -> Dict[str, Any]:
    """
    Get all blog categories with post counts

    Returns:
    - List of active categories
    """
    try:
        categories = await BlogService.get_all_categories()

        return {"categories": categories}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch categories: {str(e)}"
        )


# ===== SEARCH ENDPOINT =====

@router.get("/search")
async def search_posts(
    query: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results")
) -> Dict[str, Any]:
    """
    Search blog posts by title, content, tags

    Query params:
    - query: Search query
    - limit: Maximum results (default: 10, max: 50)

    Returns:
    - List of matching posts
    """
    try:
        results = await BlogService.search_posts(query=query, limit=limit)

        return {"results": results, "query": query}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search posts: {str(e)}"
        )
