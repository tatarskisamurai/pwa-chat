from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class MessageBase(BaseModel):
    content: str | None = None
    type: str = "text"


class MessageCreate(MessageBase):
    pass


class AttachmentResponse(BaseModel):
    id: UUID
    url: str
    type: str | None
    filename: str | None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: UUID
    chat_id: UUID
    user_id: UUID
    content: str | None
    type: str
    created_at: datetime
    attachments: list[AttachmentResponse] = []

    class Config:
        from_attributes = True
