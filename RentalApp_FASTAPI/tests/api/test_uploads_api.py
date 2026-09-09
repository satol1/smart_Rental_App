# tests/api/test_uploads_api.py
"""
Тесты для uploads_api.py: загрузка и удаление фото оборудования.

Аутентификация подменяется через app.dependency_overrides[get_current_user],
CSRF — через валидный токен из GET /api/auth/csrf-token (как в test_auth_api).
UPLOAD_DIR перенаправляется в tmp_path через подмену property у класса Settings.
"""
import io
import re
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from api.main_api import app
from api.dependencies import get_current_user
from api.models.user import User
from config.core import Settings

from tests.conftest import get_csrf_headers

URL_RE = re.compile(r"^/api/uploads/images/[a-f0-9]{32}\.jpg$")


def _make_jpeg(size=(100, 80), color=(200, 30, 30)) -> bytes:
    """Генерирует небольшой JPEG в памяти."""
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="JPEG")
    return buf.getvalue()


def _user_with_role(role: str) -> MagicMock:
    user = MagicMock(spec=User)
    user.id = 1
    user.email = f"{role}@example.com"
    user.role = role
    user.is_active = True
    return user


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def csrf_headers(client):
    return get_csrf_headers(client)


@pytest.fixture
def upload_dir(tmp_path, monkeypatch):
    """Перенаправляет UPLOAD_DIR во временную папку теста."""
    monkeypatch.setattr(Settings, "UPLOAD_DIR", property(lambda self: tmp_path))
    return tmp_path


@pytest.fixture
def as_manager():
    """Подменяет текущего пользователя на менеджера."""
    app.dependency_overrides[get_current_user] = lambda: _user_with_role("manager")
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def as_user():
    """Подменяет текущего пользователя на обычного пользователя (не manager)."""
    app.dependency_overrides[get_current_user] = lambda: _user_with_role("user")
    yield
    app.dependency_overrides.clear()


class TestUploadsAPI:
    """Тесты загрузки/удаления изображений"""

    def test_upload_jpeg_success(self, client, csrf_headers, upload_dir, as_manager):
        """Менеджер загружает JPEG -> 201, URL вида /api/uploads/images/...jpg, файл создан."""
        response = client.post(
            "/api/uploads/images",
            files={"file": ("photo.jpg", _make_jpeg(), "image/jpeg")},
            headers=csrf_headers,
        )

        assert response.status_code == 201
        url = response.json()["url"]
        assert URL_RE.match(url)

        filename = url.rsplit("/", 1)[-1]
        saved = upload_dir / filename
        assert saved.is_file()

        # Сохранённый файл — валидный JPEG
        with Image.open(saved) as img:
            assert img.format == "JPEG"

    def test_upload_non_image_rejected(self, client, csrf_headers, upload_dir, as_manager):
        """Не-изображение отклоняется с 400."""
        response = client.post(
            "/api/uploads/images",
            files={"file": ("notes.txt", b"plain text, not an image", "text/plain")},
            headers=csrf_headers,
        )

        assert response.status_code == 400
        assert "detail" in response.json()
        assert list(upload_dir.iterdir()) == []

    def test_upload_corrupted_image_rejected(self, client, csrf_headers, upload_dir, as_manager):
        """Файл с image/jpeg content-type, но не изображение по содержимому -> 400."""
        response = client.post(
            "/api/uploads/images",
            files={"file": ("fake.jpg", b"definitely not jpeg bytes", "image/jpeg")},
            headers=csrf_headers,
        )

        assert response.status_code == 400
        assert list(upload_dir.iterdir()) == []

    def test_upload_unauthenticated_rejected(self, client, csrf_headers, upload_dir):
        """Запрос без токена аутентификации -> 401."""
        response = client.post(
            "/api/uploads/images",
            files={"file": ("photo.jpg", _make_jpeg(), "image/jpeg")},
            headers=csrf_headers,
        )

        assert response.status_code == 401

    def test_upload_non_manager_rejected(self, client, csrf_headers, upload_dir, as_user):
        """Авторизованный пользователь без роли manager -> 403."""
        response = client.post(
            "/api/uploads/images",
            files={"file": ("photo.jpg", _make_jpeg(), "image/jpeg")},
            headers=csrf_headers,
        )

        assert response.status_code == 403

    def test_delete_uploaded_image(self, client, csrf_headers, upload_dir, as_manager):
        """Загруженный файл удаляется -> 204; повторное удаление -> 404."""
        upload = client.post(
            "/api/uploads/images",
            files={"file": ("photo.jpg", _make_jpeg(), "image/jpeg")},
            headers=csrf_headers,
        )
        assert upload.status_code == 201
        filename = upload.json()["url"].rsplit("/", 1)[-1]

        response = client.delete(f"/api/uploads/images/{filename}", headers=csrf_headers)
        assert response.status_code == 204
        assert not (upload_dir / filename).exists()

        again = client.delete(f"/api/uploads/images/{filename}", headers=csrf_headers)
        assert again.status_code == 404

    def test_delete_rejects_unsafe_filename(self, client, csrf_headers, upload_dir, as_manager):
        """Имя с path traversal не проходит валидацию -> файл-жертва не трогаем."""
        # Файл-жертва вне папки загрузок
        victim = upload_dir.parent / "0123456789abcdef0123456789abcdef.jpg"
        victim.write_bytes(b"victim")
        try:
            response = client.delete(
                "/api/uploads/images/..%2F0123456789abcdef0123456789abcdef.jpg",
                headers=csrf_headers,
            )
            # 404 — роутер + regex; 405 — путь с '..' перехвачен StaticFiles mount.
            # В обоих случаях жертва должна остаться на месте.
            assert response.status_code in (404, 405, 422)
            assert victim.is_file()
        finally:
            victim.unlink(missing_ok=True)

    def test_delete_invalid_filename_format(self, client, csrf_headers, upload_dir, as_manager):
        """Имя, не подходящее под hex-формат uuid4, отклоняется с 404."""
        response = client.delete(
            "/api/uploads/images/not-a-valid-name.jpg",
            headers=csrf_headers,
        )
        assert response.status_code == 404
