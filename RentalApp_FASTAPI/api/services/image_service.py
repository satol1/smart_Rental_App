# api/services/image_service.py
"""Сервисная обработка загружаемых изображений (Pillow).

Валидация формата/размера, коррекция EXIF-ориентации, сжатие до JPEG
и безопасное удаление по имени файла. Синхронный код Pillow выносится
в поток через asyncio.to_thread, чтобы не блокировать event loop.
"""

import asyncio
import io
import re
import uuid
from pathlib import Path

from PIL import Image, ImageOps

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_SIZE = 15 * 1024 * 1024  # 15 МБ
MAX_DIMENSION = 1600
JPEG_QUALITY = 82
SAFE_FILENAME_RE = re.compile(r"^[a-f0-9]{32}\.jpg$")


class ImageValidationError(ValueError):
    """Загруженный файл не является корректным изображением."""


def _process_image(data: bytes, upload_dir: Path) -> str:
    """Транспонирует по EXIF, сжимает и сохраняет изображение как JPEG."""
    try:
        image = Image.open(io.BytesIO(data))
        image = ImageOps.exif_transpose(image)
    except Exception:
        raise ImageValidationError("Файл повреждён или не является изображением")

    image = image.convert("RGB")

    width, height = image.size
    longest = max(width, height)
    if longest > MAX_DIMENSION:
        scale = MAX_DIMENSION / longest
        image = image.resize(
            (max(1, round(width * scale)), max(1, round(height * scale))),
            Image.LANCZOS,
        )

    filename = f"{uuid.uuid4().hex}.jpg"
    image.save(
        upload_dir / filename,
        format="JPEG",
        quality=JPEG_QUALITY,
        optimize=True,
    )
    return filename


async def save_image(data: bytes, upload_dir: Path) -> str:
    """Сохраняет изображение; возвращает сгенерированное имя файла."""
    return await asyncio.to_thread(_process_image, data, upload_dir)


def _delete_image(filename: str, upload_dir: Path) -> bool:
    """Удаляет файл по имени; False — если имя небезопасно или файла нет."""
    if not SAFE_FILENAME_RE.fullmatch(filename):
        return False
    path = upload_dir / filename
    if not path.is_file():
        return False
    path.unlink()
    return True


async def delete_image(filename: str, upload_dir: Path) -> bool:
    """Удаляет ранее загруженное изображение; False — если файл не найден."""
    return await asyncio.to_thread(_delete_image, filename, upload_dir)
