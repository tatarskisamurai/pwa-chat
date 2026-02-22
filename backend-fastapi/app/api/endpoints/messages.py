from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import User, Chat, ChatMember, Message, Attachment
from app.schemas.message import MessageCreate, MessageResponse, AttachmentResponse, AttachmentCreate
from app.api.deps import get_current_user
from app.ws_manager import ws_manager

router = APIRouter(prefix="/messages", tags=["messages"])


def _message_to_response(msg: Message) -> dict:
    return {
        "id": msg.id,
        "chat_id": msg.chat_id,
        "user_id": msg.user_id,
        "content": msg.content,
        "type": msg.type,
        "created_at": msg.created_at,
        "attachments": [AttachmentResponse.model_validate(a) for a in msg.attachments],
    }


@router.get("/chat/{chat_id}", response_model=list[MessageResponse])
async def list_messages(
    chat_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(ChatMember).where(ChatMember.chat_id == chat_id, ChatMember.user_id == current_user.id))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member")
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .options(selectinload(Message.attachments))
        .order_by(Message.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    messages = result.scalars().all()
    return [MessageResponse(**_message_to_response(m)) for m in reversed(messages)]


@router.post("/chat/{chat_id}", response_model=MessageResponse)
async def create_message(
    chat_id: UUID,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(ChatMember).where(ChatMember.chat_id == chat_id, ChatMember.user_id == current_user.id))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member")
    msg_type = data.type or ("image" if data.attachments else "text")
    msg = Message(
        chat_id=chat_id,
        user_id=current_user.id,
        content=data.content,
        type=msg_type,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    for att in data.attachments:
        att_obj = Attachment(
            message_id=msg.id,
            url=att.url,
            type=att.type,
            filename=att.filename,
        )
        db.add(att_obj)
    await db.commit()
    result = await db.execute(select(Message).where(Message.id == msg.id).options(selectinload(Message.attachments)))
    msg = result.scalar_one()
    resp = _message_to_response(msg)
    payload = {
        "id": str(msg.id),
        "chat_id": str(msg.chat_id),
        "user_id": str(msg.user_id),
        "content": msg.content,
        "type": msg.type,
        "created_at": msg.created_at.isoformat(),
        "attachments": [{"id": str(a.id), "url": a.url, "type": a.type, "filename": a.filename} for a in msg.attachments],
    }
    try:
        await ws_manager.broadcast_to_chat(str(chat_id), {"type": "new_message", "message": payload})
        members = await db.execute(select(ChatMember.user_id).where(ChatMember.chat_id == chat_id))
        for (member_uid,) in members.all():
            await ws_manager.broadcast_to_user(str(member_uid), {"type": "chats_updated"})
    except Exception:
        pass
    return MessageResponse(**resp)


@router.get("/search", response_model=list[MessageResponse])
async def search_messages(
    q: str = Query(..., min_length=1),
    chat_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import or_
    subq = select(ChatMember.chat_id).where(ChatMember.user_id == current_user.id)
    query = select(Message).options(selectinload(Message.attachments)).where(
        Message.chat_id.in_(subq),
        Message.content.ilike(f"%{q}%"),
    )
    if chat_id:
        query = query.where(Message.chat_id == chat_id)
    query = query.order_by(Message.created_at.desc()).limit(50)
    result = await db.execute(query)
    messages = result.scalars().all()
    return [MessageResponse(**_message_to_response(m)) for m in messages]
