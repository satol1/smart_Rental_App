# tests/utils/test_password_utils.py

import bcrypt
import pytest

from api.utils.password_utils import hash_password, verify_password


class TestPasswordUtils:
    """Тесты для утилит работы с паролями (bcrypt напрямую, без passlib)."""

    def test_hash_password_success(self):
        """Хеширование возвращает валидный bcrypt-хеш."""
        password = "testpassword123"

        result = hash_password(password)

        assert isinstance(result, str)
        assert result.startswith("$2")
        # Один и тот же пароль даёт разные соли
        assert hash_password(password) != result

    def test_hash_password_empty_string(self):
        """Пустой пароль тоже хешируется (валидацию длины делает схема)."""
        result = hash_password("")

        assert isinstance(result, str)
        assert result.startswith("$2")

    def test_hash_password_special_characters(self):
        """Хеширование пароля со специальными символами."""
        password = "!@#$%^&*()_+-=[]{}|;':\",./<>?"

        result = hash_password(password)

        assert verify_password(password, result) is True

    def test_hash_password_unicode(self):
        """Хеширование пароля с Unicode символами."""
        password = "пароль123"

        result = hash_password(password)

        assert verify_password(password, result) is True

    def test_hash_password_long_password(self):
        """Хеширование длинного пароля (bcrypt ограничен 72 байтами — не падаем)."""
        result = hash_password("a" * 1000)

        assert isinstance(result, str)
        assert result.startswith("$2")

    def test_verify_password_correct(self):
        """Верификация правильного пароля."""
        hashed = hash_password("Password123")

        assert verify_password("Password123", hashed) is True

    def test_verify_password_wrong_password(self):
        """Верификация неверного пароля."""
        hashed = hash_password("Password123")

        assert verify_password("WrongPassword", hashed) is False

    def test_verify_password_empty_plain(self):
        """Проверка пустого пароля."""
        hashed = hash_password("Password123")

        assert verify_password("", hashed) is False

    def test_verify_password_empty_hash(self):
        """Проверка с пустым хешем."""
        assert verify_password("Password123", "") is False

    def test_verify_password_invalid_hash_format(self):
        """Повреждённый/некорректный хеш не валит проверку — просто False."""
        assert verify_password("Password123", "not-a-bcrypt-hash") is False

    def test_hash_roundtrip_via_bcrypt_module(self):
        """Хеш из password_utils читается напрямую bcrypt.checkpw."""
        hashed = hash_password("Password123")

        assert bcrypt.checkpw(b"Password123", hashed.encode("utf-8")) is True

    def test_password_roundtrip(self):
        """Полный цикл: хеширование и проверка."""
        original_password = "testpassword123"

        hashed = hash_password(original_password)
        is_valid = verify_password(original_password, hashed)

        assert is_valid is True

    def test_passlib_legacy_hash_compatibility(self):
        """Совместимость: хеш, созданный старым кодом через passlib (формат $2b$),
        валидируется новой реализацией на bcrypt.checkpw.

        Хеш ниже сгенерирован passlib CryptContext(schemes=["bcrypt"])
        для пароля MySecretPassword123.
        """
        legacy_passlib_hash = "$2b$12$EToegE1LuK9ckCPMFh/EROdWyPaFGPq8KiAw084IfcDnlSCsfzwXS"

        assert verify_password("MySecretPassword123", legacy_passlib_hash) is True
        assert verify_password("WrongPassword", legacy_passlib_hash) is False
