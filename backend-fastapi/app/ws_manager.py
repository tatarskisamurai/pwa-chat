"""Менеджер WebSocket-подключений: комнаты по chat_id и по user_id (для chats_updated)."""
import json
import logging
from collections import defaultdict
from typing import Any

from starlette.websockets import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._chat_rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._ws_rooms: dict[WebSocket, set[str]] = defaultdict(set)
        self._user_rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._ws_user: dict[WebSocket, str] = {}

    def join(self, ws: WebSocket, chat_id: str) -> None:
        self._chat_rooms[chat_id].add(ws)
        self._ws_rooms[ws].add(chat_id)

    def join_user(self, ws: WebSocket, user_id: str) -> None:
        self._user_rooms[user_id].add(ws)
        self._ws_user[ws] = user_id

    def leave(self, ws: WebSocket, chat_id: str) -> None:
        self._chat_rooms[chat_id].discard(ws)
        if not self._chat_rooms[chat_id]:
            del self._chat_rooms[chat_id]
        self._ws_rooms[ws].discard(chat_id)

    def disconnect(self, ws: WebSocket) -> None:
        for chat_id in list(self._ws_rooms.get(ws, ())):
            self._chat_rooms[chat_id].discard(ws)
            if not self._chat_rooms[chat_id]:
                del self._chat_rooms[chat_id]
        if ws in self._ws_rooms:
            del self._ws_rooms[ws]
        uid = self._ws_user.pop(ws, None)
        if uid and ws in self._user_rooms.get(uid, set()):
            self._user_rooms[uid].discard(ws)
            if not self._user_rooms[uid]:
                del self._user_rooms[uid]

    async def broadcast_to_chat(self, chat_id: str, payload: dict[str, Any]) -> None:
        text = json.dumps(payload, default=str)
        dead: list[WebSocket] = []
        for ws in self._chat_rooms.get(chat_id, ()):
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def broadcast_to_user(self, user_id: str, payload: dict[str, Any]) -> None:
        text = json.dumps(payload, default=str)
        dead: list[WebSocket] = []
        for ws in self._user_rooms.get(user_id, ()):
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


ws_manager = ConnectionManager()
