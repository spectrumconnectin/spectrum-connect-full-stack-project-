"""
Message Service Layer

Handles business logic for messaging system:
- Creating and managing conversations
- Sending and retrieving messages
- File attachments
- Read receipts
- Typing indicators
"""

from datetime import datetime
from typing import List, Optional, Tuple
from beanie import PydanticObjectId
from beanie.operators import In, And
from fastapi import HTTPException, status

from app.models.message import Conversation, Message, MessageAttachment, UserPresence
from app.models.schema import User, JobPost


class MessageService:
    """Service for managing messages and conversations"""

    @staticmethod
    async def create_conversation(
        creator_id: str,
        participant_ids: List[str],
        job_id: Optional[str] = None,
        initial_message: Optional[str] = None
    ) -> Conversation:
        """
        Create a new conversation

        Args:
            creator_id: ID of user creating the conversation
            participant_ids: List of participant user IDs (should include creator)
            job_id: Optional job ID to link conversation to
            initial_message: Optional first message to send

        Returns:
            Created Conversation
        """
        # Ensure creator is in participants
        all_participants = list(set([creator_id] + participant_ids))

        # Check if conversation already exists between these participants
        existing = await Conversation.find_one(
            And(
                Conversation.participants == all_participants,
                Conversation.job_id == job_id
            )
        )
        if existing:
            return existing

        # Get job details if job_id provided
        job_title = None
        conversation_type = "direct"
        if job_id:
            job = await JobPost.get(PydanticObjectId(job_id))
            if job:
                job_title = job.title
                conversation_type = "job"
        elif len(all_participants) > 2:
            conversation_type = "group"

        # Initialize unread counts
        unread_counts = {user_id: 0 for user_id in all_participants}

        # Create conversation
        conversation = Conversation(
            participants=all_participants,
            job_id=job_id,
            job_title=job_title,
            created_by=creator_id,
            conversation_type=conversation_type,
            unread_counts=unread_counts
        )
        await conversation.insert()

        # Send initial message if provided
        if initial_message:
            await MessageService.send_message(
                conversation_id=str(conversation.id),
                sender_id=creator_id,
                content=initial_message
            )

        return conversation

    @staticmethod
    async def send_message(
        conversation_id: str,
        sender_id: str,
        content: str,
        attachment_ids: List[str] = None
    ) -> Message:
        """
        Send a message in a conversation

        Args:
            conversation_id: ID of conversation
            sender_id: ID of sender
            content: Message text
            attachment_ids: Optional list of attachment IDs

        Returns:
            Created Message
        """
        # Verify conversation exists and sender is participant
        conversation = await Conversation.get(PydanticObjectId(conversation_id))
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        if not conversation.is_participant(sender_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this conversation"
            )

        # Get attachments if provided
        attachments = []
        if attachment_ids:
            attachments = await MessageAttachment.find(
                In(MessageAttachment.id, [PydanticObjectId(aid) for aid in attachment_ids])
            ).to_list()

        # Create message
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            attachments=attachments,
            message_type="file" if attachments else "text"
        )
        await message.insert()

        # Update conversation last message
        conversation.last_message = content[:100]  # Truncate for preview
        conversation.last_message_at = message.sent_at
        conversation.last_message_sender_id = sender_id

        # Increment unread count for all participants except sender
        for participant_id in conversation.participants:
            if participant_id != sender_id:
                conversation.increment_unread(participant_id)

        await conversation.save()

        return message

    @staticmethod
    async def get_user_conversations(
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        include_archived: bool = False
    ) -> Tuple[List[Conversation], List[Conversation], int]:
        """
        Get all conversations for a user

        Args:
            user_id: User ID
            limit: Max conversations to return
            offset: Offset for pagination
            include_archived: Include archived conversations

        Returns:
            Tuple of (active_project_conversations, recent_conversations, total_count)
        """
        # Build query - find conversations where user_id is in participants array
        query = Conversation.find(
            {"participants": user_id}
        )

        # Filter archived
        if not include_archived:
            query = query.find({"archived_by": {"$ne": user_id}})

        # Get all conversations
        all_conversations = await query.sort(-Conversation.last_message_at).to_list()
        total = len(all_conversations)

        # Separate into active projects and recent
        active_projects = [c for c in all_conversations if c.job_id and c.conversation_type == "job"]
        recent = [c for c in all_conversations if not c.job_id or c.conversation_type != "job"]

        return active_projects[:limit], recent[:limit], total

    @staticmethod
    async def get_conversation_messages(
        conversation_id: str,
        user_id: str,
        limit: int = 50,
        before_message_id: Optional[str] = None
    ) -> Tuple[List[Message], int, bool]:
        """
        Get messages in a conversation (paginated)

        Args:
            conversation_id: Conversation ID
            user_id: User ID (for auth check)
            limit: Max messages to return
            before_message_id: Get messages before this message ID (for pagination)

        Returns:
            Tuple of (messages, total_count, has_more)
        """
        # Verify user is participant
        conversation = await Conversation.get(PydanticObjectId(conversation_id))
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        if not conversation.is_participant(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this conversation"
            )

        # Build query
        query = Message.find(
            Message.conversation_id == conversation_id,
            Message.is_deleted == False
        )

        # Pagination
        if before_message_id:
            before_message = await Message.get(PydanticObjectId(before_message_id))
            if before_message:
                query = query.find(Message.sent_at < before_message.sent_at)

        # Get messages
        messages = await query.sort(-Message.sent_at).limit(limit + 1).to_list()

        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]

        # Reverse to show oldest first
        messages.reverse()

        # Get total count
        total = await Message.find(
            Message.conversation_id == conversation_id,
            Message.is_deleted == False
        ).count()

        return messages, total, has_more

    @staticmethod
    async def mark_messages_as_read(
        conversation_id: str,
        user_id: str,
        message_ids: Optional[List[str]] = None
    ):
        """
        Mark messages as read

        Args:
            conversation_id: Conversation ID
            user_id: User ID
            message_ids: Optional specific message IDs (if None, marks all as read)
        """
        # Verify user is participant
        conversation = await Conversation.get(PydanticObjectId(conversation_id))
        if not conversation or not conversation.is_participant(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        # Build query
        if message_ids:
            query = Message.find(
                In(Message.id, [PydanticObjectId(mid) for mid in message_ids]),
                Message.conversation_id == conversation_id
            )
        else:
            query = Message.find(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id  # Don't mark own messages
            )

        # Update messages
        messages = await query.to_list()
        for message in messages:
            if user_id not in message.read_by:
                message.read_by.append(user_id)
                await message.save()

        # Update conversation unread count
        conversation.mark_as_read(user_id)
        await conversation.save()

    @staticmethod
    async def update_typing_indicator(
        conversation_id: str,
        user_id: str,
        is_typing: bool
    ):
        """
        Update typing indicator for a conversation

        Args:
            conversation_id: Conversation ID
            user_id: User ID
            is_typing: Whether user is typing
        """
        conversation = await Conversation.get(PydanticObjectId(conversation_id))
        if not conversation or not conversation.is_participant(user_id):
            return

        if is_typing:
            if user_id not in conversation.typing_users:
                conversation.typing_users.append(user_id)
        else:
            if user_id in conversation.typing_users:
                conversation.typing_users.remove(user_id)

        await conversation.save()

    @staticmethod
    async def archive_conversation(
        conversation_id: str,
        user_id: str
    ):
        """Archive a conversation for a user"""
        conversation = await Conversation.get(PydanticObjectId(conversation_id))
        if not conversation or not conversation.is_participant(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        if user_id not in conversation.archived_by:
            conversation.archived_by.append(user_id)
            await conversation.save()

    @staticmethod
    async def delete_message(
        message_id: str,
        user_id: str
    ):
        """Soft delete a message (only sender can delete)"""
        message = await Message.get(PydanticObjectId(message_id))
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )

        if message.sender_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own messages"
            )

        message.is_deleted = True
        message.deleted_at = datetime.utcnow()
        await message.save()

    @staticmethod
    async def update_user_presence(
        user_id: str,
        is_online: bool
    ):
        """Update user online/offline status"""
        presence = await UserPresence.find_one(UserPresence.user_id == user_id)

        if not presence:
            presence = UserPresence(user_id=user_id)

        presence.is_online = is_online
        presence.last_activity = datetime.utcnow()
        if not is_online:
            presence.last_seen = datetime.utcnow()

        await presence.save()

    @staticmethod
    async def get_user_presence(user_id: str) -> Optional[UserPresence]:
        """Get user presence status"""
        return await UserPresence.find_one(UserPresence.user_id == user_id)

    @staticmethod
    async def search_messages(
        user_id: str,
        query: str,
        conversation_id: Optional[str] = None,
        limit: int = 20
    ) -> List[Message]:
        """
        Search messages

        Args:
            user_id: User ID (for filtering to their conversations)
            query: Search query
            conversation_id: Optional conversation ID to limit search
            limit: Max results

        Returns:
            List of matching messages
        """
        # Get user's conversation IDs
        user_conversations = await Conversation.find(
            {"participants": user_id}
        ).to_list()
        conversation_ids = [str(c.id) for c in user_conversations]

        # Build search query
        search_query = {
            "conversation_id": {"$in": conversation_ids},
            "is_deleted": False,
            "content": {"$regex": query, "$options": "i"}  # Case-insensitive search
        }

        if conversation_id:
            search_query["conversation_id"] = conversation_id

        messages = await Message.find(search_query).limit(limit).to_list()
        return messages