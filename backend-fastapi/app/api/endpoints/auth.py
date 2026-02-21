from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User
from app.schemas.user import UserCreate, UserResponse, Token, LoginRequest
from app.core.security import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_handle(handle: str) -> str:
    return handle.strip().lower().replace(" ", "_")


@router.post("/register", response_model=Token)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    handle = _normalize_handle(data.username)
    if not handle or len(handle) < 2:
        raise HTTPException(status_code=400, detail="Ник от 2 символов (латиница, цифры, _)")
    r = await db.execute(select(User).where(User.handle == handle))
    if r.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Этот ник уже занят")
    user = User(
        username=data.username.strip(),
        handle=handle,
        email=None,
        password_hash=get_password_hash(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(str(user.id), user.username)
    return Token(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=Token)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    handle = _normalize_handle(data.username)
    if not handle:
        raise HTTPException(status_code=401, detail="Неверный ник или пароль")
    r = await db.execute(select(User).where(User.handle == handle))
    user = r.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный ник или пароль")
    token = create_access_token(str(user.id), user.username)
    return Token(
        access_token=token,
        user=UserResponse.model_validate(user),
    )
