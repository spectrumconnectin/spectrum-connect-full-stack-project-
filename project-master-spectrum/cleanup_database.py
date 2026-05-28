import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Set
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("MONGODB_DB", "spectrum-connect")

ACTIVE_COLLECTIONS: Set[str] = {
    "users", "crew_profiles", "contact_messages",
    "job_posts", "applications", "conversations", "messages",
    "message_attachments", "user_presence", "projects", "activity_logs",
    "project_deadlines", "blog_posts", "blog_comments", "blog_categories",
    "community_projects", "community_events", "forum_threads",
    "forum_posts", "collab_calls", "community_guidelines", "featured_creators",
    "transactions", "notifications", "workspaces", "miya_interactions",
}

SYSTEM_COLLECTIONS: Set[str] = {
    "system.indexes", "system.users", "system.version",
    "system.profile", "system.js",
}

async def get_all_collections(database) -> List[str]:
    return await database.list_collection_names()

async def identify_unused_collections(database) -> List[str]:
    all_collections = await get_all_collections(database)
    return [
        coll for coll in all_collections
        if coll not in SYSTEM_COLLECTIONS and coll not in ACTIVE_COLLECTIONS
    ]

async def drop_collection(database, collection_name: str) -> bool:
    try:
        await database.drop_collection(collection_name)
        return True
    except Exception as e:
        print(f"❌ Error dropping collection '{collection_name}': {e}")
        return False

async def cleanup_database(dry_run: bool = True):
    print("=" * 70)
    print("MongoDB Database Cleanup Script")
    print("=" * 70)
    print(f"Database: {DATABASE_NAME}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE (deleting collections)'}")
    print("=" * 70)
    print()

    client = AsyncIOMotorClient(MONGO_URI)
    database = client[DATABASE_NAME]

    all_collections = await get_all_collections(database)
    print(f"📊 Total collections in database: {len(all_collections)}\n")

    unused_collections = await identify_unused_collections(database)
    if not unused_collections:
        print("✅ No unused collections found! Database is clean.")
        client.close()
        return

    print(f"🗑️  Found {len(unused_collections)} unused collection(s):\n")
    for i, coll in enumerate(unused_collections, 1):
        count = await database[coll].count_documents({})
        print(f"  {i}. {coll} ({count} documents)")

    print("\n" + "=" * 70)
    if dry_run:
        print("⚠️  DRY RUN MODE - No collections were deleted")
        print("   Run with --live to actually delete these collections")
    else:
        print("🗑️  Dropping unused collections...\n")
        dropped, failed = [], []
        for coll in unused_collections:
            if await drop_collection(database, coll):
                dropped.append(coll)
                print(f"✅ Dropped: {coll}")
            else:
                failed.append(coll)
        print("\n" + "=" * 70)
        print("📊 Cleanup Summary:")
        print(f"   ✅ Successfully dropped: {len(dropped)} collection(s)")
        if failed:
            print(f"   ❌ Failed to drop: {len(failed)} collection(s)")
        print("=" * 70)

    client.close()

async def main():
    import sys
    dry_run = "--live" not in sys.argv
    if not dry_run:
        print("⚠️  LIVE MODE - Collections will be DELETED!")
        print("   Press Ctrl+C within 5 seconds to cancel...")
        try:
            await asyncio.sleep(5)
        except KeyboardInterrupt:
            print("\n❌ Cancelled by user")
            return
        print()
    await cleanup_database(dry_run=dry_run)

if __name__ == "__main__":
    asyncio.run(main())