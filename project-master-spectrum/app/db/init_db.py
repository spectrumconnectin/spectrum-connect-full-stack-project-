"""
Legacy database initialization helper.

This file is NOT used by the production app — database initialization is
handled in app/main.py via Beanie's init_beanie() call at startup.
Kept for local development convenience only.
"""
import asyncio
import logging

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.models.schema import (
    User,
    CrewProfile,
    PortfolioItem,
    Service,
    JobPost,
    Application,
    Transaction,
    Notification,
)

logger = logging.getLogger(__name__)


async def init_database():
    """Initializes the database with the core document models."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    database = client["spectrum-connect"]

    await init_beanie(
        database=database,
        document_models=[
            User,
            CrewProfile,
            PortfolioItem,
            Service,
            JobPost,
            Application,
            Transaction,
            Notification,
        ],
    )
    logger.info("Database initialized successfully.")


if __name__ == "__main__":
    asyncio.run(init_database())
