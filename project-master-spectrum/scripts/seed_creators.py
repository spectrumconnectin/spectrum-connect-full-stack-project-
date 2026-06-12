"""
Seed realistic creator accounts.
================================
Inserts 10 fully-populated creator (account_type="crew") accounts plus matching
ETF Points records so they appear naturally in talent search, Smart Connect,
and profile pages.

Each account is marked with `seed_account: True` and every created _id is
written to scripts/seed_creators_created.json so they can be removed cleanly:

    db.users.deleteMany({ seed_account: true })
    db.etf_points.deleteMany({ seed_account: true })

Run (production):
    MONGO_URI="<atlas uri>" MONGODB_DB="spectrum-connect" python scripts/seed_creators.py

Idempotent: skips any creator whose email already exists.
"""

import os
import json
import sys
import uuid
from datetime import datetime, timedelta

import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

DEMO_PASSWORD = "Spectrum@Creator25"   # shared login for all seed creators


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def days_ago(n: int) -> datetime:
    return datetime.utcnow() - timedelta(days=n)


# Tier → representative lifetime ETF points (thresholds: silver 250, gold 1000)
TIER_POINTS = {"bronze": 90, "silver": 480, "gold": 1850}

# ── The 10 creators ──────────────────────────────────────────────────────────
# Realistic mix for a Sri Lanka-based creative marketplace.
CREATORS = [
    {
        "first": "Dineth", "last": "Fernando", "user": "dineth.fernando",
        "headline": "Video Editor & Colorist", "city": "Colombo",
        "tagline": "Cinematic edits with a clean, modern grade.",
        "bio": "Freelance video editor with 7 years cutting commercials, music videos and brand films. I obsess over pacing and color — every frame should feel intentional. DaVinci Resolve and Premiere Pro are home base.",
        "skills": [("Video Editing", "expert", 7), ("Color Grading", "expert", 6), ("DaVinci Resolve", "expert", 5), ("Premiere Pro", "expert", 7)],
        "rate": (18, 35), "rating": 4.9, "reviews": 37, "tier": "gold",
        "gender": "men", "pic": 32, "joined": 142,
        "portfolio_img": "photo-1485846234645-a62644f84728",
    },
    {
        "first": "Aisha", "last": "Rahman", "user": "aisha.rahman",
        "headline": "Brand & Logo Designer", "city": "Colombo",
        "tagline": "Identities that say everything in one mark.",
        "bio": "Brand designer helping startups and small businesses look like the real deal. I build logo systems, type and color guidelines, and the little details that make a brand feel finished. Figma + Illustrator.",
        "skills": [("Logo Design", "expert", 6), ("Brand Identity", "expert", 6), ("Adobe Illustrator", "expert", 8), ("Figma", "advanced", 4)],
        "rate": (16, 30), "rating": 4.8, "reviews": 24, "tier": "silver",
        "gender": "women", "pic": 44, "joined": 96,
        "portfolio_img": "photo-1626785774573-4b799315345d",
    },
    {
        "first": "Tharindu", "last": "Jayawardena", "user": "tharindu.jaya",
        "headline": "Wedding & Event Videographer", "city": "Negombo",
        "tagline": "Real moments, beautifully kept.",
        "bio": "I film weddings and events across the western coast. Multi-camera coverage, drone, and same-day highlight reels. Over 200 weddings filmed and I still tear up at the good ones.",
        "skills": [("Videography", "expert", 9), ("Drone Operation", "advanced", 5), ("Event Coverage", "expert", 9), ("Final Cut Pro", "advanced", 6)],
        "rate": (20, 40), "rating": 5.0, "reviews": 52, "tier": "gold",
        "gender": "men", "pic": 12, "joined": 168,
        "portfolio_img": "photo-1519741497674-611481863552",
    },
    {
        "first": "Nuwan", "last": "Perera", "user": "nuwan.perera",
        "headline": "Motion Graphics Artist", "city": "Kandy",
        "tagline": "Bringing static brands to life.",
        "bio": "Motion designer specializing in explainer videos, logo animations and social content. After Effects is my instrument. I love turning a dense idea into 30 seconds that just clicks.",
        "skills": [("Motion Graphics", "expert", 6), ("After Effects", "expert", 6), ("2D Animation", "advanced", 5), ("Cinema 4D", "intermediate", 3)],
        "rate": (17, 32), "rating": 4.7, "reviews": 19, "tier": "silver",
        "gender": "men", "pic": 51, "joined": 78,
        "portfolio_img": "photo-1550745165-9bc0b252726f",
    },
    {
        "first": "Sahan", "last": "Wickramasinghe", "user": "sahan.wick",
        "headline": "Photographer — Product & Lifestyle", "city": "Galle",
        "tagline": "Light, texture, and a strong point of view.",
        "bio": "Product and lifestyle photographer working with cafes, boutiques and e-commerce brands. Natural light specialist. I shoot, retouch and deliver web-ready sets fast.",
        "skills": [("Photography", "expert", 5), ("Photo Retouching", "advanced", 5), ("Lightroom", "expert", 5), ("Product Styling", "advanced", 4)],
        "rate": (14, 26), "rating": 4.6, "reviews": 11, "tier": "bronze",
        "gender": "men", "pic": 65, "joined": 47,
        "portfolio_img": "photo-1606107557195-0e29a4b5b4aa",
    },
    {
        "first": "Maya", "last": "Gunasekara", "user": "maya.gunasekara",
        "headline": "Illustrator & Concept Artist", "city": "Colombo",
        "tagline": "Characters and worlds with personality.",
        "bio": "Illustrator working in editorial, packaging and games. I draw warm, characterful work — from kids' book spreads to game concept art. Procreate and Photoshop.",
        "skills": [("Illustration", "expert", 8), ("Concept Art", "advanced", 5), ("Procreate", "expert", 6), ("Character Design", "advanced", 5)],
        "rate": (18, 34), "rating": 4.9, "reviews": 28, "tier": "silver",
        "gender": "women", "pic": 68, "joined": 121,
        "portfolio_img": "photo-1513364776144-60967b0f800f",
    },
    {
        "first": "Kasun", "last": "Bandara", "user": "kasun.bandara",
        "headline": "Sound Designer & Audio Mixing", "city": "Colombo",
        "tagline": "Audio that makes the picture better.",
        "bio": "Sound designer and mixing engineer for film, ads and podcasts. Dialogue cleanup, foley, original score and final mix. If it sounds effortless, I did my job.",
        "skills": [("Sound Design", "expert", 6), ("Audio Mixing", "expert", 6), ("Pro Tools", "expert", 7), ("Podcast Editing", "advanced", 4)],
        "rate": (15, 28), "rating": 4.8, "reviews": 14, "tier": "bronze",
        "gender": "men", "pic": 4, "joined": 59,
        "portfolio_img": "photo-1598488035139-bdbb2231ce04",
    },
    {
        "first": "Ishara", "last": "De Silva", "user": "ishara.desilva",
        "headline": "Social Media Content Creator", "city": "Mount Lavinia",
        "tagline": "Scroll-stopping content, end to end.",
        "bio": "I plan, shoot and edit short-form content for brands on Instagram and TikTok. Reels, hooks, captions, the whole package. I know what makes people stop scrolling because I test it every day.",
        "skills": [("Content Creation", "expert", 5), ("Reels & TikTok", "expert", 4), ("CapCut", "expert", 4), ("Social Strategy", "advanced", 4)],
        "rate": (13, 25), "rating": 4.7, "reviews": 33, "tier": "silver",
        "gender": "women", "pic": 90, "joined": 88,
        "portfolio_img": "photo-1611162617474-5b21e879e113",
    },
    {
        "first": "Rohan", "last": "Mendis", "user": "rohan.mendis",
        "headline": "3D Animator & Product Visualizer", "city": "Colombo",
        "tagline": "Photoreal 3D for products and ads.",
        "bio": "3D artist creating product visualizations, animated ads and architectural renders. Blender and Houdini. I help brands show a product before it's even manufactured.",
        "skills": [("3D Animation", "expert", 7), ("Blender", "expert", 7), ("Product Visualization", "advanced", 5), ("Houdini", "intermediate", 3)],
        "rate": (22, 45), "rating": 4.9, "reviews": 41, "tier": "gold",
        "gender": "men", "pic": 75, "joined": 154,
        "portfolio_img": "photo-1617791160505-6f00504e3519",
    },
    {
        "first": "Thilini", "last": "Rajapaksa", "user": "thilini.raj",
        "headline": "UI/UX & Web Designer", "city": "Jaffna",
        "tagline": "Clean interfaces people actually enjoy using.",
        "bio": "Product designer for web and mobile. I take a rough idea to a polished, prototyped, developer-ready design. Strong on accessibility and design systems. Figma all day.",
        "skills": [("UI/UX Design", "expert", 6), ("Figma", "expert", 6), ("Web Design", "advanced", 5), ("Design Systems", "advanced", 4)],
        "rate": (19, 36), "rating": 4.8, "reviews": 22, "tier": "silver",
        "gender": "women", "pic": 24, "joined": 110,
        "portfolio_img": "photo-1561070791-2526d30994b5",
    },
]


def build_user(c: dict) -> dict:
    joined = days_ago(c["joined"])
    display = f"{c['first']} {c['last']}"
    avatar = f"https://randomuser.me/api/portraits/{c['gender']}/{c['pic']}.jpg"
    portfolio_url = f"https://images.unsplash.com/{c['portfolio_img']}?auto=format&fit=crop&w=1200&q=80"
    return {
        "email": f"{c['user']}@gmail.com",
        "username": c["user"],
        "password_hash": hash_pw(DEMO_PASSWORD),
        "phone_number": None,
        "phone_verified": False,
        "account_type": "crew",
        "user_role": "user",
        "is_verified": True,
        "is_active": True,
        "deleted_at": None,
        "rating": c["rating"],
        "review_count": c["reviews"],
        "last_active": days_ago(c["joined"] % 6),     # recently active
        "last_login": days_ago(c["joined"] % 9),
        "created_at": joined,
        "seed_account": True,                          # ← removal marker
        "profile": {
            "first_name": c["first"],
            "last_name": c["last"],
            "display_name": display,
            "profile_picture": avatar,
            "bio": c["bio"],
            "tagline": c["tagline"],
            "headline": c["headline"],
            "location": {"country": "Sri Lanka", "city": c["city"]},
            "languages": [
                {"language": "English", "proficiency": "fluent"},
                {"language": "Sinhala", "proficiency": "native"},
            ],
            "skills": [
                {"name": s[0], "level": s[1], "years_of_experience": s[2]}
                for s in c["skills"]
            ],
            "hourly_rate_min": float(c["rate"][0]),
            "hourly_rate_max": float(c["rate"][1]),
            "rating": c["rating"],
            "review_count": c["reviews"],
            "portfolio_items": [
                {
                    "id": uuid.uuid4().hex,
                    "type": "image",
                    "media_type": "jpg",
                    "url": portfolio_url,
                    "title": f"{c['headline'].split('—')[0].strip()} — selected work",
                    "description": "A recent piece from my portfolio.",
                    "created_at": joined,
                }
            ],
        },
        "stats": {
            "total_earnings": 0,
            "projects_completed": c["reviews"],
            "active_projects": 1 if c["tier"] != "bronze" else 0,
            "success_rate": round(min(99, 88 + c["reviews"] % 11), 1),
            "client_satisfaction": c["rating"],
            "response_time": 2 if c["tier"] == "gold" else 5,
            "profile_views": c["reviews"] * 17 + 40,
            "total_connections": c["reviews"] // 2 + 5,
        },
        "settings": {
            "profile_visibility": "public",
            "availability_status": "available",
            "show_location": True,
        },
        "spectrum_id": {
            "tier": c["tier"],
            "tier_updated_at": joined,
            "trust_score": {"bronze": 42.0, "silver": 64.0, "gold": 81.0}[c["tier"]],
            "verification_level": "standard",
            "profile_completeness_percentage": 95.0,
        },
    }


def build_etf(user_id, c: dict) -> dict:
    pts = TIER_POINTS[c["tier"]]
    return {
        "user_id": user_id,
        "balance": pts,
        "lifetime_points": pts,
        "redeemed_points": 0,
        "cashed_out_points": 0,
        "level": c["tier"],
        "created_at": days_ago(c["joined"]),
        "updated_at": datetime.utcnow(),
        "seed_account": True,
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
    etf = db["etf_points"]

    created = []
    for c in CREATORS:
        email = f"{c['user']}@gmail.com"
        if await users.find_one({"email": email}):
            print(f"skip  {email} (already exists)")
            continue
        doc = build_user(c)
        res = await users.insert_one(doc)
        await etf.insert_one(build_etf(res.inserted_id, c))
        created.append({"id": str(res.inserted_id), "email": email, "name": f"{c['first']} {c['last']}"})
        print(f"created  {c['first']} {c['last']:20s}  {c['headline']:32s}  {c['tier']}")

    out_path = os.path.join(os.path.dirname(__file__), "seed_creators_created.json")
    with open(out_path, "w") as f:
        json.dump(created, f, indent=2)

    print(f"\n{len(created)} creators created. IDs written to {out_path}")
    print(f"Login for all seed accounts: password = {DEMO_PASSWORD!r}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
