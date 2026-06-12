"""
Back the seed creators' headline ratings with real review records.
====================================================================
Each seed creator was created with a `rating` and `review_count` (e.g. 4.8 /
14 reviews), but the profile's star-distribution histogram and reviews list
read from actual review documents — which didn't exist, so every bar showed 0.

This script creates `review_count` review records per seed creator (Application
docs with `client_rating` set), with the star scores distributed so their mean
matches the displayed rating. It also sets stats.completed_credits so the
"Completed" card reflects the same number.

Reviews are stamped `seed_account: True` for clean removal:
    db.applications.deleteMany({ seed_account: true })

Idempotent: skips any creator that already has seed reviews.

Run (production):
    MONGO_URI="<atlas uri>" MONGODB_DB="spectrum-connect" python scripts/seed_reviews.py
"""

import os
import sys
import random
from datetime import datetime, timedelta

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

random.seed(7)  # deterministic output across runs

# Review text pools — written to read like real, specific client feedback.
GENERIC = [
    "Absolute professional. Clear communication, delivered ahead of schedule, and the quality exceeded what we expected.",
    "Great experience from start to finish. Understood the brief immediately and needed barely any revisions.",
    "Really easy to work with and genuinely talented. Will definitely hire again for our next project.",
    "Delivered exactly what we asked for and then some. Responsive, organized, and a real pro.",
    "Fantastic work and a smooth process. Kept us updated the whole way and hit every deadline.",
    "Exceeded expectations. The final result got great feedback from our whole team.",
    "Reliable, creative, and detail-oriented. Made the whole project stress-free.",
    "Quick to respond and very receptive to feedback. The end result was polished and on-brand.",
]
ROLE_SPECIFIC = {
    "video": [
        "The edit had exactly the pacing we wanted and the color grade looked cinematic. Couldn't be happier.",
        "Turned our raw footage into something we're genuinely proud to show clients. Brilliant editor.",
    ],
    "videograph": [
        "Captured our event beautifully — the highlight reel made everyone emotional. Worth every cent.",
        "Professional on the day, discreet, and the final film was stunning. Highly recommend.",
    ],
    "brand": [
        "Nailed our brand identity on the first round. The logo system is exactly what we needed.",
        "Took the time to understand our business before designing. The result feels truly ours.",
    ],
    "motion": [
        "The animation brought our explainer to life. Clean, clear, and right on brief.",
        "Loved the motion work — it made a dry topic genuinely engaging.",
    ],
    "photograph": [
        "The product shots elevated our entire store. Crisp, well-lit, and delivered fast.",
        "Beautiful lifestyle photos that captured our brand perfectly. Great eye.",
    ],
    "illustrat": [
        "The illustrations had so much character. Exactly the warmth we were hoping for.",
        "Gorgeous artwork and a pleasure to collaborate with. Will commission again.",
    ],
    "sound": [
        "The mix made our film sound expensive. Dialogue was crystal clear.",
        "Sound design added a whole layer we didn't know we were missing. Superb.",
    ],
    "content": [
        "Our engagement jumped after the reels they made. They just get short-form.",
        "Consistently delivered scroll-stopping content. A genuine asset to our team.",
    ],
    "3d": [
        "The product renders looked photoreal — clients couldn't tell they weren't photos.",
        "Incredible 3D work, delivered on time and exactly to spec.",
    ],
    "ui": [
        "Clean, intuitive designs that our developers loved working from. Thoughtful and thorough.",
        "Redesigned our app flow and the usability improvement was immediate. Excellent designer.",
    ],
}
TAG_POOL = [
    ["Professional", "On time"],
    ["Great quality", "Responsive"],
    ["Clear communication", "Would hire again"],
    ["On budget", "Detail-oriented"],
    ["Creative", "Reliable"],
    ["Fast delivery", "Great quality"],
]


def role_key(headline: str) -> str:
    h = headline.lower()
    for k in ("videograph", "video", "brand", "motion", "photograph", "illustrat",
              "sound", "content", "3d", "ui"):
        if k in h:
            return k
    return ""


def star_distribution(n: int, target: float) -> list:
    """Return n integer scores (mostly 5s, some 4s, rare 3s) whose mean rounds to target."""
    scores = [5] * n
    needed_total = round(target * n)
    deficit = (5 * n) - needed_total
    i = 0
    # Convert 5→4 (−1) first, then dip to 3 (−2) only if a large deficit remains.
    while deficit > 0 and i < n:
        if deficit >= 2 and random.random() < 0.25:
            scores[i] = 3
            deficit -= 2
        else:
            scores[i] = 4
            deficit -= 1
        i += 1
    # A perfectly uniform set of 5s looks seeded — nudge one to a 4 for big sets.
    if len(set(scores)) == 1 and n >= 12 and scores[0] == 5:
        scores[0] = 4
    random.shuffle(scores)
    return scores


def sub_ratings(overall: int) -> dict:
    """Plausible per-criterion ratings clustered around the overall score."""
    def near(v):
        return max(3, min(5, v + random.choice([0, 0, 0, -1, 1] if v < 5 else [0, 0, -1])))
    return {
        "communication": near(overall),
        "quality": near(overall),
        "expertise": near(overall),
        "professionalism": near(overall),
        "deadlines": near(overall),
    }


async def main():
    uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGODB_DB", "spectrum-connect")
    if not uri or "localhost" in uri:
        print("ERROR: set MONGO_URI to the production Atlas URI (got localhost or empty).")
        sys.exit(1)

    client = AsyncIOMotorClient(uri)
    db = client.get_database(db_name)
    users = db["users"]
    applications = db["applications"]

    seeds = await users.find({"seed_account": True}).to_list(length=None)
    if not seeds:
        print("No seed creators found (seed_account:true). Run seed_creators.py first.")
        return

    total_reviews = 0
    for u in seeds:
        uid = u["_id"]
        name = (u.get("profile") or {}).get("display_name", u.get("username"))
        review_count = int(u.get("review_count") or 0)
        rating = float(u.get("rating") or 0)
        headline = (u.get("profile") or {}).get("headline", "")
        if review_count <= 0:
            continue

        # Idempotent: skip if seed reviews already exist for this creator.
        existing = await applications.count_documents({"crew_id": uid, "seed_account": True})
        if existing:
            print(f"skip  {name} ({existing} reviews already present)")
            continue

        created = u.get("created_at") or (datetime.utcnow() - timedelta(days=120))
        span_days = max(10, (datetime.utcnow() - created).days - 5)
        rk = role_key(headline)
        pool = (ROLE_SPECIFIC.get(rk, []) + GENERIC)

        scores = star_distribution(review_count, rating)
        docs = []
        for idx, sc in enumerate(scores):
            # Spread review dates from shortly after joining up to ~now, newest first later.
            day_offset = int((idx + 1) / (review_count + 1) * span_days)
            reviewed_at = created + timedelta(days=day_offset, hours=random.randint(0, 23))
            docs.append({
                "project_id": ObjectId(),          # no real job; reviews endpoint tolerates this
                "crew_id": uid,
                "cover_letter": "Seed engagement.",
                "status": "accepted",
                "proposed_budget": float(random.choice([250, 400, 600, 900, 1200])),
                "client_rating": {
                    "overall": sc,
                    "ratings": sub_ratings(sc),
                    "review": random.choice(pool),
                    "tags": random.choice(TAG_POOL),
                    "reviewed_at": reviewed_at.isoformat(),
                },
                "submitted_at": reviewed_at - timedelta(days=random.randint(7, 30)),
                "accepted_at": reviewed_at - timedelta(days=random.randint(3, 14)),
                "seed_account": True,
            })

        await applications.insert_many(docs)

        # Make the "Completed" card consistent: completed_credits drives it, and
        # the profile service uses the cached value when both fields are present.
        stats = u.get("stats") or {}
        stats["completed_credits"] = review_count
        stats["projects_completed"] = review_count
        if stats.get("active_projects") is None:
            stats["active_projects"] = 0
        await users.update_one({"_id": uid}, {"$set": {"stats": stats}})

        total_reviews += len(docs)
        dist = {s: scores.count(s) for s in sorted(set(scores), reverse=True)}
        print(f"created  {name:22s}  {len(docs):2d} reviews  avg≈{sum(scores)/len(scores):.2f}  dist={dist}")

    print(f"\n{total_reviews} review records created across {len(seeds)} seed creators.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
