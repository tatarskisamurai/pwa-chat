import hashlib
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from app.core.config import settings

# В bcrypt можно передать не более 72 байт. ВСЕГДА хешируем через SHA256 (32 байта) — так bcrypt 5.x не падает.
BCRYPT_MAX_BYTES = 72


def _to_bcrypt_input(password: str) -> bytes:
    data = hashlib.sha256(password.encode("utf-8")).digest()  # всегда 32 байта
    return data[:BCRYPT_MAX_BYTES]


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bcrypt_input(plain), hashed.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_to_bcrypt_input(password), bcrypt.gensalt()).decode("utf-8")


def create_access_token(sub: str, username: Optional[str] = None) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": sub, "exp": expire}
    if username:
        payload["username"] = username
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
