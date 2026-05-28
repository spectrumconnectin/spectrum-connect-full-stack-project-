"""
Blog Service

Business logic for blog post, comment, and category management
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from beanie import PydanticObjectId
import re

from app.models.blog import BlogPost, BlogComment, BlogCategory, BlogAuthor, BlogStats
from app.models.schema import User


class BlogService:
    """Service for blog operations"""

    # ===== BLOG POST METHODS =====

    @staticmethod
    async def get_all_posts(
        status: str = "published",
        category: Optional[str] = None,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get filtered blog posts with pagination

        Args:
            status: Filter by status (published, draft, archived)
            category: Filter by category
            tag: Filter by tag
            search: Search query for title, excerpt, content
            limit: Posts per page
            offset: Pagination offset

        Returns:
            Dictionary with posts, total count, and pagination info
        """
        try:
            # Build query
            query = BlogPost.find(BlogPost.status == status)

            # Apply filters
            if category:
                query = query.find(BlogPost.category == category)

            if tag:
                query = query.find(BlogPost.tags == tag)

            if search:
                # Search in title, excerpt, and tags
                search_pattern = {"$regex": search, "$options": "i"}
                query = query.find({
                    "$or": [
                        {"title": search_pattern},
                        {"excerpt": search_pattern},
                        {"content": search_pattern},
                        {"tags": search_pattern}
                    ]
                })

            # Get total count
            total = await query.count()

            # Apply pagination and sorting
            posts = await query.sort(-BlogPost.published_at).skip(offset).limit(limit).to_list()

            # Format posts for response
            posts_data = []
            for post in posts:
                posts_data.append({
                    "id": str(post.id),
                    "slug": post.slug,
                    "title": post.title,
                    "excerpt": post.excerpt,
                    "cover_image": post.cover_image,
                    "author": {
                        "name": post.author.name,
                        "avatar": post.author.avatar,
                        "bio": post.author.bio
                    },
                    "category": post.category,
                    "tags": post.tags or [],
                    "is_featured": post.is_featured,
                    "stats": {
                        "views": post.stats.views,
                        "likes": post.stats.likes,
                        "comments_count": post.stats.comments_count,
                        "read_time_minutes": post.stats.read_time_minutes
                    },
                    "published_at": post.published_at.isoformat() if post.published_at else None,
                    "created_at": post.created_at.isoformat()
                })

            return {
                "posts": posts_data,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total
            }

        except Exception as e:
            print(f"Error in BlogService.get_all_posts: {e}")
            return {"posts": [], "total": 0, "limit": limit, "offset": offset, "has_more": False}

    @staticmethod
    async def get_post_by_slug(slug: str, increment_views: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get single post by slug, optionally increment views

        Args:
            slug: Post slug
            increment_views: Whether to increment view count

        Returns:
            Post data or None if not found
        """
        try:
            post = await BlogPost.find_one(BlogPost.slug == slug)

            if not post:
                return None

            # Increment views if requested
            if increment_views:
                post.stats.views += 1
                await post.save()

            # Get comments count
            comments_count = await BlogComment.find(
                BlogComment.post_id == post.id,
                BlogComment.status == "approved"
            ).count()

            return {
                "id": str(post.id),
                "slug": post.slug,
                "title": post.title,
                "excerpt": post.excerpt,
                "content": post.content,
                "cover_image": post.cover_image,
                "author": {
                    "name": post.author.name,
                    "avatar": post.author.avatar,
                    "bio": post.author.bio
                },
                "category": post.category,
                "tags": post.tags or [],
                "is_featured": post.is_featured,
                "stats": {
                    "views": post.stats.views,
                    "likes": post.stats.likes,
                    "comments_count": comments_count,
                    "read_time_minutes": post.stats.read_time_minutes
                },
                "seo": {
                    "meta_title": post.seo.meta_title if post.seo else None,
                    "meta_description": post.seo.meta_description if post.seo else None,
                    "keywords": post.seo.keywords if post.seo else None,
                    "og_image": post.seo.og_image if post.seo else None
                } if post.seo else None,
                "published_at": post.published_at.isoformat() if post.published_at else None,
                "created_at": post.created_at.isoformat(),
                "updated_at": post.updated_at.isoformat() if post.updated_at else None
            }

        except Exception as e:
            print(f"Error in BlogService.get_post_by_slug: {e}")
            return None

    @staticmethod
    async def create_post(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create new blog post (admin only)

        Args:
            user_id: User creating the post
            data: Post data

        Returns:
            Created post data or error
        """
        try:
            # Get user info for author
            user = await User.get(PydanticObjectId(user_id))
            if not user:
                return {"error": "User not found"}

            # Generate slug from title
            slug = BlogService.generate_slug(data.get("title", ""))

            # Ensure slug is unique
            existing_post = await BlogPost.find_one(BlogPost.slug == slug)
            if existing_post:
                slug = f"{slug}-{datetime.utcnow().timestamp()}"

            # Calculate read time
            read_time = BlogService.calculate_read_time(data.get("content", ""))

            # Create author object
            author = BlogAuthor(
                user_id=user.id,
                name=data.get("author_name", user.profile.display_name or user.username if user.profile else user.username),
                avatar=data.get("author_avatar", user.profile.profile_picture if user.profile else None),
                bio=data.get("author_bio", user.profile.bio if user.profile else None)
            )

            # Create blog post
            post = BlogPost(
                title=data["title"],
                slug=slug,
                excerpt=data["excerpt"],
                content=data["content"],
                cover_image=data["cover_image"],
                author=author,
                category=data.get("category"),
                tags=data.get("tags", []),
                status=data.get("status", "draft"),
                is_featured=data.get("is_featured", False),
                stats=BlogStats(read_time_minutes=read_time),
                published_at=datetime.utcnow() if data.get("status") == "published" else None
            )

            await post.insert()

            return {
                "success": True,
                "post": {
                    "id": str(post.id),
                    "slug": post.slug,
                    "title": post.title,
                    "status": post.status
                }
            }

        except Exception as e:
            print(f"Error in BlogService.create_post: {e}")
            return {"error": str(e)}

    @staticmethod
    async def update_post(post_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update existing blog post

        Args:
            post_id: Post ID
            data: Updated fields

        Returns:
            Success status or error
        """
        try:
            post = await BlogPost.get(PydanticObjectId(post_id))
            if not post:
                return {"error": "Post not found"}

            # Update fields
            if "title" in data:
                post.title = data["title"]
                # Regenerate slug if title changed
                post.slug = BlogService.generate_slug(data["title"])

            if "excerpt" in data:
                post.excerpt = data["excerpt"]

            if "content" in data:
                post.content = data["content"]
                # Recalculate read time
                post.stats.read_time_minutes = BlogService.calculate_read_time(data["content"])

            if "cover_image" in data:
                post.cover_image = data["cover_image"]

            if "category" in data:
                post.category = data["category"]

            if "tags" in data:
                post.tags = data["tags"]

            if "status" in data:
                post.status = data["status"]
                # Set published_at if changing to published
                if data["status"] == "published" and not post.published_at:
                    post.published_at = datetime.utcnow()

            if "is_featured" in data:
                post.is_featured = data["is_featured"]

            post.updated_at = datetime.utcnow()
            await post.save()

            return {"success": True, "message": "Post updated successfully"}

        except Exception as e:
            print(f"Error in BlogService.update_post: {e}")
            return {"error": str(e)}

    @staticmethod
    async def delete_post(post_id: str, hard_delete: bool = False) -> bool:
        """
        Delete blog post (soft or hard delete)

        Args:
            post_id: Post ID
            hard_delete: If True, permanently delete; if False, archive

        Returns:
            Success status
        """
        try:
            post = await BlogPost.get(PydanticObjectId(post_id))
            if not post:
                return False

            if hard_delete:
                # Delete associated comments
                await BlogComment.find(BlogComment.post_id == post.id).delete()
                # Delete post
                await post.delete()
            else:
                # Soft delete (archive)
                post.status = "archived"
                await post.save()

            return True

        except Exception as e:
            print(f"Error in BlogService.delete_post: {e}")
            return False

    @staticmethod
    async def toggle_like(post_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Toggle like on post

        Args:
            post_id: Post ID
            user_id: User ID (optional for guest likes)

        Returns:
            New like count and user's like status
        """
        try:
            post = await BlogPost.get(PydanticObjectId(post_id))
            if not post:
                return {"error": "Post not found"}

            # For now, just increment likes (can be enhanced with user tracking)
            post.stats.likes += 1
            await post.save()

            return {
                "success": True,
                "likes": post.stats.likes
            }

        except Exception as e:
            print(f"Error in BlogService.toggle_like: {e}")
            return {"error": str(e)}

    # ===== COMMENT METHODS =====

    @staticmethod
    async def get_comments(
        post_id: str,
        status: str = "approved",
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get comments for a blog post

        Args:
            post_id: Post ID
            status: Filter by status
            limit: Maximum comments to return

        Returns:
            List of comments
        """
        try:
            comments = await BlogComment.find(
                BlogComment.post_id == PydanticObjectId(post_id),
                BlogComment.status == status
            ).sort(BlogComment.created_at).limit(limit).to_list()

            comments_data = []
            for comment in comments:
                # Get user info if authenticated comment
                user_name = comment.guest_name
                user_avatar = None

                if comment.user_id:
                    user = await User.get(comment.user_id)
                    if user:
                        user_name = user.profile.display_name or user.username if user.profile else user.username
                        user_avatar = user.profile.profile_picture if user.profile else None

                comments_data.append({
                    "id": str(comment.id),
                    "content": comment.content,
                    "author": {
                        "name": user_name,
                        "avatar": user_avatar,
                        "is_guest": comment.user_id is None
                    },
                    "likes": comment.likes,
                    "is_pinned": comment.is_pinned,
                    "parent_comment_id": str(comment.parent_comment_id) if comment.parent_comment_id else None,
                    "created_at": comment.created_at.isoformat(),
                    "updated_at": comment.updated_at.isoformat() if comment.updated_at else None
                })

            return comments_data

        except Exception as e:
            print(f"Error in BlogService.get_comments: {e}")
            return []

    @staticmethod
    async def create_comment(
        post_id: str,
        content: str,
        user_id: Optional[str] = None,
        guest_name: Optional[str] = None,
        guest_email: Optional[str] = None,
        parent_comment_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create new comment (logged in or guest)

        Args:
            post_id: Post ID
            content: Comment content
            user_id: User ID (None for guest)
            guest_name: Guest name (if not logged in)
            guest_email: Guest email (if not logged in)
            parent_comment_id: Parent comment for nested replies

        Returns:
            Created comment data or error
        """
        try:
            # Verify post exists
            post = await BlogPost.get(PydanticObjectId(post_id))
            if not post:
                return {"error": "Post not found"}

            # Create comment
            comment = BlogComment(
                post_id=PydanticObjectId(post_id),
                user_id=PydanticObjectId(user_id) if user_id else None,
                guest_name=guest_name,
                guest_email=guest_email,
                content=content,
                status="approved",  # Auto-approve for now
                parent_comment_id=PydanticObjectId(parent_comment_id) if parent_comment_id else None,
                approved_at=datetime.utcnow()
            )

            await comment.insert()

            # Increment post comment count
            post.stats.comments_count += 1
            await post.save()

            return {
                "success": True,
                "comment": {
                    "id": str(comment.id),
                    "content": comment.content,
                    "created_at": comment.created_at.isoformat()
                }
            }

        except Exception as e:
            print(f"Error in BlogService.create_comment: {e}")
            return {"error": str(e)}

    @staticmethod
    async def moderate_comment(comment_id: str, status: str) -> bool:
        """
        Moderate comment (approve, spam, delete)

        Args:
            comment_id: Comment ID
            status: New status (approved, spam, deleted)

        Returns:
            Success status
        """
        try:
            comment = await BlogComment.get(PydanticObjectId(comment_id))
            if not comment:
                return False

            old_status = comment.status
            comment.status = status

            if status == "approved" and old_status != "approved":
                comment.approved_at = datetime.utcnow()

            await comment.save()

            # Update post comment count
            post = await BlogPost.get(comment.post_id)
            if post:
                if status == "approved" and old_status != "approved":
                    post.stats.comments_count += 1
                elif status != "approved" and old_status == "approved":
                    post.stats.comments_count = max(0, post.stats.comments_count - 1)

                await post.save()

            return True

        except Exception as e:
            print(f"Error in BlogService.moderate_comment: {e}")
            return False

    # ===== CATEGORY METHODS =====

    @staticmethod
    async def get_all_categories() -> List[Dict[str, Any]]:
        """
        Get all active blog categories

        Returns:
            List of categories with post counts
        """
        try:
            categories = await BlogCategory.find(
                BlogCategory.is_active == True
            ).sort(BlogCategory.order).to_list()

            return [
                {
                    "id": str(cat.id),
                    "name": cat.name,
                    "slug": cat.slug,
                    "description": cat.description,
                    "icon": cat.icon,
                    "color": cat.color,
                    "post_count": cat.post_count
                }
                for cat in categories
            ]

        except Exception as e:
            print(f"Error in BlogService.get_all_categories: {e}")
            return []

    # ===== UTILITY METHODS =====

    @staticmethod
    def generate_slug(title: str) -> str:
        """
        Generate URL-friendly slug from title

        Args:
            title: Post title

        Returns:
            URL-friendly slug
        """
        # Convert to lowercase
        slug = title.lower()

        # Replace spaces with hyphens
        slug = slug.replace(" ", "-")

        # Remove special characters (keep only alphanumeric and hyphens)
        slug = re.sub(r'[^a-z0-9-]', '', slug)

        # Remove multiple consecutive hyphens
        slug = re.sub(r'-+', '-', slug)

        # Remove leading/trailing hyphens
        slug = slug.strip('-')

        return slug

    @staticmethod
    def calculate_read_time(content: str) -> int:
        """
        Calculate estimated read time in minutes

        Args:
            content: Post content (HTML or text)

        Returns:
            Estimated read time in minutes
        """
        # Remove HTML tags for word count
        text = re.sub(r'<[^>]+>', '', content)

        # Count words
        words = len(text.split())

        # Assume 200 words per minute
        minutes = max(1, round(words / 200))

        return minutes

    @staticmethod
    async def search_posts(query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search posts by title, excerpt, content, tags

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            List of matching posts
        """
        try:
            search_pattern = {"$regex": query, "$options": "i"}

            posts = await BlogPost.find(
                BlogPost.status == "published",
                {
                    "$or": [
                        {"title": search_pattern},
                        {"excerpt": search_pattern},
                        {"content": search_pattern},
                        {"tags": search_pattern}
                    ]
                }
            ).sort(-BlogPost.published_at).limit(limit).to_list()

            return [
                {
                    "id": str(post.id),
                    "slug": post.slug,
                    "title": post.title,
                    "excerpt": post.excerpt,
                    "cover_image": post.cover_image
                }
                for post in posts
            ]

        except Exception as e:
            print(f"Error in BlogService.search_posts: {e}")
            return []
