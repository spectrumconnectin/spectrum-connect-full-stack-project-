"""
Pydantic schemas for Message API endpoints
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ==================== Attachment Schemas ====================

class AttachmentResponse(BaseModel):
    """Response schema for file attachment"""
    id: str
    filename: str
    file_size: int
    file_type: str
    file_url: str
    uploaded_by: str
    uploaded_at: datetime


# ==================== Message Schemas ====================

class MessageCreate(BaseModel):
    """Schema for creating a new message"""
    conversation_id: str
    content: str
    attachment_ids: List[str] = []
    message_type: Optional[str] = "text"  # Optional field for frontend compatibility


class MessageUpdate(BaseModel):
    """Schema for updating a message"""
    content: str


class MessageResponse(BaseModel):
    """Response schema for a message"""
    id: str
    conversation_id: str
    sender_id: str
    content: str
    attachments: List[AttachmentResponse] = []
    sent_at: datetime
    edited_at: Optional[datetime] = None
    is_deleted: bool = False
    read_by: List[str] = []
    message_type: str = "text"


class MessageListResponse(BaseModel):
    """Paginated list of messages"""
    messages: List[MessageResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


# ==================== Conversation Schemas ====================

class ConversationCreate(BaseModel):
    """Schema for creating a new conversation"""
    participant_ids: List[str]  # List of user IDs to include
    job_id: Optional[str] = None  # Link to a job if project-related
    initial_message: Optional[str] = None  # First message to send


class ConversationParticipant(BaseModel):
    """Participant info for conversation"""
    user_id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_online: bool = False
    last_seen: Optional[datetime] = None


class ConversationResponse(BaseModel):
    """Response schema for a conversation"""
    id: str
    participants: List[ConversationParticipant]
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_sender_id: Optional[str] = None
    created_at: datetime
    conversation_type: str
    unread_count: int = 0  # Unread count for current user
    is_archived: bool = False


class ConversationListResponse(BaseModel):
    """Paginated list of conversations"""
    conversations: List[ConversationResponse]
    active_projects: List[ConversationResponse] = []  # Conversations linked to active jobs
    recent: List[ConversationResponse] = []  # All other conversations
    total: int


class ConversationDetailResponse(ConversationResponse):
    """Detailed conversation with additional info"""
    recent_messages: List[MessageResponse] = []
    project_progress: Optional[int] = None  # Percentage if linked to job
    team_members: List[ConversationParticipant] = []


# ==================== Typing Indicator Schemas ====================

class TypingIndicatorUpdate(BaseModel):
    """Schema for updating typing indicator"""
    conversation_id: str
    is_typing: bool


class TypingIndicatorResponse(BaseModel):
    """Response for typing indicator"""
    conversation_id: str
    typing_users: List[str]  # List of user IDs currently typing


# ==================== Read Receipt Schemas ====================

class MarkAsReadRequest(BaseModel):
    """Mark messages as read"""
    message_ids: List[str]


class ReadReceiptResponse(BaseModel):
    """Response for read receipt"""
    message_id: str
    read_by: List[str]
    read_at: datetime


# ==================== Search Schemas ====================

class MessageSearchRequest(BaseModel):
    """Search messages in conversations"""
    query: str
    conversation_id: Optional[str] = None  # Limit to specific conversation
    limit: int = Field(default=20, ge=1, le=100)


class MessageSearchResponse(BaseModel):
    """Search results"""
    results: List[MessageResponse]
    total: int


# ==================== Presence Schemas ====================

class PresenceUpdate(BaseModel):
    """Update user presence"""
    is_online: bool


class PresenceResponse(BaseModel):
    """User presence info"""
    user_id: str
    is_online: bool
    last_seen: datetime
    last_activity: datetime
