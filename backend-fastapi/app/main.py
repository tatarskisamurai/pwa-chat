import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

try:
    from app.api.endpoints import auth, users, chats, messages, upload
    from app.api.endpoints.upload import UPLOADS_DIR
    from app.api.ws import get_router as get_ws_router
    from app.database import engine
    from app.models import Base
    from app.migrate_handle import run_all_migrations
except Exception as e:
    print(f"App import failed: {type(e).__name__}: {e}", file=sys.stderr)
    raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await run_all_migrations(conn)
    yield
    await engine.dispose()


# Разрешаемые origins для CORS (фронт на другом порту)
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
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
