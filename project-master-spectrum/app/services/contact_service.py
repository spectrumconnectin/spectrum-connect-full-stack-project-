from __future__ import annotations
from app.models.schema import ContactMessage


class ContactService:
    @staticmethod
    async def create_message(full_name: str, email: str, subject: str | None, message: str | None, source: str | None = None):
        doc = ContactMessage(
            full_name=full_name,
            email=email,
            subject=subject,
            message=message,
            source=source or "web",
        )
        await doc.insert()
        return {"success": True}

