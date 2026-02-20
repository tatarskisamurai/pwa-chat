from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    username: str
    handle: str
    email: EmailStr


class UserCreate(BaseModel):
    username: str
    handle: str  # уникальный ID (латиница, цифры, _), без @
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    username: str | None = None
    handle: str | None = None
    avatar: str | None = None
    online_status: str | None = None


class UserResponse(UserBase):
    id: UUID
    avatar: str | None = None
    online_status: str = "offline"
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
