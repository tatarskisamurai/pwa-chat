from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models import User
from app.schemas.user import UserResponse, UserUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["users"])
# Роутер с динамическим путём подключаем отдельно и после статических, чтобы /list не матчился как {user_id}
router_with_id = APIRouter(prefix="/users", tags=["users"])


@router.get("/list", response_model=list[UserResponse])
async def list_users(
    search: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    term = (search or "").lstrip("@").strip().lower()
    if not term:
        return []
    # Ищем по handle (ID) или по username на случай старых записей
    q = (
        select(User)
        .where(User.id != current_user.id)
        .where(
            or_(
                User.handle.ilike(f"%{term}%"),
                User.username.ilike(f"%{term}%"),
            )
        )
        .order_by(User.handle)
        .limit(limit)
    )
    r = await db.execute(q)
    out = []
    for u in r.scalars().all():
        # На случай если в БД нет колонки handle или она NULL
        handle_val = getattr(u, "handle", None) or getattr(u, "username", "") or ""
        out.append(
            UserResponse(
                id=u.id,
                username=u.username,
                handle=handle_val,
                email=u.email,
                avatar=u.avatar,
                online_status=u.online_status or "offline",
                created_at=u.created_at,
            )
        )
    return out


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.username is not None:
        current_user.username = data.username
    if data.handle is not None:
        h = data.handle.strip().lower()
        if len(h) < 2:
            raise HTTPException(status_code=400, detail="ID от 2 символов")
        r = await db.execute(select(User).where(User.handle == h, User.id != current_user.id))
        if r.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Этот ID уже занят")
        current_user.handle = h
    if data.avatar is not None:
        current_user.avatar = data.avatar
    if data.online_status is not None:
        current_user.online_status = data.online_status
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router_with_id.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(User).where(User.id == user_id))
    user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)
