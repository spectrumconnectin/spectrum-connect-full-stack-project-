import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.schema import (
    User, CrewProfile, PortfolioItem, Service, JobPost, Application,
    ProductionCompany, Connection, Conversation, Message, Order,
    DealMemo, TimeSheet, Review, Transaction, Wallet, Notification,
    Boost, Match, Workspace, SavedItem, Report, MiyaInteraction,
    Analytics, SearchHistory, SystemLog
)

MONGO_URI = "mongodb+srv://nasireaglines_db_user:Mk9%239AvT@rag.d74ni5g.mongodb.net"
DATABASE_NAME = "spectrum"

async def inspect_database():
    client = AsyncIOMotorClient(MONGO_URI)
    database = client[DATABASE_NAME]

    await init_beanie(
        database=database,
        document_models=[
            User, CrewProfile, PortfolioItem, Service, JobPost, Application,
            ProductionCompany, Connection, Conversation, Message, Order,
            DealMemo, TimeSheet, Review, Transaction, Wallet, Notification,
            Boost, Match, Workspace, SavedItem, Report, MiyaInteraction,
            Analytics, SearchHistory, SystemLog
        ]
    )

    print("=" * 80)
    print("SPECTRUM DATABASE STRUCTURE")
    print("=" * 80)
    print(f"Database: {DATABASE_NAME}")
    print(f"MongoDB URL: {MONGO_URI}\n")

    collection_names = await database.list_collection_names()
    print(f"Total Collections: {len(collection_names)}\n")
    print("-" * 80)

    document_models = {
        "users": User,
        "crew_profiles": CrewProfile,
        "portfolio_items": PortfolioItem,
        "services": Service,
        "job_posts": JobPost,
        "applications": Application,
        "production_companies": ProductionCompany,
        "connections": Connection,
        "conversations": Conversation,
        "messages": Message,
        "orders": Order,
        "deal_memos": DealMemo,
        "time_sheets": TimeSheet,
        "reviews": Review,
        "transactions": Transaction,
        "wallets": Wallet,
        "notifications": Notification,
        "boosts": Boost,
        "matches": Match,
        "workspaces": Workspace,
        "saved_items": SavedItem,
        "reports": Report,
        "miya_interactions": MiyaInteraction,
        "analytics": Analytics,
        "search_history": SearchHistory,
        "system_logs": SystemLog
    }

    for collection_name in sorted(collection_names):
        collection = database[collection_name]
        stats = await database.command("collStats", collection_name)
        count = await collection.count_documents({})

        print(f"\nCollection: {collection_name}")
        print(f"   Documents: {count}")
        print(f"   Size: {stats.get('size', 0)} bytes")
        print(f"   Storage Size: {stats.get('storageSize', 0)} bytes")

        indexes = await collection.list_indexes().to_list(None)
        if indexes:
            print(f"   Indexes ({len(indexes)}):")
            for idx in indexes:
                index_name = idx.get('name', 'unnamed')
                index_keys = list(idx.get('key', {}).keys())
                print(f"      - {index_name}: {', '.join(index_keys)}")

        if count > 0:
            sample = await collection.find_one()
            if sample:
                print(f"   Sample Document Fields:")
                for key in sorted(sample.keys()):
                    value = sample[key]
                    value_type = type(value).__name__
                    if isinstance(value, (str, int, float, bool)):
                        display_value = f" = {value}" if len(str(value)) < 50 else f" = {str(value)[:47]}..."
                    elif isinstance(value, list):
                        display_value = f" (list with {len(value)} items)"
                    elif isinstance(value, dict):
                        display_value = f" (dict with {len(value)} keys)"
                    else:
                        display_value = ""
                    print(f"      - {key}: {value_type}{display_value}")

        if collection_name in document_models:
            model = document_models[collection_name]
            print(f"   [OK] Beanie Document Model: {model.__name__}")

        print("-" * 80)

    print("\n" + "=" * 80)
    print("DATABASE INSPECTION COMPLETE")
    print("=" * 80)
    client.close()

if __name__ == "__main__":
    asyncio.run(inspect_database())