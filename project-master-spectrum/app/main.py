import logging
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("spectrum.main")

from app.models.schema import (
    User, CrewProfile, JobPost, Application, ContactMessage,
    Transaction, Notification, Workspace, MiyaInteraction, Service
)
from app.models.message import Conversation, Message, MessageAttachment, UserPresence
from app.models.project import Project, ActivityLog, ProjectDeadline
from app.models.blog import BlogPost, BlogComment, BlogCategory
from app.models.community import (
    CommunityProject, CommunityEvent, ForumThread, ForumPost,
    CollabCall, CommunityGuideline, FeaturedCreator
)
from app.models.etf import ETFVault, ETFContribution, ETFLedger
from app.models.review_queue import ReviewQueue
from app.models.escrow import Escrow, Dispute, GuaranteeFund
from app.models.skill_challenge import SkillChallenge, ChallengeSubmission, SkillBadge
from app.auth.router import router as auth_router
from app.api.routers.job_router import router as job_router
from app.api.routers.client_dashboard import router as client_dashboard_router
from app.api.routers.account_router import router as account_router
from app.api.routers.blog_router import router as blog_router
from app.api.routers.contact_router import router as contact_router
from app.api.routers.smart_connect_router import router as smart_connect_router
from app.api.routes.messages import router as messages_router
from app.api.routers.profile_router import router as profile_router
from app.api.routers.creator_dashboard import router as creator_dashboard_router
from app.api.routers.creator_teams import router as creator_teams_router
from app.api.routers.client_projects import router as client_projects_router
from app.api.routers.client_teams import router as client_teams_router
from app.api.routers.community_router import router as community_router
from app.api.routers.talent_router import router as talent_router
from app.api.routers.header_router import router as header_router
from app.api.routers.ai_router import router as ai_router
from app.api.routers.service_router import router as service_router
from app.api.routers.billing_router import router as billing_router
from app.api.routers.creator_smart_connect import router as creator_smart_connect_router
from app.api.routes.projects import router as projects_router
from app.api.routers.etf_router import router as etf_router
from app.api.routers.review_router import creator_router as review_creator_router
from app.api.routers.review_router import admin_router as review_admin_router
from app.api.routers.escrow_router import escrow_router
from app.api.routers.escrow_router import dispute_router
from app.api.routers.skill_challenge_router import router as skill_challenge_router
from app.api.routers.upload_router import router as upload_router
from app.api.routers.proposals_router import router as proposals_router
from app.api.routers.earnings_router import router as earnings_router

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "spectrum-connect")
logger.info("MONGO_URI: [configured]")
logger.info("MONGODB_DB: %s", MONGODB_DB)

app = FastAPI(
    title="Spectrum Connect API",
    description="Film Production Crew Marketplace - Connect crew members with producers",
    version="1.0.1",
    # Hide interactive docs in production to reduce attack surface (still
    # reachable via /openapi.json if explicitly enabled).
    docs_url="/docs" if not settings.is_production() else None,
    redoc_url="/redoc" if not settings.is_production() else None,
)

# Build CORS allowlist from configuration only — no hardcoded preview URLs.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
_extra_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
_frontend_url = os.getenv("FRONTEND_URL", "").strip()

if settings.is_production():
    # Production: ONLY origins explicitly allowed via env vars. No localhost.
    _origins = list({o for o in ([_frontend_url] + _extra_origins) if o})
    if not _origins:
        logger.warning(
            "CORS: no FRONTEND_URL or ALLOWED_ORIGINS configured in production. "
            "Browser clients will be blocked."
        )
else:
    # Development: localhost defaults plus anything in env.
    _origins = list({o for o in (
        ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]
        + ([_frontend_url] if _frontend_url else [])
        + _extra_origins
    ) if o})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    # Pin to verbs we actually use rather than wildcarding.
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Key", "X-Requested-With"],
    max_age=600,
)


# ─── Security headers middleware ─────────────────────────────────────────────
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Apply baseline security headers to every response."""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    if settings.is_production():
        # Tell browsers to upgrade and pin HTTPS once a TLS cert is in front of
        # the LB. Harmless on HTTP origins (browsers ignore HSTS over HTTP).
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
        )
    return response

# ==================================================================
# ROUTERS
# ==================================================================
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(profile_router, prefix="/profiles", tags=["User Profiles"])
app.include_router(account_router, tags=["Account Settings"])
app.include_router(client_dashboard_router, tags=["Client Dashboard"])
app.include_router(creator_dashboard_router, tags=["Creator Dashboard"])
app.include_router(job_router, prefix="/jobs", tags=["Job Posts"])
app.include_router(client_teams_router, tags=["Client Teams"])
app.include_router(client_projects_router, tags=["Client Projects"])
app.include_router(creator_teams_router, tags=["Creator Teams"])
app.include_router(messages_router, tags=["Messages"])
app.include_router(smart_connect_router, tags=["Smart Connect"])
app.include_router(community_router, tags=["Community"])
app.include_router(talent_router, tags=["Talent"])
app.include_router(blog_router, tags=["Blog"])
app.include_router(contact_router, tags=["Contact"])
app.include_router(header_router, tags=["Header"])
app.include_router(ai_router, tags=["AI Assistant"])
app.include_router(service_router, prefix="/services", tags=["Services"])
app.include_router(billing_router, tags=["Billing"])
app.include_router(creator_smart_connect_router, tags=["Creator Smart Connect"])
app.include_router(projects_router, tags=["Projects"])
app.include_router(etf_router, tags=["ETF Trust Fund"])
app.include_router(review_creator_router, tags=["Review Queue — Creator"])
app.include_router(review_admin_router, tags=["Review Queue — Admin"])
app.include_router(escrow_router, tags=["Spectrum Guarantee — Escrow"])
app.include_router(dispute_router, tags=["Spectrum Guarantee — Disputes"])
app.include_router(skill_challenge_router, tags=["Skill Verification Challenges"])
app.include_router(upload_router, prefix="/upload", tags=["File Upload"])
app.include_router(proposals_router, tags=["Proposals"])
app.include_router(earnings_router, tags=["Earnings"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API is running"}

@app.get("/")
def read_root():
    return {"message": "Welcome to Spectrum Connect API"}

@app.on_event("startup")
async def startup_db_client():
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGO_URI)
    database = client.get_database(MONGODB_DB)
    logger.info("MongoDB client initialized")

    try:
        await init_beanie(
            database=database,
            document_models=[
                User, CrewProfile, ContactMessage,
                JobPost, Application,
                Conversation, Message, MessageAttachment, UserPresence,
                Project, ActivityLog, ProjectDeadline,
                BlogPost, BlogComment, BlogCategory,
                CommunityProject, CommunityEvent, ForumThread, ForumPost,
                CollabCall, CommunityGuideline, FeaturedCreator,
                Transaction, Notification, Workspace, MiyaInteraction, Service,
                ETFVault, ETFContribution, ETFLedger,
                ReviewQueue,
                Escrow, Dispute, GuaranteeFund,
                SkillChallenge, ChallengeSubmission, SkillBadge,
            ],
        )
        logger.info("Beanie initialized successfully")
    except Exception as e:
        logger.exception("Error initializing Beanie")
        raise e