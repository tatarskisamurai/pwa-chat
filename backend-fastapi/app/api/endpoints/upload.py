import re
import uuid
import mimetypes
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/upload", tags=["upload"])

# Каталог для файлов (рядом с app/); в Docker лучше монтировать volume
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".txt", ".doc", ".docx"}


def _ensure_uploads_dir():
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _safe_filename(original: str) -> str:
    ext = Path(original).suffix.lower() or ""
    if ext not in ALLOWED_EXT and not ext:
        ext = ".bin"
    return f"{uuid.uuid4().hex}{ext}"


def _safe_download_filename(name: str) -> str:
    """Оставляем только безопасные символы для Content-Disposition filename."""
    if not name or len(name) > 200:
        return "download"
    return re.sub(r'[^\w\s\-\.\(\)]', "_", name).strip() or "download"


class FileInfo(BaseModel):
    url: str
    type: str | None
    filename: str | None


class UploadResponse(BaseModel):
    files: list[FileInfo]


@router.post("", response_model=UploadResponse)
async def upload_files(
    current_user: User = Depends(get_current_user),
    files: list[UploadFile] = File(...),
):
    _ensure_uploads_dir()
    if not files or len(files) > 10:
        raise HTTPException(status_code=400, detail="От 1 до 10 файлов")
    result = []
    for f in files:
        if not f.filename:
            continue
        content = await f.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Вложение не поддерживается")
        safe_name = _safe_filename(f.filename)
        path = UPLOADS_DIR / safe_name
        path.write_bytes(content)
        mime, _ = mimetypes.guess_type(f.filename)
        result.append(
            FileInfo(
                url=f"/api/uploads/{safe_name}",
                type=mime,
                filename=f.filename,
            )
        )
    return UploadResponse(files=result)


@router.get("/download/{stored_name:path}")
async def download_file(
    stored_name: str,
    filename: str | None = None,
):
    """Скачать файл с заголовком Content-Disposition: attachment. Без авторизации: ссылка с uuid не угадывается."""
    if ".." in stored_name or "/" in stored_name.replace("\\", "/"):
        raise HTTPException(status_code=400, detail="Invalid path")
    path = UPLOADS_DIR / stored_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    download_name = _safe_download_filename(filename) if filename else path.name
    return FileResponse(
        path,
        filename=download_name,
        media_type="application/octet-stream",
    )
