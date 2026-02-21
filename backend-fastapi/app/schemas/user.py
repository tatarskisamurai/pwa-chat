from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class UserBase(BaseModel):
    username: str
    handle: str
    email: str | None = None


class UserCreate(BaseModel):
    username: str  # ник — по нему же вход и поиск (нормализуется в handle)
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
    username: str  # ник (логин)
    password: str
