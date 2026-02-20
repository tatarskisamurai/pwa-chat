import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from app.api.endpoints import auth, users, chats, messages
    from app.database import engine
    from app.models import Base
except Exception as e:
    print(f"App import failed: {type(e).__name__}: {e}", file=sys.stderr)
    raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
app.include_router(users.router, prefix="/api")
app.include_router(chats.router, prefix="/api")
app.include_router(messages.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "chat-api"}
