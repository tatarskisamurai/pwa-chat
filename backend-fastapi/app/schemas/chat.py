from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class ChatBase(BaseModel):
    type: str = "private"
    name: str | None = None


class ChatCreate(ChatBase):
    member_ids: list[UUID] = []


class ChatUpdate(BaseModel):
    name: str | None = None


class ChatMemberResponse(BaseModel):
    user_id: UUID
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    id: UUID
    type: str
    name: str | None
    display_name: str | None = None  # для личного чата — имя собеседника
    created_at: datetime
    members_count: int | None = None
    last_message: dict | None = None

    class Config:
        from_attributes = True
