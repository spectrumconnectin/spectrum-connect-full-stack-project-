"""
AI API Routes

Endpoints for AI assistant interactions
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any

from app.models.schema import User
from app.services.ai_service import AIService
from app.auth.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request schema for chat endpoint"""
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    """Response schema for chat endpoint"""
    response: str


class FeedbackRequest(BaseModel):
    """Request schema for feedback"""
    interaction_id: str
    was_helpful: bool
    feedback_comment: str = None


class ConversationHistoryResponse(BaseModel):
    """Response schema for conversation history"""
    messages: List[Dict[str, Any]]


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Chat with AI assistant

    Accepts conversation history and returns AI response
    """
    try:
        # Get the latest user message
        user_messages = [m for m in request.messages if m.role == "user"]
        if not user_messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No user message found"
            )

        latest_message = user_messages[-1].content

        # Convert messages to dict format for service
        conversation_history = [
            {"role": m.role, "content": m.content}
            for m in request.messages[:-1]  # Exclude the latest message
        ]

        # Process the message
        response = await AIService.process_chat_message(
            user_id=str(current_user.id),
            message=latest_message,
            conversation_history=conversation_history
        )

        return ChatResponse(response=response)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat_with_ai: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message"
        )


@router.get("/conversation-history", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    interaction_type: str = "chat",
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """
    Get user's conversation history with AI assistant

    Query params:
    - interaction_type: Type of interaction (default: "chat")
    - limit: Maximum number of messages (default: 50)
    """
    try:
        history = await AIService.get_conversation_history(
            user_id=str(current_user.id),
            interaction_type=interaction_type,
            limit=limit
        )

        return ConversationHistoryResponse(messages=history)

    except Exception as e:
        print(f"Error in get_conversation_history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load conversation history"
        )


@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Submit feedback for an AI interaction

    Allows users to rate AI responses as helpful/not helpful
    """
    try:
        success = await AIService.submit_feedback(
            interaction_id=request.interaction_id,
            was_helpful=request.was_helpful,
            feedback_comment=request.feedback_comment
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interaction not found"
            )

        return {"success": True, "message": "Feedback submitted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in submit_feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )
