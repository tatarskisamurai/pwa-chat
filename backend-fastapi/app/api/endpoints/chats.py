from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import User, Chat, ChatMember, Message
from app.schemas.chat import ChatCreate, ChatResponse, ChatUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/chats", tags=["chats"])


async def _chat_response(chat: Chat, db: AsyncSession, current_user: User) -> dict:
    members_count = await db.scalar(select(func.count()).select_from(ChatMember).where(ChatMember.chat_id == chat.id))
    last_msg = await db.execute(
        select(Message)
        .where(Message.chat_id == chat.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    last_message = last_msg.scalar_one_or_none()
    display_name = chat.name
    if chat.type == "private" and members_count == 2:
        other = await db.execute(
            select(User)
            .where(User.id != current_user.id)
            .where(User.id.in_(select(ChatMember.user_id).where(ChatMember.chat_id == chat.id)))
        )
        other_user = other.scalar_one_or_none()
        if other_user:
            display_name = other_user.username or getattr(other_user, "handle", None) or str(other_user.id)
    return {
        "id": chat.id,
        "type": chat.type,
        "name": chat.name,
        "display_name": display_name,
        "created_at": chat.created_at,
        "members_count": members_count,
        "last_message": {
            "id": str(last_message.id),
            "content": last_message.content,
            "created_at": last_message.created_at.isoformat(),
        } if last_message else None,
    }


@router.get("", response_model=list[ChatResponse])
async def list_chats(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subq = select(ChatMember.chat_id).where(ChatMember.user_id == current_user.id)
    result = await db.execute(
        select(Chat).where(Chat.id.in_(subq)).order_by(Chat.updated_at.desc()).offset(skip).limit(limit)
    )
    chats = result.scalars().all()
    out = []
    for c in chats:
        out.append(ChatResponse(**(await _chat_response(c, db, current_user))))
    return out


@router.post("", response_model=ChatResponse)
async def create_chat(
    data: ChatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Для личного чата: если уже есть чат с этим же участником — возвращаем его
    if data.type == "private" and len(data.member_ids) == 1:
        other_id = data.member_ids[0]
        if other_id != current_user.id:
            q = select(Chat).where(
                Chat.type == "private",
                Chat.id.in_(select(ChatMember.chat_id).where(ChatMember.user_id == current_user.id)),
                Chat.id.in_(select(ChatMember.chat_id).where(ChatMember.user_id == other_id)),
            )
            existing = await db.execute(q)
            for chat in existing.scalars().all():
                n = await db.scalar(select(func.count()).select_from(ChatMember).where(ChatMember.chat_id == chat.id))
                if n == 2:
                    return ChatResponse(**(await _chat_response(chat, db, current_user)))

    chat = Chat(type=data.type, name=data.name or None)
    db.add(chat)
    await db.flush()
    db.add(ChatMember(chat_id=chat.id, user_id=current_user.id, role="admin"))
    for uid in data.member_ids:
        if uid != current_user.id:
            db.add(ChatMember(chat_id=chat.id, user_id=uid, role="member"))
    await db.commit()
    await db.refresh(chat)
    return ChatResponse(**(await _chat_response(chat, db, current_user)))


@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(
        select(Chat).where(Chat.id == chat_id)
    )
    chat = r.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    r2 = await db.execute(select(ChatMember).where(ChatMember.chat_id == chat_id, ChatMember.user_id == current_user.id))
    if not r2.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member")
    return ChatResponse(**(await _chat_response(chat, db, current_user)))


@router.patch("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: UUID,
    data: ChatUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = r.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    r2 = await db.execute(select(ChatMember).where(ChatMember.chat_id == chat_id, ChatMember.user_id == current_user.id))
    member = r2.scalar_one_or_none()
    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update")
    if data.name is not None:
        chat.name = data.name
    await db.commit()
    await db.refresh(chat)
    return ChatResponse(**(await _chat_response(chat, db, current_user)))


@router.delete("/{chat_id}", status_code=204)
async def delete_chat(
    chat_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = r.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    r2 = await db.execute(select(ChatMember).where(ChatMember.chat_id == chat_id, ChatMember.user_id == current_user.id))
    if not r2.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member")
    await db.delete(chat)
    await db.commit()
