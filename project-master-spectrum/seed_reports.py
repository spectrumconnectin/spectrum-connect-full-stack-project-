"""
Seed test reports into the database.
Run from: project-master-spectrum/
Command:  python seed_reports.py
"""

import asyncio
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "spectrum")


async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database(MONGODB_DB)

    from app.models.schema import User
    from app.models.report import Report

    await init_beanie(database=db, document_models=[User, Report])

    # Find any existing users to use as reporters
    users = await User.find_all().limit(3).to_list()
    if not users:
        print("❌  No users found in DB. Register at least one user first.")
        return

    reporter_id = str(users[0].id)
    target_id   = str(users[1].id) if len(users) > 1 else str(users[0].id)

    reports = [
        Report(
            reported_by=reporter_id,
            target_type="user",
            target_id=target_id,
            reason="harassment",
            details="This user has been sending threatening messages repeatedly.",
            status="pending",
            created_at=datetime.utcnow() - timedelta(days=3),
        ),
        Report(
            reported_by=reporter_id,
            target_type="job",
            target_id="507f1f77bcf86cd799439011",
            reason="scam",
            details="Job post is asking for free work under the guise of a 'test'.",
            status="pending",
            created_at=datetime.utcnow() - timedelta(days=2),
        ),
        Report(
            reported_by=reporter_id,
            target_type="review",
            target_id="507f1f77bcf86cd799439022",
            reason="fake_profile",
            details="Reviewer left a fake 5-star review — appears to be a duplicate account.",
            status="under_review",
            assigned_to=reporter_id,
            created_at=datetime.utcnow() - timedelta(days=1),
        ),
        Report(
            reported_by=reporter_id,
            target_type="user",
            target_id=target_id,
            reason="spam",
            details="Sending mass job proposals with copy-paste content.",
            status="resolved",
            action_taken="warn",
            admin_note="User warned. First offence.",
            assigned_to=reporter_id,
            resolved_at=datetime.utcnow() - timedelta(hours=5),
            created_at=datetime.utcnow() - timedelta(days=5),
        ),
        Report(
            reported_by=reporter_id,
            target_type="message",
            target_id="507f1f77bcf86cd799439033",
            reason="inappropriate_content",
            details="User shared inappropriate images in the chat.",
            status="dismissed",
            admin_note="Content reviewed — did not violate policy.",
            assigned_to=reporter_id,
            resolved_at=datetime.utcnow() - timedelta(hours=2),
            created_at=datetime.utcnow() - timedelta(days=4),
        ),
    ]

    # Clear existing test reports first
    await Report.find_all().delete()
    print("Cleared existing reports.")

    for r in reports:
        await r.insert()

    print(f"Inserted {len(reports)} test reports:")
    print("   - 2 x pending")
    print("   - 1 x under_review")
    print("   - 1 x resolved")
    print("   - 1 x dismissed")
    print(f"\n   Reporter user: {users[0].username} ({reporter_id})")


if __name__ == "__main__":
    asyncio.run(main())
