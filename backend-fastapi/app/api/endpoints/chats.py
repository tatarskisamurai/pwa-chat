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


async def _chat_response(chat: Chat, db: AsyncSession) -> dict:
    members_count = await db.scalar(select(func.count()).select_from(ChatMember).where(ChatMember.chat_id == chat.id))
    last_msg = await db.execute(
        select(Message)
        .where(Message.chat_id == chat.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    last_message = last_msg.scalar_one_or_none()
    return {
        "id": chat.id,
        "type": chat.type,
        "name": chat.name,
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
        out.append(ChatResponse(**(await _chat_response(c, db))))
    return out


@router.post("", response_model=ChatResponse)
async def create_chat(
    data: ChatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = Chat(type=data.type, name=data.name or None)
    db.add(chat)
    await db.flush()
    db.add(ChatMember(chat_id=chat.id, user_id=current_user.id, role="admin"))
    for uid in data.member_ids:
        if uid != current_user.id:
            db.add(ChatMember(chat_id=chat.id, user_id=uid, role="member"))
    await db.commit()
    await db.refresh(chat)
    return ChatResponse(**(await _chat_response(chat, db)))


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
    return ChatResponse(**(await _chat_response(chat, db)))


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
    return ChatResponse(**(await _chat_response(chat, db)))


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
