"""WebSocket API: один эндпоинт для real-time (join_chat, send_message, new_message)."""
import json
import logging
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import User, ChatMember, Message
from app.ws_manager import ws_manager
from app.core.security import decode_token

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_user_from_token(token: str) -> User | None:
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        return None
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(User).where(User.id == UUID(payload["sub"])))
        return r.scalar_one_or_none()


def _message_to_dict(msg: Message) -> dict:
    return {
        "id": str(msg.id),
        "chat_id": str(msg.chat_id),
        "user_id": str(msg.user_id),
        "content": msg.content,
        "type": msg.type,
        "created_at": msg.created_at.isoformat(),
        "attachments": [],
    }


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    token = websocket.query_params.get("token") or websocket.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        await websocket.close(code=4001)
        return
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001)
        return

    ws_manager.join_user(websocket, str(user.id))

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            msg_type = data.get("type")
            if msg_type == "join_chat":
                chat_id = data.get("chat_id")
                if chat_id:
                    ws_manager.join(websocket, str(chat_id))
            elif msg_type == "leave_chat":
                chat_id = data.get("chat_id")
                if chat_id:
                    ws_manager.leave(websocket, str(chat_id))
            elif msg_type == "send_message":
                chat_id = data.get("chat_id")
                content = (data.get("content") or "").strip()
                if not chat_id or not content:
                    continue
                try:
                    cid = UUID(chat_id)
                except (ValueError, TypeError):
                    continue
                async with AsyncSessionLocal() as db:
                    r = await db.execute(
                        select(ChatMember).where(
                            ChatMember.chat_id == cid,
                            ChatMember.user_id == user.id,
                        )
                    )
                    if not r.scalar_one_or_none():
                        continue
                    msg = Message(
                        chat_id=cid,
                        user_id=user.id,
                        content=content,
                        type=data.get("type") or "text",
                    )
                    db.add(msg)
                    await db.commit()
                    await db.refresh(msg)
                    payload = _message_to_dict(msg)
                    await ws_manager.broadcast_to_chat(str(chat_id), {"type": "new_message", "message": payload})
                    members = await db.execute(
                        select(ChatMember.user_id).where(ChatMember.chat_id == cid)
                    )
                    for (member_uid,) in members.all():
                        await ws_manager.broadcast_to_user(str(member_uid), {"type": "chats_updated"})
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(websocket)


def get_router() -> APIRouter:
    return router
