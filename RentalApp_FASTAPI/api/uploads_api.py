# api/uploads_api.py

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from api.csrf import validate_csrf_dependency

from api.models.user import User
from api.permissions import require_manager
from api.services import image_service
from config.core import settings

router = APIRouter(prefix="/uploads", tags=["Загрузка файлов"])

CHUNK_SIZE = 1024 * 1024


@router.post("/images", status_code=status.HTTP_201_CREATED)
async def upload_image(
        file: UploadFile = File(...),
        _current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Загружает фото оборудования: сжимает серверно и возвращает URL."""
    if file.content_type not in image_service.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недопустимый формат файла: разрешены JPEG, PNG и WebP"
        )

    chunks = []
    total = 0
    while chunk := await file.read(CHUNK_SIZE):
        total += len(chunk)
        if total > image_service.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Файл слишком большой: максимум 15 МБ"
            )
        chunks.append(chunk)

    try:
        filename = await image_service.save_image(b"".join(chunks), settings.UPLOAD_DIR)
    except image_service.ImageValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )

    return {"url": f"/api/uploads/images/{filename}"}


@router.delete("/images/{filename}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
        filename: str,
        _current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Удаляет ранее загруженное изображение."""
    deleted = await image_service.delete_image(filename, settings.UPLOAD_DIR)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл не найден"
        )
