import asyncio
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

try:
    from sqlalchemy import text
    from app.api.endpoints import auth, users, chats, messages, upload
    from app.api.endpoints.upload import UPLOADS_DIR
    from app.api.ws import get_router as get_ws_router
    from app.database import engine
    from app.models import Base
    from app.migrate_handle import run_all_migrations
except Exception as e:
    print(f"App import failed: {type(e).__name__}: {e}", file=sys.stderr)
    raise


async def _wait_for_db(max_attempts: int = 10, delay: float = 2.0):
    """Ждём, пока БД станет доступна (DNS/сеть в Docker могут подниматься с задержкой)."""
    for attempt in range(1, max_attempts + 1):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return
        except Exception as e:
            if attempt == max_attempts:
                raise
            print(f"DB not ready (attempt {attempt}/{max_attempts}): {e}", file=sys.stderr)
            await asyncio.sleep(delay)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _wait_for_db()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await run_all_migrations(conn)
    yield
    await engine.dispose()


# Разрешаемые origins для CORS
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://drun.kiriapp.ru",
    "http://drun.kiriapp.ru",
]

app = FastAPI(title="Chat API", lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Для не-HTTP ошибок возвращаем 500 с CORS-заголовками."""
    if isinstance(exc, HTTPException):
        raise exc
    print(f"Unhandled error: {exc}", file=sys.stderr)
    origin = request.headers.get("origin") or CORS_ORIGINS[0]
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )


# CORS — добавляется первым, чтобы применяться ко всем ответам, включая ошибки
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")  # /list, /me — до роутера с {user_id}
app.include_router(users.router_with_id, prefix="/api")
app.include_router(chats.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(get_ws_router(), prefix="/api")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok", "service": "chat-api"}
