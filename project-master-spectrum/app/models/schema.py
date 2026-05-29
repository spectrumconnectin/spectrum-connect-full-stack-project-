from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from beanie import Document, PydanticObjectId

# ============================================================================
# USER & AUTHENTICATION
# ============================================================================

class GoogleOAuth(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    connected_at: Optional[datetime] = None

class FacebookOAuth(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    connected_at: Optional[datetime] = None

class LinkedInOAuth(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    connected_at: Optional[datetime] = None

class GitHubOAuth(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    connected_at: Optional[datetime] = None

class AppleOAuth(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    connected_at: Optional[datetime] = None

class OAuth(BaseModel):
    google: Optional[GoogleOAuth] = None
    facebook: Optional[FacebookOAuth] = None
    linkedin: Optional[LinkedInOAuth] = None
    github: Optional[GitHubOAuth] = None
    apple: Optional[AppleOAuth] = None

class Location(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    timezone: Optional[str] = None
    coordinates: Optional[dict] = None # GeoJSON Point

class Language(BaseModel):
    language: Optional[str] = None
    proficiency: Optional[str] = None # native, fluent, conversational, basic

class SocialLinks(BaseModel):
    linkedin: Optional[str] = None
    imdb: Optional[str] = None
    vimeo: Optional[str] = None
    portfolio: Optional[str] = None

class Skill(BaseModel):
    name: str
    level: Optional[str] = None # beginner, intermediate, expert, master
    years_of_experience: Optional[int] = None

class Experience(BaseModel):
    title: str
    project_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    current: bool = False
    description: Optional[str] = None
    achievements: Optional[List[str]] = None

class Education(BaseModel):
    degree: str
    institution: str
    field_of_study: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    description: Optional[str] = None

class Certification(BaseModel):
    name: str
    issuing_organization: str
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None

class Profile(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    profile_picture: Optional[str] = None # URL
    cover_image: Optional[str] = None # URL
    bio: Optional[str] = None
    tagline: Optional[str] = None
    location: Optional[Location] = None
    languages: Optional[List[Language]] = None
    website: Optional[str] = None
    social_links: Optional[SocialLinks] = None
    # Professional information (Fiverr-style)
    intro_video: Optional[str] = None # URL to intro video
    skills: Optional[List[Skill]] = None
    experience: Optional[List[Experience]] = None
    education: Optional[List[Education]] = None
    certifications: Optional[List[Certification]] = None
    headline: Optional[str] = None
    hourly_rate_min: Optional[float] = None
    hourly_rate_max: Optional[float] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None

    # Convenience property for frontend (alias for profile_picture)
    @property
    def avatar(self) -> Optional[str]:
        return self.profile_picture

class Subscription(BaseModel):
    plan: Optional[str] = None # "free", "pro"
    status: Optional[str] = None # "active", "cancelled", "expired", "trial"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    auto_renew: Optional[bool] = None
    payment_method: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None

class VerificationBadge(BaseModel):
    verified: Optional[bool] = None
    verified_at: Optional[datetime] = None
    verification_type: Optional[str] = None # "identity", "payment", "email", "phone", "premium"
    verification_documents: Optional[List[str]] = None # URLs to documents

class UserStats(BaseModel):
    total_earnings: Optional[float] = 0
    total_spent: Optional[float] = 0
    total_credits: Optional[int] = 0
    completed_credits: Optional[int] = 0
    active_projects: Optional[int] = 0
    projects_completed: Optional[int] = 0  # For creator dashboard "Your Impact"
    success_rate: Optional[float] = 0
    client_satisfaction: Optional[float] = 0  # Average rating from reviews (0-5)
    response_time: Optional[int] = 0 # in hours
    profile_views: Optional[int] = 0
    total_connections: Optional[int] = 0

class UserSettings(BaseModel):
    email_notifications: Optional[bool] = True
    push_notifications: Optional[bool] = True
    sms_notifications: Optional[bool] = False
    marketing_emails: Optional[bool] = False
    profile_visibility: Optional[str] = "public" # "public", "connections", "private"
    availability_status: Optional[str] = "available" # "available", "busy", "not_available"
    show_location: Optional[bool] = True
    show_earnings: Optional[bool] = False
    two_factor_auth: Optional[bool] = False

class LoginHistory(BaseModel):
    timestamp: datetime
    ip: str
    device: str
    location: str
class TrustScoreEntry(BaseModel):
    """Single snapshot in the trust score history array."""
    score: float                             # 0–100
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    factors: Optional[dict] = None           # e.g. {"etf_active": 10, "projects": 25}
 
 
class SpectrumBadge(BaseModel):
    """A badge earned by the user (skill verified, team approved, etc.)."""
    badge_type: str                          # "skill_verified", "team_approved", "etf_active", etc.
    earned_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None    # None = permanent
 
 
class SpectrumID(BaseModel):
    """
    Living digital identity that evolves with the user's actions,
    project history, and trust performance.
 
    Embedded directly inside the User document — no separate collection.
    """
    # Tier (driven by trust_score)
    tier: str = "bronze"                     # bronze | silver | gold | platinum | diamond
    tier_updated_at: Optional[datetime] = None
 
    # Trust score
    trust_score: float = 0.0                 # 0–100 float
    trust_score_history: List[TrustScoreEntry] = Field(default_factory=list)
 
    # Verification
    verification_level: str = "basic"        # basic | standard | premium | elite
    verification_checks_passed: List[str] = Field(default_factory=list)
    # Possible check values:
    #   "email_verified", "id_submitted", "portfolio_reviewed",
    #   "team_approved", "skill_verified", "etf_active"
 
    # Profile completeness (0–100)
    profile_completeness_percentage: float = 0.0
 
    # Recalculation tracking
    last_trust_recalculation: Optional[datetime] = None
 
    # Badges
    badges: List[SpectrumBadge] = Field(default_factory=list)
# class PhoneOTP(Document):
#     """
#     Phone OTP verification model
#     Stores OTPs sent via WhatsApp for phone verification
#     """
#     phone_number: str  # E.164 format
#     otp_code: str  # 6-digit OTP
#     otp_hash: str  # Hashed OTP for security
#     purpose: str  # "signup", "login", "verification", "password_reset"
#     attempts: int = 0  # Number of verification attempts
#     max_attempts: int = 3
#     is_verified: bool = False
#     created_at: datetime = Field(default_factory=datetime.utcnow)
#     expires_at: datetime  # OTP expiry time (typically 10 minutes)
#     verified_at: Optional[datetime] = None
#
#     class Settings:
#         name = "phone_otps"
#         indexes = [
#             "phone_number",
#             "expires_at",
#             [("phone_number", 1), ("purpose", 1)],  # Compound index
#         ]

class User(Document):
    email: str  # Required - users must provide both email and phone
    username: str
    password_hash: str
    phone_number: str  # Required - E.164 format (e.g., +1234567890)
    phone_country_code: Optional[str] = None  # E.g., "US", "IN", "GB"
    phone_verified: bool = False  # Phone verification status (WhatsApp OTP)
    oauth: Optional[OAuth] = None
    profile: Optional[Profile] = None
    account_type: str # "crew", "producer", "both"
    user_role: str = "user" # "user", "admin", "moderator"
    subscription: Optional[Subscription] = None
    is_verified: bool = False  # Email verification status
    verification_badge: Optional[VerificationBadge] = None
    stats: Optional[UserStats] = Field(default_factory=UserStats)
    settings: Optional[UserSettings] = Field(default_factory=UserSettings)
    last_active: Optional[datetime] = None
    last_login: Optional[datetime] = None
    login_history: Optional[List[LoginHistory]] = None
    deleted_at: Optional[datetime] = None # Soft delete
    spectrum_id: Optional[SpectrumID] = Field(default_factory=SpectrumID)

    class Settings:
        name = "users"
        indexes = [
            "email",
            "username",
            "phone_number",
            "oauth.google.id",
            "oauth.facebook.id",
            "oauth.linkedin.id",
            "account_type",
            "spectrum_id.tier",   
            "spectrum_id.trust_score",
        ]

# ============================================================================
# CREW PROFILE - Crew-specific professional settings
# ============================================================================
# Note: User.profile contains personal/professional info (skills, experience, education, certifications)
# CrewProfile contains ONLY crew-specific settings (rates, availability, departments, preferences)

class Rating(BaseModel):
    overall: float = 0
    total_reviews: int = 0
    breakdown: Optional[dict] = None

class Availability(BaseModel):
    hours_per_week: Optional[int] = None
    available_from: Optional[datetime] = None
    working_hours: Optional[dict] = None

class Portfolio(BaseModel):
    featured_work: Optional[List[PydanticObjectId]] = None
    total_items: int = 0
    views: int = 0

class ProductionPreferences(BaseModel):
    team_size: Optional[str] = None
    project_duration: Optional[str] = None
    location_preference: Optional[List[str]] = None
    communication_style: Optional[str] = None
    willing_to_travel: Optional[bool] = None

class CrewProfile(Document):
    user_id: PydanticObjectId
    # Crew-specific professional settings (NOT duplicate of User.profile)
    title: Optional[str] = None # e.g., "Senior Cinematographer", "Director of Photography"
    daily_rate: Optional[float] = None
    weekly_rate: Optional[float] = None
    hourly_rate: Optional[float] = None
    availability: Optional[Availability] = None
    departments: Optional[List[str]] = None # Camera, Sound, Lighting, etc.
    specializations: Optional[List[str]] = None # Documentary, Commercial, Feature Film
    portfolio: Optional[Portfolio] = None
    production_preferences: Optional[ProductionPreferences] = None
    rating: Optional[Rating] = None
    trust_tier_override: Optional[str] = None 
    last_review_date: Optional[datetime] = None
    # NOTE: skills, experience, education, certifications are in User.profile

    class Settings:
        name = "crew_profiles"
        indexes = ["user_id"]

# ============================================================================
# GIG/SERVICE - Fiverr-style service offerings
# ============================================================================
# Note: Service model is the new way to create gigs
# Users can create multiple Services (like Fiverr gigs) for different offerings

# ============================================================================
# PORTFOLIO ITEMS
# ============================================================================

class Media(BaseModel):
    type: str # image, video, pdf, link
    url: str
    thumbnail: Optional[str] = None
    order: Optional[int] = None
    caption: Optional[str] = None

class ProjectDetails(BaseModel):
    production_company: Optional[str] = None
    production_type: Optional[str] = None # "Feature Film", "Short Film", "Commercial"
    director: Optional[str] = None
    producer: Optional[str] = None
    completed_date: Optional[datetime] = None
    duration: Optional[str] = None
    role: Optional[str] = None
    team_size: Optional[int] = None
    tools: Optional[List[str]] = None

class Testimonial(BaseModel):
    text: Optional[str] = None
    author: Optional[str] = None
    role: Optional[str] = None

# ============================================================================
# PORTFOLIO ITEMS - COMMENTED OUT (Not used by frontend)
# ============================================================================
# class PortfolioItem(Document):
#     user_id: PydanticObjectId
#     title: str
#     description: Optional[str] = None
#     media: List[Media]
#     category: Optional[str] = None
#     tags: Optional[List[str]] = None
#     project_details: Optional[ProjectDetails] = None
#     testimonial: Optional[Testimonial] = None
#     views: int = 0
#     likes: int = 0
#     liked_by: Optional[List[PydanticObjectId]] = None
#     is_featured: bool = False
#     is_public: bool = True
#
#     class Settings:
#         name = "portfolio_items"
#         indexes = [
#             "user_id",
#             "category",
#             "tags",
#             "is_featured",
#         ]

# ============================================================================
# SERVICES (Fiverr-style Services)
# ============================================================================

class Package(BaseModel):
    name: str  # basic, standard, premium
    description: str
    price: float
    delivery_time: int  # in days
    revisions: int  # -1 for unlimited
    features: List[str]
    is_active: bool = True

class Extra(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    delivery_time: int  # additional days

class Requirement(BaseModel):
    question: str
    type: str  # text, multiple_choice, file_upload
    required: bool = True
    options: Optional[List[str]] = None

class ServiceStats(BaseModel):
    views: int = 0
    impressions: int = 0
    clicks: int = 0
    orders: int = 0
    in_queue: int = 0
    completed_orders: int = 0
    cancelled_orders: int = 0
    revenue: float = 0

class ServiceSEO(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    keywords: Optional[List[str]] = None

class Service(Document):
    user_id: PydanticObjectId
    title: str
    slug: str
    description: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    tags: Optional[List[str]] = None
    media: Optional[dict] = None
    packages: List[Package] = Field(default_factory=list)
    extras: Optional[List[Extra]] = None
    requirements: Optional[List[Requirement]] = None
    stats: ServiceStats = Field(default_factory=ServiceStats)
    rating: Rating = Field(default_factory=Rating)
    status: str = "draft"  # draft, active, paused, pending_approval, rejected
    is_premium: bool = False
    boost_expires_at: Optional[datetime] = None
    seo: Optional[ServiceSEO] = None
    paused_at: Optional[datetime] = None

    class Settings:
        name = "services"
        indexes = [
            "user_id",
            "slug",
            "department",
            "role",
            "tags",
            "status",
            "rating.overall",
            "stats.orders",
        ]

# ============================================================================
# JOB POSTS (Upwork-style Job Posts)
# ============================================================================

class Budget(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    currency: str = "USD"

class Rate(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None

class CrewCall(BaseModel):
    role: str
    skills: Optional[List[str]] = None
    count: int = 1
    description: Optional[str] = None

class Attachment(BaseModel):
    file_name: str
    file_url: str
    file_size: Optional[int] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class ProposalSettings(BaseModel):
    allow_proposals: bool = True
    max_proposals: Optional[int] = None
    proposal_deadline: Optional[datetime] = None
    auto_reject_after_deadline: bool = False

class ScreeningQuestion(BaseModel):
    question: str
    type: str # text, multiple_choice
    required: bool = True
    options: Optional[List[str]] = None

class JobPostWorkspace(BaseModel):
    is_active: bool = False
    team_members: Optional[List[PydanticObjectId]] = None
    milestones: Optional[List[PydanticObjectId]] = None
    total_paid: float = 0
    progress: int = 0  # 0–100 progress for dashboards
    roles_required: Optional[int] = None
    roles_filled: Optional[int] = None

class JobPost(Document):
    client_id: PydanticObjectId
    title: str
    description: str
    department: Optional[str] = None
    role: Optional[str] = None
    tags: Optional[List[str]] = None
    crew_size: Optional[str] = None # individual, small_crew, full_crew
    complexity: Optional[str] = None # simple, intermediate, complex
    budget_type: Optional[str] = None # fixed, hourly, daily, weekly
    budget: Optional[Budget] = None
    hourly_rate: Optional[Rate] = None
    daily_rate: Optional[Rate] = None
    weekly_rate: Optional[Rate] = None

    duration: Optional[str] = None
    estimated_duration: Optional[int] = None # in days
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    skills: Optional[List[str]] = None
    experience_level: Optional[str] = None # student, entry, intermediate, expert
    crew_call: Optional[List[CrewCall]] = None
    attachments: Optional[List[Attachment]] = None
    visibility: str = "public" # public, private, invited_only
    invited_crew: Optional[List[PydanticObjectId]] = None
    proposal_settings: Optional[ProposalSettings] = None
    questions: Optional[List[ScreeningQuestion]] = None
    status: str = "draft" # draft, open, in_progress, completed, cancelled, closed
    proposal_count: int = 0
    view_count: int = 0
    hired_crew: Optional[List[PydanticObjectId]] = None
    workspace: Optional[JobPostWorkspace] = None
    cover_image: Optional[str] = None  # hero/thumbnail for dashboards
    published_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    class Settings:
        name = "job_posts"
        indexes = [
            "client_id",
            "department",
            "role",
            "tags",
            "status",
            "skills",
            "budget.min",
            "budget.max",
        ]

# ============================================================================
# APPLICATIONS (Bids on Projects)
# ============================================================================

class MilestoneProposal(BaseModel):
    title: str
    description: str
    amount: float
    duration: int # in days
    deliverables: List[str]

class Application(Document):
    project_id: PydanticObjectId
    crew_id: PydanticObjectId
    team_id: Optional[PydanticObjectId] = None
    role: Optional[str] = None  # Role the creator is playing (e.g., "Video Editor", "UI/UX Designer", "Sound Engineer")
    cover_letter: str
    proposed_budget: Optional[float] = None
    proposed_duration: Optional[int] = None # in days
    hourly_rate: Optional[float] = None
    estimated_hours: Optional[int] = None
    team_members: Optional[List[dict]] = None
    question_answers: Optional[List[dict]] = None
    attachments: Optional[List[Attachment]] = None
    milestones: Optional[List[MilestoneProposal]] = None
    status: str = "submitted" # submitted, shortlisted, interviewing, accepted, rejected, withdrawn
    is_invited: bool = False
    client_viewed: bool = False
    client_viewed_at: Optional[datetime] = None
    client_notes: Optional[str] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None

    class Settings:
        name = "applications"
        indexes = [
            "project_id",
            "crew_id",
            "team_id",
            "status",
            "submitted_at",
        ]

# ============================================================================
# PRODUCTION COMPANIES
# ============================================================================

class TeamMember(BaseModel):
    user_id: PydanticObjectId
    role: str # founder, co-founder, member
    title: Optional[str] = None
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    permissions: Optional[dict] = None
    is_active: bool = True

class PastProduction(BaseModel):
    title: str
    description: Optional[str] = None
    media: Optional[List[str]] = None
    completed_date: Optional[datetime] = None
    client: Optional[str] = None
    testimonial: Optional[str] = None

# ============================================================================
# PRODUCTION COMPANIES - COMMENTED OUT (Not used by frontend)
# ============================================================================
# class ProductionCompany(Document):
#     name: str
#     slug: str
#     tagline: Optional[str] = None
#     description: Optional[str] = None
#     profile_picture: Optional[str] = None
#     cover_image: Optional[str] = None
#     members: List[TeamMember]
#     founder_id: PydanticObjectId
#     skills: Optional[List[str]] = None
#     categories: Optional[List[str]] = None
#     specializations: Optional[List[str]] = None
#     portfolio: Optional[List[PydanticObjectId]] = None
#     past_productions: Optional[List[PastProduction]] = None
#     minimum_project_size: Optional[float] = None
#     hourly_rate: Optional[Rate] = None
#     stats: Optional[dict] = None
#     rating: Optional[Rating] = None
#     is_available: bool = True
#     capacity: Optional[str] = None # full, limited, available
#     is_public: bool = True
#     accepting_projects: bool = True
#
#     class Settings:
#         name = "production_companies"
#         indexes = [
#             "slug",
#             "founder_id",
#             "members.user_id",
#             "skills",
#             "categories",
#             "is_public",
#             "is_available",
#         ]

# ============================================================================
# CONNECTIONS (LinkedIn-style Networking) - COMMENTED OUT (Not used by frontend)
# ============================================================================
# class Connection(Document):
#     requester_id: PydanticObjectId
#     recipient_id: PydanticObjectId
#     status: str # pending, accepted, declined, blocked
#     message: Optional[str] = None
#     mutual_connections: Optional[List[PydanticObjectId]] = None
#     mutual_connections_count: int = 0
#     last_interaction: Optional[datetime] = None
#     interaction_count: int = 0
#     requested_at: datetime = Field(default_factory=datetime.utcnow)
#     accepted_at: Optional[datetime] = None
#     declined_at: Optional[datetime] = None
#     updated_at: Optional[datetime] = None
#
#     class Settings:
#         name = "connections"
#         indexes = [
#             "requester_id",
#             "recipient_id",
#             "status",
#             "accepted_at",
#         ]

# ============================================================================
# MESSAGES & CHAT - COMMENTED OUT (Replaced by message.py models)
# ============================================================================
# class Participant(BaseModel):
#     user_id: PydanticObjectId
#     role: str # admin, member
#     joined_at: datetime = Field(default_factory=datetime.utcnow)
#     left_at: Optional[datetime] = None
#     last_read: Optional[datetime] = None
#     unread_count: int = 0
#     is_muted: bool = False
#     is_pinned: bool = False
#
# class LastMessage(BaseModel):
#     sender_id: Optional[PydanticObjectId] = None
#     text: Optional[str] = None
#     timestamp: Optional[datetime] = None
#     type: Optional[str] = None # text, file, system
#
# class Conversation(Document):
#     type: str # direct, project, team
#     participants: List[Participant]
#     project_id: Optional[PydanticObjectId] = None
#     team_id: Optional[PydanticObjectId] = None
#     order_id: Optional[PydanticObjectId] = None
#     title: Optional[str] = None
#     last_message: Optional[LastMessage] = None
#     is_active: bool = True
#     is_archived: bool = False
#
#     class Settings:
#         name = "conversations"
#         indexes = [
#             "participants.user_id",
#             "project_id",
#             "team_id",
#             "updated_at",
#         ]
#
# class MessageOffer(BaseModel):
#     amount: float
#     description: str
#     delivery_time: int
#     expires_at: Optional[datetime] = None
#     status: str = "pending" # pending, accepted, declined, expired
#
# class MessageMilestone(BaseModel):
#     milestone_id: PydanticObjectId
#     action: str # created, completed, approved, disputed
#
# class Message(Document):
#     conversation_id: PydanticObjectId
#     sender_id: PydanticObjectId
#     type: str # text, file, image, system, offer, milestone
#     text: Optional[str] = None
#     attachments: Optional[List[Attachment]] = None
#     offer: Optional[MessageOffer] = None
#     milestone: Optional[MessageMilestone] = None
#     is_edited: bool = False
#     edited_at: Optional[datetime] = None
#     is_deleted: bool = False
#     deleted_at: Optional[datetime] = None
#     read_by: Optional[List[dict]] = None
#     reply_to_message_id: Optional[PydanticObjectId] = None
#     timestamp: datetime = Field(default_factory=datetime.utcnow)
#
#     class Settings:
#         name = "messages"
#         indexes = [
#             "conversation_id",
#             "sender_id",
#             "timestamp",
#         ]

# ============================================================================
# ORDERS (When a Service is Purchased) - COMMENTED OUT (Not used by frontend)
# ============================================================================
# class OrderExtra(BaseModel):
#     extra_id: PydanticObjectId
#     title: str
#     price: float
#
# class OrderRequirement(BaseModel):
#     question: str
#     answer: str
#     attachments: Optional[List[str]] = None
#
# class Deliverable(BaseModel):
#     file_name: str
#     file_url: str
#     delivered_at: datetime = Field(default_factory=datetime.utcnow)
#
# class TimelineEvent(BaseModel):
#     status: str
#     timestamp: datetime = Field(default_factory=datetime.utcnow)
#     note: Optional[str] = None
#     user_id: Optional[PydanticObjectId] = None
#
# class Payment(BaseModel):
#     status: str # pending, held, released, refunded
#     method: Optional[str] = None
#     transaction_id: Optional[str] = None
#     paid_at: Optional[datetime] = None
#     released_at: Optional[datetime] = None
#     refunded_at: Optional[datetime] = None
#     refund_amount: Optional[float] = None
#
# class OrderReview(BaseModel):
#     rating: int
#     comment: Optional[str] = None
#     reviewed_at: datetime = Field(default_factory=datetime.utcnow)
#
# class Cancellation(BaseModel):
#     requested_by: PydanticObjectId
#     reason: str
#     requested_at: datetime = Field(default_factory=datetime.utcnow)
#     approved_at: Optional[datetime] = None
#     status: str = "pending" # pending, approved, denied
#
# class Dispute(BaseModel):
#     is_disputed: bool = False
#     disputed_by: Optional[PydanticObjectId] = None
#     reason: Optional[str] = None
#     disputed_at: Optional[datetime] = None
#     resolution: Optional[str] = None
#     resolved_at: Optional[datetime] = None

# class Order(Document):
#     order_number: str
#     buyer_id: PydanticObjectId
#     seller_id: PydanticObjectId
#     service_id: PydanticObjectId
#     package_type: str
#     package_price: float
#     extras: Optional[List[OrderExtra]] = None
#     subtotal: float
#     service_fee: float
#
#     total: float
#     currency: str
#     delivery_time: int # in days
#     expected_delivery_date: datetime
#     actual_delivery_date: Optional[datetime] = None
#     revisions: Optional[dict] = None
#     requirements: Optional[List[OrderRequirement]] = None
#     deliverables: Optional[List[Deliverable]] = None
#     status: str = "pending"
#     timeline: Optional[List[TimelineEvent]] = None
#     conversation_id: Optional[PydanticObjectId] = None
#     payment: Payment
#     review: Optional[dict] = None
#     cancellation: Optional[Cancellation] = None
#     dispute: Optional[Dispute] = None
#
#     class Settings:
#         name = "orders"
#         indexes = [
#             "order_number",
#             "buyer_id",
#             "seller_id",
#             "service_id",
#             "status",
#         ]
# ============================================================================
# DEAL MEMOS (For Project-based Work)
# ============================================================================

class Milestone(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    due_date: datetime
    deliverables: Optional[List[str]] = None
    status: str = "pending" # pending, in_progress, submitted, approved, paid
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    attachments: Optional[List[str]] = None

# class DealMemo(Document):
#     deal_memo_number: str
#     client_id: PydanticObjectId
#     crew_id: PydanticObjectId
#     is_team_contract: bool = False
#     team_id: Optional[PydanticObjectId] = None
#     project_id: PydanticObjectId
#     proposal_id: PydanticObjectId
#     title: str
#     description: Optional[str] = None
#     scope: Optional[str] = None
#     contract_type: str # fixed, hourly, daily, weekly, milestone
#     total_budget: Optional[float] = None
#     hourly_rate: Optional[float] = None
#     daily_rate: Optional[float] = None
#     weekly_rate: Optional[float] = None
#     currency: str = "USD"
#     start_date: datetime
#     end_date: Optional[datetime] = None
#     estimated_hours: Optional[int] = None
#     milestones: Optional[List[Milestone]] = None
#     weekly_limit: Optional[int] = None
#     payment_terms: Optional[str] = None
#     team_members: Optional[List[dict]] = None
#     status: str = "draft" # draft, active, paused, completed, terminated, disputed
#     total_hours_logged: float = 0
#     total_amount_paid: float = 0
#     attachments: Optional[List[Attachment]] = None
#     conversation_id: Optional[PydanticObjectId] = None
#     terminated_by: Optional[PydanticObjectId] = None
#     termination_reason: Optional[str] = None
#     terminated_at: Optional[datetime] = None
#
#     class Settings:
#         name = "deal_memos"
#         indexes = [
#             "deal_memo_number",
#             "client_id",
#             "crew_id",
#             "team_id",
#             "project_id",
#             "status",
#         ]

# ============================================================================
# TIME SHEETS (For Hourly Contracts)
# ============================================================================

# class TimeSheet(Document):
#     contract_id: PydanticObjectId
#     user_id: PydanticObjectId
#     description: Optional[str] = None
#     start_time: datetime
#     end_time: datetime
#     duration: float # in hours
#     is_manual: bool = False
#     hourly_rate: float
#     amount: float
#     status: str = "pending" # pending, approved, rejected, paid
#     approved_by: Optional[PydanticObjectId] = None
#     approved_at: Optional[datetime] = None
#
#     class Settings:
#         name = "time_sheets"
#         indexes = [
#             "contract_id",
#             "user_id",
#             "status",
#             "start_time",
#         ]

# ============================================================================
# REVIEWS & RATINGS
# ============================================================================

class ReviewRating(BaseModel):
    overall: int # 1-5
    communication: Optional[int] = None
    quality: Optional[int] = None
    expertise: Optional[int] = None
    professionalism: Optional[int] = None
    deadlines: Optional[int] = None
    value: Optional[int] = None

class ReviewResponse(BaseModel):
    text: str
    responded_at: datetime = Field(default_factory=datetime.utcnow)

class VotedBy(BaseModel):
    user_id: PydanticObjectId
    vote: str # helpful, not_helpful

# class Review(Document):
#     review_type: str # service, project, user, team
#     reviewer_id: PydanticObjectId
#     reviewee_id: PydanticObjectId
#     team_id: Optional[PydanticObjectId] = None
#     order_id: Optional[PydanticObjectId] = None
#     deal_memo_id: Optional[PydanticObjectId] = None
#     rating: ReviewRating
#     title: Optional[str] = None
#     comment: Optional[str] = None
#     pros: Optional[List[str]] = None
#     cons: Optional[List[str]] = None
#     would_recommend: Optional[bool] = None
#     would_work_again: Optional[bool] = None
#     response: Optional[ReviewResponse] = None
#     is_verified: bool = False
#     helpful_votes: int = 0
#     not_helpful_votes: int = 0
#     voted_by: Optional[List[VotedBy]] = None
#     status: str = "published" # published, pending, flagged, removed
#     is_public: bool = True
#
#     class Settings:
#         name = "reviews"
#         indexes = [
#             "reviewee_id",
#             "team_id",
#             "order_id",
#             "deal_memo_id",
#             "rating.overall",
#         ]

# ============================================================================
# PAYMENTS & TRANSACTIONS
# ============================================================================

class TeamSplit(BaseModel):
    user_id: PydanticObjectId
    amount: float
    percentage: float
    status: str = "pending" # pending, completed, failed

class TransactionMetadata(BaseModel):
    description: Optional[str] = None
    notes: Optional[str] = None
    invoice_url: Optional[str] = None
    project_title: Optional[str] = None
    milestone_title: Optional[str] = None

class Transaction(Document):
    transaction_id: str
    from_user_id: Optional[PydanticObjectId] = None
    to_user_id: Optional[PydanticObjectId] = None
    type: str # payment, withdrawal, refund, subscription, boost, verification, team_split
    amount: float
    currency: str = "USD"
    platform_fee: float = 0
    payment_processing_fee: float = 0
    net_amount: float
    order_id: Optional[PydanticObjectId] = None
    deal_memo_id: Optional[PydanticObjectId] = None
    milestone_id: Optional[PydanticObjectId] = None
    subscription_id: Optional[str] = None
    payment_method: Optional[str] = None # card, bank_transfer, paypal, stripe
    payment_provider: Optional[str] = None # stripe, paypal, wise
    external_transaction_id: Optional[str] = None
    team_split: Optional[List[TeamSplit]] = None
    status: str = "pending" # pending, processing, completed, failed, refunded, cancelled
    failure_reason: Optional[str] = None
    retry_count: int = 0
    initiated_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    metadata: Optional[TransactionMetadata] = None

    class Settings:
        name = "transactions"
        indexes = [
            "transaction_id",
            "from_user_id",
            "to_user_id",
            "order_id",
            "deal_memo_id",
            "status",
        ]

# ============================================================================
# WALLET & EARNINGS
# ============================================================================

class PayoutMethod(BaseModel):
    type: str # bank_transfer, paypal, stripe
    account_details: dict # encrypted sensitive information
    is_verified: bool = False
    verified_at: Optional[datetime] = None

# class Wallet(Document):
#     user_id: PydanticObjectId
#     available_balance: float = 0
#     pending_balance: float = 0
#     total_earnings: float = 0
#     total_withdrawn: float = 0
#     currency: str = "USD"
#     payout_method: Optional[PayoutMethod] = None
#     minimum_payout_amount: float = 0
#     auto_payout_enabled: bool = False
#     auto_payout_threshold: Optional[float] = None
#
#     class Settings:
#         name = "wallets"
#         indexes = [
#             "user_id",
#         ]

# ============================================================================
# NOTIFICATIONS
# ============================================================================

class RelatedEntity(BaseModel):
    type: str
    id: PydanticObjectId

class NotificationChannels(BaseModel):
    in_app: bool = True
    email: bool = False
    push: bool = False
    sms: bool = False

class Notification(Document):
    user_id: PydanticObjectId
    type: str # message, order, proposal, payment, review, connection, team_invite, system
    category: str # info, success, warning, alert
    title: str
    message: str
    related_entity: Optional[RelatedEntity] = None
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    actor_id: Optional[PydanticObjectId] = None
    actor_name: Optional[str] = None
    actor_image: Optional[str] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    channels: NotificationChannels = Field(default_factory=NotificationChannels)
    email_sent: bool = False
    push_sent: bool = False
    sms_sent: bool = False
    expires_at: Optional[datetime] = None

    class Settings:
        name = "notifications"
        indexes = [
            "user_id",
            "is_read",
            "type",
            "expires_at",
        ]

# ============================================================================
# BOOST CAMPAIGNS
# ============================================================================

class BoostStats(BaseModel):
    impressions: int = 0
    views: int = 0
    clicks: int = 0
    conversions: int = 0

# class Boost(Document):
#     user_id: PydanticObjectId
#     boost_type: str # profile, service, project
#     entity_id: PydanticObjectId
#     duration: int = 7 # in days
#     start_date: datetime
#     end_date: datetime
#     price: float
#     transaction_id: PydanticObjectId
#     stats: BoostStats = Field(default_factory=BoostStats)
#     status: str = "active" # active, scheduled, completed, cancelled
#
#     class Settings:
#         name = "boosts"
#         indexes = [
#             "user_id",
#             "entity_id",
#             "boost_type",
#             "status",
#             "end_date",
#         ]

# ============================================================================
# MATCHING SYSTEM (Tinder-style)
# ============================================================================

# class Match(Document):
#     user_id: PydanticObjectId
#     target_id: PydanticObjectId
#     target_type: str # user, project, service
#     action: str # like, pass, super_like
#     is_match: bool = False
#     matched_at: Optional[datetime] = None
#     match_context: Optional[str] = None # client_to_freelancer, freelancer_to_project, etc.
#     timestamp: datetime = Field(default_factory=datetime.utcnow)
#
#     class Settings:
#         name = "matches"
#         indexes = [
#             "user_id",
#             "target_id",
#             "is_match",
#             "matched_at",
#         ]

# ============================================================================
# COLLABORATION WORKSPACE
# ============================================================================

class WorkspaceMember(BaseModel):
    user_id: PydanticObjectId
    role: str # client, freelancer, team_member
    permissions: Optional[dict] = None
    joined_at: datetime = Field(default_factory=datetime.utcnow)

class Task(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[List[PydanticObjectId]] = None
    status: str = "todo" # todo, in_progress, review, completed
    priority: str = "medium" # low, medium, high
    due_date: Optional[datetime] = None
    project_name: Optional[str] = None  # For dashboard display (can be derived from workspace.project_id)
    created_by: PydanticObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class File(BaseModel):
    file_name: str
    file_url: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    uploaded_by: PydanticObjectId
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    folder: Optional[str] = None

class Activity(BaseModel):
    type: str
    user_id: PydanticObjectId
    description: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Workspace(Document):
    project_id: PydanticObjectId
    deal_memo_id: PydanticObjectId
    members: List[WorkspaceMember]
    tasks: Optional[List[Task]] = None
    files: Optional[List[File]] = None
    activity: Optional[List[Activity]] = None

    class Settings:
        name = "workspaces"
        indexes = [
            "project_id",
            "deal_memo_id",
            "members.user_id",
        ]

# ============================================================================
# SAVED ITEMS (Bookmarks)
# ============================================================================

# class SavedItem(Document):
#     user_id: PydanticObjectId
#     item_type: str # service, project, user, team
#     item_id: PydanticObjectId
#     collection: Optional[str] = None
#     tags: Optional[List[str]] = None
#     notes: Optional[str] = None
#     saved_at: datetime = Field(default_factory=datetime.utcnow)
#
#     class Settings:
#         name = "saved_items"
#         indexes = [
#             "user_id",
#             "item_type",
#             "collection",
#             "saved_at",
#         ]

# ============================================================================
# REPORTS & DISPUTES
# ============================================================================

# class Report(Document):
#     reporter_id: PydanticObjectId
#     report_type: str # user, service, project, order, message, review
#     reported_entity_id: PydanticObjectId
#     reported_user_id: PydanticObjectId
#     reason: str
#     description: Optional[str] = None
#     evidence: Optional[List[str]] = None
#     status: str = "pending" # pending, under_review, resolved, dismissed
#     reviewed_by: Optional[PydanticObjectId] = None
#     review_notes: Optional[str] = None
#     action: Optional[str] = None # warning, suspension, ban, content_removed, none
#     reviewed_at: Optional[datetime] = None
#
#     class Settings:
#         name = "reports"
#         indexes = [
#             "reporter_id",
#             "reported_user_id",
#             "status",
#         ]

# ============================================================================
# AI ASSISTANT "MIYA" INTERACTIONS
# ============================================================================

class MiyaInteraction(Document):
    user_id: PydanticObjectId
    interaction_type: str
    context: Optional[str] = None
    user_message: Optional[str] = None
    miya_response: Optional[str] = None
    action_taken: Optional[dict] = None
    was_helpful: Optional[bool] = None
    feedback_comment: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "miya_interactions"
        indexes = [
            "user_id",
            "interaction_type",
            "timestamp",
        ]

# ============================================================================
# ANALYTICS & INSIGHTS
# ============================================================================

# class Analytics(Document):
#     user_id: PydanticObjectId
#     period: str # daily, weekly, monthly, yearly
#     date: datetime
#     profile_views: int = 0
#     profile_search_appearances: int = 0
#     service_views: int = 0
#     service_clicks: int = 0
#     service_impressions: int = 0
#     service_orders: int = 0
#     project_views: int = 0
#     proposals_received: int = 0
#     proposals_sent: int = 0
#     proposals_accepted: int = 0
#     proposal_acceptance_rate: float = 0
#     revenue: float = 0
#     spending: float = 0
#     messages_sent: int = 0
#     messages_received: int = 0
#     connections_added: int = 0
#     conversion_rate: float = 0
#
#     class Settings:
#         name = "analytics"
#         indexes = [
#             "user_id",
#             "date",
#             "period",
#         ]

# ============================================================================
# SEARCH HISTORY & PREFERENCES
# ============================================================================

class ClickedResult(BaseModel):
    result_id: PydanticObjectId
    result_type: str
    clicked_at: datetime = Field(default_factory=datetime.utcnow)

# class SearchHistory(Document):
#     user_id: PydanticObjectId
#     search_type: str # service, project, freelancer, team
#     query: str
#     filters: Optional[dict] = None
#     results: int = 0
#     clicked_results: Optional[List[ClickedResult]] = None
#     timestamp: datetime = Field(default_factory=datetime.utcnow)
#
#     class Settings:
#         name = "search_history"
#         indexes = [
#             "user_id",
#             "search_type",
#             "timestamp",
#         ]

# ============================================================================
# SYSTEM LOGS (Admin/Monitoring)
# ============================================================================

# class SystemLog(Document):
#     log_level: str # info, warning, error, critical
#     category: str
#     message: str
#     details: Optional[dict] = None
#     user_id: Optional[PydanticObjectId] = None
#     ip_address: Optional[str] = None
#     user_agent: Optional[str] = None
#     stack_trace: Optional[str] = None
#     timestamp: datetime = Field(default_factory=datetime.utcnow)
#
#     class Settings:
#         name = "system_logs"
#         indexes = [
#             "log_level",
#             "category",
#             "user_id",
#             "timestamp",
#         ]

# ============================================================================
# CONTACT MESSAGES
# ============================================================================

class ContactMessage(Document):
    full_name: str
    email: str
    subject: Optional[str] = None
    message: Optional[str] = None
    source: Optional[str] = None  # web, marketing, support
    status: str = "open"  # open, resolved, archived
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "contact_messages"
        indexes = ["email", "status", "created_at"]