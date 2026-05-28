"""
Message and Conversation Models for Spectrum Connect

Handles:
- Conversations (threads) between users
- Individual messages within conversations
- File attachments
- Read receipts
- Typing indicators
"""

from datetime import datetime
from typing import Optional, List
from beanie import Document, Indexed, Link
from pydantic import Field


class MessageAttachment(Document):
    """
    File attachment for a message
    """
    # File info
    filename: str
    file_size: int  # bytes
    file_type: str  # MIME type (e.g., "video/mp4", "image/png")
    file_url: str  # URL to stored file (S3, local storage, etc.)

    # Metadata
    uploaded_by: Indexed(str)  # user_id
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "message_attachments"
        indexes = ["uploaded_by"]


class Message(Document):
    """
    Individual message in a conversation
    """
    # Core fields
    conversation_id: Indexed(str)
    sender_id: Indexed(str)  # user_id who sent the message
    content: str  # message text

    # Attachments
    attachments: List[Link[MessageAttachment]] = []

    # Metadata
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None  # Soft delete
    is_deleted: bool = False

    # Read receipts
    read_by: List[str] = []  # List of user_ids who have read this message

    # Message type (for system messages)
    message_type: str = "text"  # "text", "system", "file"

    class Settings:
        name = "messages"
        indexes = [
            "conversation_id",
            "sender_id",
            "sent_at",
            [("conversation_id", 1), ("sent_at", -1)],  # Compound index for pagination
        ]


class Conversation(Document):
    """
    Conversation thread between users

    Can be:
    - Direct message (2 participants)
    - Group chat (multiple participants)
    - Job-related conversation (linked to a JobPost)
    """
    # Participants
    participants: List[Indexed(str)] = []  # List of user_ids

    # Project/Job context (optional)
    job_id: Optional[Indexed(str)] = None  # Link to JobPost if conversation is project-related
    job_title: Optional[str] = None  # Denormalized for quick access

    # Last message info (denormalized for list view)
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_sender_id: Optional[str] = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str  # user_id who initiated the conversation

    # Conversation type
    conversation_type: str = "direct"  # "direct", "group", "job"

    # Archiving
    archived_by: List[str] = []  # List of user_ids who archived this conversation

    # Unread counts per user (denormalized for performance)
    unread_counts: dict = {}  # {user_id: count}

    # Typing indicators
    typing_users: List[str] = []  # List of user_ids currently typing

    class Settings:
        name = "conversations"
        indexes = [
            "participants",
            "job_id",
            "created_by",
            "last_message_at",
            [("participants", 1), ("last_message_at", -1)],  # Compound for user's conversations
        ]

    def is_participant(self, user_id: str) -> bool:
        """Check if user is participant in conversation"""
        return user_id in self.participants

    def mark_as_read(self, user_id: str):
        """Mark conversation as read for a user"""
        if user_id in self.unread_counts:
            self.unread_counts[user_id] = 0

    def increment_unread(self, user_id: str):
        """Increment unread count for a user"""
        if user_id not in self.unread_counts:
            self.unread_counts[user_id] = 0
        self.unread_counts[user_id] += 1


class UserPresence(Document):
    """
    Track user online/offline status
    """
    user_id: Indexed(str, unique=True)
    is_online: bool = False
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "user_presence"
        indexes = ["user_id", "is_online"]
