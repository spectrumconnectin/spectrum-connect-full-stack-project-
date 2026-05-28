"""
Service Business Logic Layer
Handles all service/gig operations
"""
from typing import List, Optional
from fastapi import HTTPException, status
from beanie import PydanticObjectId
from datetime import datetime
import re

from app.models.schema import Service, User, Package, Extra, Requirement, ServiceStats, Rating
from app.api.schemas.service_schemas import (
    ServiceCreate, ServiceUpdate, ServiceStatusUpdate, ServiceSearchFilters
)


class ServiceService:
    """Service management business logic"""

    @staticmethod
    def generate_slug(title: str, user_id: str) -> str:
        """Generate URL-friendly slug from title"""
        # Convert to lowercase and replace spaces with hyphens
        slug = title.lower()
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'[\s]+', '-', slug)
        slug = slug.strip('-')

        # Add user_id suffix to ensure uniqueness
        user_suffix = str(user_id)[-6:]
        slug = f"{slug}-{user_suffix}"

        return slug

    @staticmethod
    async def create_service(user: User, service_data: ServiceCreate) -> Service:
        """Create a new service/gig"""
        # Generate unique slug
        slug = ServiceService.generate_slug(service_data.title, str(user.id))

        # Check if user already has a service with similar slug
        existing = await Service.find_one({"user_id": user.id, "slug": slug})
        if existing:
            # Add timestamp to make it unique
            slug = f"{slug}-{int(datetime.utcnow().timestamp())}"

        # Convert Pydantic models to dict for Package, Extra, Requirement
        packages = [Package(**pkg.model_dump()) for pkg in service_data.packages]
        extras = [Extra(**ext.model_dump()) for ext in service_data.extras] if service_data.extras else None
        requirements = [Requirement(**req.model_dump()) for req in service_data.requirements] if service_data.requirements else None

        # Create service
        service = Service(
            user_id=user.id,
            title=service_data.title,
            slug=slug,
            description=service_data.description,
            department=service_data.department,
            role=service_data.role,
            tags=service_data.tags,
            media=service_data.media.model_dump() if service_data.media else None,
            packages=packages,
            extras=extras,
            requirements=requirements,
            stats=ServiceStats(),
            rating=Rating(),
            status="draft",  # Always start as draft
            seo=service_data.seo.model_dump() if service_data.seo else None,
        )

        await service.insert()
        return service

    @staticmethod
    async def get_service_by_id(service_id: str) -> Service:
        """Get service by ID"""
        if not PydanticObjectId.is_valid(service_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid service ID format"
            )

        service = await Service.get(service_id)
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service not found"
            )

        return service

    @staticmethod
    async def get_service_by_slug(slug: str) -> Service:
        """Get service by slug"""
        service = await Service.find_one({"slug": slug})
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service not found"
            )

        return service

    @staticmethod
    async def get_my_services(user: User, status_filter: Optional[str] = None) -> List[Service]:
        """Get all services created by the current user"""
        query = {"user_id": user.id}
        if status_filter:
            query["status"] = status_filter

        services = await Service.find(query).to_list()
        return services

    @staticmethod
    async def get_user_services(user_id: str, public_only: bool = True) -> List[Service]:
        """Get public services by a specific user"""
        if not PydanticObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID format"
            )

        query = {"user_id": PydanticObjectId(user_id)}
        if public_only:
            query["status"] = "active"

        services = await Service.find(query).to_list()
        return services

    @staticmethod
    async def update_service(service: Service, user: User, update_data: ServiceUpdate) -> Service:
        """Update service details"""
        # Verify ownership
        if service.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this service"
            )

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)

        # Handle nested objects
        if 'packages' in update_dict and update_dict['packages']:
            update_dict['packages'] = [Package(**pkg) for pkg in update_dict['packages']]

        if 'extras' in update_dict and update_dict['extras']:
            update_dict['extras'] = [Extra(**ext) for ext in update_dict['extras']]

        if 'requirements' in update_dict and update_dict['requirements']:
            update_dict['requirements'] = [Requirement(**req) for req in update_dict['requirements']]

        if 'media' in update_dict and update_dict['media']:
            update_dict['media'] = update_dict['media']

        if 'seo' in update_dict and update_dict['seo']:
            update_dict['seo'] = update_dict['seo']

        # Apply updates
        for key, value in update_dict.items():
            setattr(service, key, value)

        await service.save()
        return service

    @staticmethod
    async def update_service_status(service: Service, user: User, status_data: ServiceStatusUpdate) -> Service:
        """Update service status"""
        # Verify ownership
        if service.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this service"
            )

        # Validate status transition
        new_status = status_data.status

        # Can't activate service without packages
        if new_status == "active" and not service.packages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot activate service without at least one package"
            )

        # Update status
        service.status = new_status

        if new_status == "paused":
            service.paused_at = datetime.utcnow()
        else:
            service.paused_at = None

        await service.save()
        return service

    @staticmethod
    async def delete_service(service: Service, user: User) -> None:
        """Delete a service"""
        # Verify ownership
        if service.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this service"
            )

        # Check if service has active orders
        if service.stats.in_queue > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete service with orders in queue. Please complete or cancel them first."
            )

        await service.delete()

    @staticmethod
    async def search_services(filters: ServiceSearchFilters) -> dict:
        """Search and filter services"""
        # Build query
        query = {}

        if filters.status:
            query["status"] = filters.status

        if filters.department:
            query["department"] = filters.department

        if filters.role:
            query["role"] = filters.role

        if filters.tags:
            query["tags"] = {"$in": filters.tags}

        if filters.min_rating:
            query["rating.overall"] = {"$gte": filters.min_rating}

        # Price filter (check across all packages)
        if filters.min_price or filters.max_price:
            price_query = {}
            if filters.min_price:
                price_query["$gte"] = filters.min_price
            if filters.max_price:
                price_query["$lte"] = filters.max_price
            query["packages.price"] = price_query

        # Delivery time filter
        if filters.delivery_time:
            query["packages.delivery_time"] = {"$lte": filters.delivery_time}

        # Text search in title and description
        if filters.search:
            search_regex = {"$regex": filters.search, "$options": "i"}
            query["$or"] = [
                {"title": search_regex},
                {"description": search_regex},
                {"tags": search_regex}
            ]

        # Count total results
        total = await Service.find(query).count()

        # Sorting
        sort_field = filters.sort_by
        if sort_field == "rating":
            sort_field = "rating.overall"
        elif sort_field == "price":
            sort_field = "packages.0.price"  # Sort by first package price
        elif sort_field == "popularity":
            sort_field = "stats.orders"

        sort_direction = -1 if filters.sort_order == "desc" else 1

        # Execute query with pagination
        services = await Service.find(query).sort(
            [(sort_field, sort_direction)]
        ).skip(filters.skip).limit(filters.limit).to_list()

        return {
            "total": total,
            "skip": filters.skip,
            "limit": filters.limit,
            "services": services
        }

    @staticmethod
    async def increment_views(service_id: str) -> None:
        """Increment service view count"""
        service = await ServiceService.get_service_by_id(service_id)
        service.stats.views += 1
        await service.save()

    @staticmethod
    async def add_package(service: Service, user: User, package_data: dict) -> Service:
        """Add a package to service"""
        # Verify ownership
        if service.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to modify this service"
            )

        # Check if package limit reached (max 3)
        if len(service.packages) >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 3 packages allowed per service"
            )

        # Check if package name already exists
        package_names = [pkg.name for pkg in service.packages]
        if package_data['name'].lower() in package_names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Package '{package_data['name']}' already exists"
            )

        # Add package
        new_package = Package(**package_data)
        service.packages.append(new_package)
        await service.save()

        return service

    @staticmethod
    async def update_package(service: Service, user: User, index: int, package_data: dict) -> Service:
        """Update a package"""
        # Verify ownership
        if service.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to modify this service"
            )

        # Check index validity
        if index < 0 or index >= len(service.packages):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Package not found"
            )

        # Update package (keep the name, update other fields)
        package = service.packages[index]
        for key, value in package_data.items():
            if key != 'name':  # Don't change package name
                setattr(package, key, value)

        await service.save()
        return service

    @staticmethod
    async def delete_package(service: Service, user: User, index: int) -> Service:
        """Delete a package"""
        # Verify ownership
        if service.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to modify this service"
            )

        # Must have at least one package
        if len(service.packages) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service must have at least one package"
            )

        # Check index validity
        if index < 0 or index >= len(service.packages):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Package not found"
            )

        service.packages.pop(index)
        await service.save()

        return service
