import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.models.schema import (
    User,
    CrewProfile,
    PortfolioItem,
    Service,
    JobPost,
    Application,
    ProductionCompany,
    Connection,
    Conversation,
    Message,
    Order,
    DealMemo,
    TimeSheet,
    Review,
    Transaction,
    Wallet,
    Notification,
    Boost,
    Match,
    Workspace,
    SavedItem,
    Report,
    MiyaInteraction,
    Analytics,
    SearchHistory,
    SystemLog,
)

async def init_database():
    """Initializes the database and creates the collections."""
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
            ProductionCompany,
            Connection,
            Conversation,
            Message,
            Order,
            DealMemo,
            TimeSheet,
            Review,
            Transaction,
            Wallet,
            Notification,
            Boost,
            Match,
            Workspace,
            SavedItem,
            Report,
            MiyaInteraction,
            Analytics,
            SearchHistory,
            SystemLog,
        ],
    )
    print("Database initialized successfully.")

if __name__ == "__main__":
    asyncio.run(init_database())
