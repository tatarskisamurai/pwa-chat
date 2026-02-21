"""Публикация в Redis для real-time (Node подписан на channel и шлёт по сокетам)."""
import asyncio
import json
from uuid import UUID

import redis
from app.core.config import settings

_CHANNEL = "chat:message"
_client: redis.Redis | None = None


def _get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.redis_url)
    return _client


async def publish_new_message(chat_id: UUID, message: dict) -> None:
    """Публикует событие нового сообщения в Redis. Node разошлёт по сокетам."""
    payload = {"chatId": str(chat_id), "message": message}
    body = json.dumps(payload)
    client = _get_client()
    await asyncio.to_thread(client.publish, _CHANNEL, body)
