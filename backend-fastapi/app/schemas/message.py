from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class MessageBase(BaseModel):
    content: str | None = None
    type: str = "text"


class AttachmentCreate(BaseModel):
    url: str
    type: str | None = None
    filename: str | None = None


class MessageCreate(MessageBase):
    attachments: list[AttachmentCreate] = []


class MessageUpdate(BaseModel):
    content: str | None = None


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
    updated_at: datetime | None = None
    attachments: list[AttachmentResponse] = []
    sender_name: str | None = None  # для групповых чатов — ник отправителя

    class Config:
        from_attributes = True
