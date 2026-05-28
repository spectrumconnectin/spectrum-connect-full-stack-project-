"""
Message API Routes

Endpoints for messaging system:
- Conversations (list, create, get details)
- Messages (send, list, delete, edit)
- Read receipts
- Typing indicators
- User presence
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import JSONResponse
from beanie import PydanticObjectId

from app.models.schema import User
from app.models.message import Conversation, Message, UserPresence, MessageAttachment
from app.services.message_service import MessageService
from app.api.schemas.message_schemas import (
    ConversationCreate,
    ConversationResponse,
    ConversationListResponse,
    ConversationDetailResponse,
    ConversationParticipant,
    MessageCreate,
    MessageResponse,
    MessageListResponse,
    AttachmentResponse,
    MarkAsReadRequest,
    TypingIndicatorUpdate,
    TypingIndicatorResponse,
    PresenceUpdate,
    PresenceResponse,
    MessageSearchRequest,
    MessageSearchResponse,
)
from app.auth.auth import get_current_user

router = APIRouter(prefix="/messages", tags=["Messages"])


# ==================== Helper Functions ====================

async def _conversation_to_response(
    conversation: Conversation,
    current_user_id: str
) -> ConversationResponse:
    """Convert Conversation model to response schema"""
    # Get participant details
    participants = []
    for participant_id in conversation.participants:
        try:
            user = await User.get(PydanticObjectId(participant_id))
        except Exception:
            user = None
        if user:
            # Get presence
            presence = await MessageService.get_user_presence(participant_id)
            is_online = presence.is_online if presence else False
            last_seen = presence.last_seen if presence else None

            participants.append(ConversationParticipant(
                user_id=str(user.id),
                username=user.username,
                display_name=user.profile.display_name if user.profile else None,
                avatar_url=user.profile.avatar if user.profile else None,
                is_online=is_online,
                last_seen=last_seen
            ))

    # Get unread count for current user
    unread_count = conversation.unread_counts.get(current_user_id, 0)

    # Check if archived
    is_archived = current_user_id in conversation.archived_by

    return ConversationResponse(
        id=str(conversation.id),
        participants=participants,
        job_id=conversation.job_id,
        job_title=conversation.job_title,
        last_message=conversation.last_message,
        last_message_at=conversation.last_message_at,
        last_message_sender_id=conversation.last_message_sender_id,
        created_at=conversation.created_at,
        conversation_type=conversation.conversation_type,
        unread_count=unread_count,
        is_archived=is_archived
    )


async def _message_to_response(message: Message) -> MessageResponse:
    """Convert Message model to response schema"""
    # Get attachments
    attachments = []
    for attachment in message.attachments:
        attachments.append(AttachmentResponse(
            id=str(attachment.id),
            filename=attachment.filename,
            file_size=attachment.file_size,
            file_type=attachment.file_type,
            file_url=attachment.file_url,
            uploaded_by=attachment.uploaded_by,
            uploaded_at=attachment.uploaded_at
        ))

    return MessageResponse(
        id=str(message.id),
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        content=message.content,
        attachments=attachments,
        sent_at=message.sent_at,
        edited_at=message.edited_at,
        is_deleted=message.is_deleted,
        read_by=message.read_by,
        message_type=message.message_type
    )


# ==================== Conversation Endpoints ====================

@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    data: ConversationCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new conversation

    - Direct message: 2 participants
    - Group chat: 3+ participants
    - Job-related: Include job_id
    """
    conversation = await MessageService.create_conversation(
        creator_id=str(current_user.id),
        participant_ids=data.participant_ids,
        job_id=data.job_id,
        initial_message=data.initial_message
    )

    return await _conversation_to_response(conversation, str(current_user.id))


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    include_archived: bool = Query(default=False),
    current_user: User = Depends(get_current_user)
):
    """
    Get all conversations for current user

    Separated into:
    - active_projects: Conversations linked to active jobs
    - recent: All other conversations
    """
    active_projects, recent, total = await MessageService.get_user_conversations(
        user_id=str(current_user.id),
        limit=limit,
        offset=offset,
        include_archived=include_archived
    )

    # Convert to response format
    active_projects_responses = [
        await _conversation_to_response(c, str(current_user.id))
        for c in active_projects
    ]
    recent_responses = [
        await _conversation_to_response(c, str(current_user.id))
        for c in recent
    ]

    return ConversationListResponse(
        conversations=active_projects_responses + recent_responses,
        active_projects=active_projects_responses,
        recent=recent_responses,
        total=total
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get detailed conversation info with recent messages"""
    conversation = await Conversation.get(PydanticObjectId(conversation_id))
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    if not conversation.is_participant(str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    # Get recent messages
    messages, _, _ = await MessageService.get_conversation_messages(
        conversation_id=conversation_id,
        user_id=str(current_user.id),
        limit=20
    )

    recent_messages = [await _message_to_response(m) for m in messages]

    # Get base response
    base_response = await _conversation_to_response(conversation, str(current_user.id))

    # Build detailed response
    return ConversationDetailResponse(
        **base_response.dict(),
        recent_messages=recent_messages,
        team_members=base_response.participants  # Same as participants for now
    )


@router.post("/conversations/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Archive a conversation"""
    await MessageService.archive_conversation(conversation_id, str(current_user.id))
    return JSONResponse({"message": "Conversation archived"})


# ==================== Message Endpoints ====================

@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Send a message in a conversation (alias for /send)
    
    This endpoint accepts the same payload as /send and is used by the creator messages page.
    """
    message = await MessageService.send_message(
        conversation_id=data.conversation_id,
        sender_id=str(current_user.id),
        content=data.content,
        attachment_ids=data.attachment_ids
    )

    return await _message_to_response(message)


@router.post("/send", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Send a message in a conversation"""
    message = await MessageService.send_message(
        conversation_id=data.conversation_id,
        sender_id=str(current_user.id),
        content=data.content,
        attachment_ids=data.attachment_ids
    )

    return await _message_to_response(message)


@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
async def get_conversation_messages(
    conversation_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    before_message_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user)
):
    """
    Get messages in a conversation (paginated)

    Use before_message_id for pagination (load older messages)
    """
    messages, total, has_more = await MessageService.get_conversation_messages(
        conversation_id=conversation_id,
        user_id=str(current_user.id),
        limit=limit,
        before_message_id=before_message_id
    )

    message_responses = [await _message_to_response(m) for m in messages]

    return MessageListResponse(
        messages=message_responses,
        total=total,
        page=1,  # Calculate based on offset if needed
        page_size=limit,
        has_more=has_more
    )


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a message (soft delete)"""
    await MessageService.delete_message(message_id, str(current_user.id))


# ==================== Read Receipts ====================

@router.post("/conversations/{conversation_id}/read")
async def mark_as_read(
    conversation_id: str,
    data: Optional[MarkAsReadRequest] = None,
    current_user: User = Depends(get_current_user)
):
    """Mark messages as read"""
    message_ids = data.message_ids if data else None

    await MessageService.mark_messages_as_read(
        conversation_id=conversation_id,
        user_id=str(current_user.id),
        message_ids=message_ids
    )

    return JSONResponse({"message": "Messages marked as read"})


# ==================== Typing Indicators ====================

@router.post("/typing", response_model=TypingIndicatorResponse)
async def update_typing_indicator(
    data: TypingIndicatorUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update typing indicator"""
    await MessageService.update_typing_indicator(
        conversation_id=data.conversation_id,
        user_id=str(current_user.id),
        is_typing=data.is_typing
    )

    # Get updated typing users
    conversation = await Conversation.get(PydanticObjectId(data.conversation_id))
    typing_users = conversation.typing_users if conversation else []

    return TypingIndicatorResponse(
        conversation_id=data.conversation_id,
        typing_users=typing_users
    )


# ==================== User Presence ====================

@router.post("/presence")
async def update_presence(
    data: PresenceUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user online/offline status"""
    await MessageService.update_user_presence(
        user_id=str(current_user.id),
        is_online=data.is_online
    )

    return JSONResponse({"message": "Presence updated"})


@router.get("/presence/{user_id}", response_model=PresenceResponse)
async def get_user_presence(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get user presence status"""
    presence = await MessageService.get_user_presence(user_id)

    if not presence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User presence not found"
        )

    return PresenceResponse(
        user_id=presence.user_id,
        is_online=presence.is_online,
        last_seen=presence.last_seen,
        last_activity=presence.last_activity
    )


# ==================== Search ====================

@router.post("/search", response_model=MessageSearchResponse)
async def search_messages(
    data: MessageSearchRequest,
    current_user: User = Depends(get_current_user)
):
    """Search messages"""
    messages = await MessageService.search_messages(
        user_id=str(current_user.id),
        query=data.query,
        conversation_id=data.conversation_id,
        limit=data.limit
    )

    message_responses = [await _message_to_response(m) for m in messages]

    return MessageSearchResponse(
        results=message_responses,
        total=len(message_responses)
    )


# ==================== File Upload (Placeholder) ====================

@router.post("/attachments/upload", response_model=AttachmentResponse)
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a file attachment

    TODO: Implement actual file storage (S3, local, etc.)
    For now, returns a placeholder
    """
    # Placeholder implementation
    # In production, upload to S3 or local storage
    attachment = MessageAttachment(
        filename=file.filename,
        file_size=0,  # Get from file
        file_type=file.content_type,
        file_url=f"/uploads/{file.filename}",  # Placeholder
        uploaded_by=str(current_user.id)
    )
    await attachment.insert()

    return AttachmentResponse(
        id=str(attachment.id),
        filename=attachment.filename,
        file_size=attachment.file_size,
        file_type=attachment.file_type,
        file_url=attachment.file_url,
        uploaded_by=attachment.uploaded_by,
        uploaded_at=attachment.uploaded_at
    )