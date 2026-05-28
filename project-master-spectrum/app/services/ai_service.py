"""
AI Service

Handles AI assistant interactions and conversation management
"""

from typing import Dict, Any, List
from datetime import datetime
from beanie import PydanticObjectId

from app.models.schema import MiyaInteraction, User


class AIService:
    """Service for AI assistant interactions"""

    @staticmethod
    async def create_interaction(
        user_id: str,
        interaction_type: str,
        user_message: str,
        miya_response: str,
        context: str = None
    ) -> Dict[str, Any]:
        """
        Create and store an AI interaction

        Args:
        - user_id: User ID
        - interaction_type: Type of interaction (e.g., "chat", "brief_generation")
        - user_message: User's message
        - miya_response: AI assistant's response
        - context: Additional context
        """
        try:
            interaction = MiyaInteraction(
                user_id=PydanticObjectId(user_id),
                interaction_type=interaction_type,
                context=context,
                user_message=user_message,
                miya_response=miya_response,
                timestamp=datetime.utcnow()
            )
            await interaction.insert()

            return {
                "id": str(interaction.id),
                "user_message": user_message,
                "miya_response": miya_response,
                "timestamp": interaction.timestamp.isoformat()
            }

        except Exception as e:
            print(f"Error in AIService.create_interaction: {e}")
            return {}

    @staticmethod
    async def get_conversation_history(
        user_id: str,
        interaction_type: str = "chat",
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get user's conversation history with AI assistant

        Args:
        - user_id: User ID
        - interaction_type: Type of interaction to filter
        - limit: Maximum number of messages to return
        """
        try:
            interactions = await MiyaInteraction.find(
                MiyaInteraction.user_id == PydanticObjectId(user_id),
                MiyaInteraction.interaction_type == interaction_type
            ).sort(-MiyaInteraction.timestamp).limit(limit).to_list()

            # Return in chronological order (oldest first)
            history = []
            for interaction in reversed(interactions):
                history.append({
                    "role": "user",
                    "content": interaction.user_message or "",
                    "timestamp": interaction.timestamp.isoformat()
                })
                history.append({
                    "role": "assistant",
                    "content": interaction.miya_response or "",
                    "timestamp": interaction.timestamp.isoformat()
                })

            return history

        except Exception as e:
            print(f"Error in AIService.get_conversation_history: {e}")
            return []

    @staticmethod
    async def process_chat_message(
        user_id: str,
        message: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> str:
        """
        Process a chat message and generate AI response

        Args:
        - user_id: User ID
        - message: User's message
        - conversation_history: Previous messages in the conversation

        Returns:
        - AI assistant's response
        """
        try:
            # Get user for context
            user = await User.get(PydanticObjectId(user_id))
            user_name = "there"
            if user and user.profile:
                user_name = user.profile.display_name or user.username

            # Build context from conversation history
            context_messages = conversation_history or []

            # Simple AI response logic (replace with actual AI API call)
            # This is a placeholder - in production, you'd call OpenAI, Anthropic, etc.
            response = await AIService._generate_ai_response(
                message,
                context_messages,
                user_name
            )

            # Store the interaction
            await AIService.create_interaction(
                user_id=user_id,
                interaction_type="chat",
                user_message=message,
                miya_response=response,
                context=f"{len(context_messages)} previous messages"
            )

            return response

        except Exception as e:
            print(f"Error in AIService.process_chat_message: {e}")
            return "I'm sorry, I encountered an error processing your message. Please try again."

    @staticmethod
    async def _generate_ai_response(
        message: str,
        context_messages: List[Dict[str, str]],
        user_name: str
    ) -> str:
        """
        Generate AI response (placeholder for actual AI integration)

        In production, this would call:
        - OpenAI API
        - Anthropic Claude API
        - Google Gemini API
        - Or your custom AI model
        """

        # Simple keyword-based responses for demonstration
        message_lower = message.lower()

        if "brief" in message_lower and ("write" in message_lower or "create" in message_lower or "generate" in message_lower):
            return f"""I'd be happy to help you create a project brief! Here's a comprehensive brief structure:

**Project Brief Template:**

1. **Project Overview**
   - What is the project about?
   - What problem does it solve?

2. **Objectives**
   - What are the key goals?
   - What does success look like?

3. **Target Audience**
   - Who is this for?
   - What are their needs?

4. **Deliverables**
   - What will be created?
   - What format/specifications?

5. **Timeline & Budget**
   - When is it due?
   - What's the budget range?

Would you like me to help you fill in any specific sections? Just provide some details about your project!"""

        elif "collaborator" in message_lower or "team" in message_lower:
            return f"""To suggest the perfect collaborators for your project, I need to understand:

1. **Project Type**: What kind of project is it? (e.g., video production, branding, app development)

2. **Required Skills**: What specific skills do you need? (e.g., cinematography, UI/UX design, copywriting)

3. **Project Scope**: Is this a small, medium, or large project?

4. **Timeline**: How urgent is the project?

5. **Budget Range**: What's your budget for collaborators?

Share these details and I can help you find the perfect team members from our Spectrum Connect community!"""

        elif "portfolio" in message_lower or "profile" in message_lower:
            return f"""Great! I can help you optimize your {user_name}'s portfolio or profile. Here are some tips:

**Portfolio Optimization:**

1. **Compelling Headline**: Clearly state what you do and your unique value
2. **Strong Opening**: Lead with your best, most relevant work
3. **Project Storytelling**: For each project, include:
   - The challenge
   - Your approach
   - The results/impact
4. **Visual Quality**: High-resolution images, proper formatting
5. **Diversity**: Show range while maintaining consistency
6. **Client Testimonials**: Add credibility with reviews

Would you like me to review specific sections of your portfolio or help you write better project descriptions?"""

        elif "proposal" in message_lower:
            return f"""I'll help you create a winning proposal! A great proposal should include:

**Proposal Structure:**

1. **Understanding**: Show you understand their needs
2. **Approach**: Explain your methodology
3. **Deliverables**: Be specific about what you'll provide
4. **Timeline**: Include milestones and deadlines
5. **Investment**: Clear pricing breakdown
6. **Why You**: Your unique value proposition
7. **Next Steps**: Clear call to action

What type of project is this proposal for? Share some details and I'll help you craft a compelling proposal!"""

        elif any(greeting in message_lower for greeting in ["hello", "hi", "hey"]):
            return f"""Hello {user_name}! 👋

I'm Spectrum AI, your creative collaboration assistant. I'm here to help you with:

✨ **Project Briefs**: Generate comprehensive briefs for any creative project
🎯 **Proposals**: Craft winning proposals that land clients
👥 **Team Building**: Find perfect collaborators for your projects
📝 **Portfolio**: Optimize your portfolio and project descriptions
💡 **Strategy**: Get expert guidance on creative direction

What would you like to work on today?"""

        else:
            # Generic helpful response
            return f"""I understand you're asking about: "{message}"

I specialize in helping with creative projects on Spectrum Connect. I can assist you with:

• **Writing project briefs** - Get detailed, professional briefs
• **Finding collaborators** - Match with the right talent
• **Optimizing proposals** - Increase your win rate
• **Portfolio guidance** - Showcase your best work
• **Creative strategy** - Expert direction for your projects

Could you provide more details about what you need help with? I'm here to make your creative collaboration easier and more effective!"""

    @staticmethod
    async def submit_feedback(
        interaction_id: str,
        was_helpful: bool,
        feedback_comment: str = None
    ) -> bool:
        """
        Submit feedback for an AI interaction

        Args:
        - interaction_id: ID of the interaction
        - was_helpful: Whether the response was helpful
        - feedback_comment: Optional feedback comment
        """
        try:
            interaction = await MiyaInteraction.get(PydanticObjectId(interaction_id))
            if not interaction:
                return False

            interaction.was_helpful = was_helpful
            if feedback_comment:
                interaction.feedback_comment = feedback_comment

            await interaction.save()
            return True

        except Exception as e:
            print(f"Error in AIService.submit_feedback: {e}")
            return False
