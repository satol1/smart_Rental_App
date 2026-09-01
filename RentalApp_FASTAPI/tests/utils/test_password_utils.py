# tests/utils/test_password_utils.py

import pytest
from unittest.mock import patch, MagicMock

from api.utils.password_utils import hash_password, verify_password, pwd_context


class TestPasswordUtils:
    """Тесты для утилит работы с паролями."""

    def test_hash_password_success(self):
        """Тест успешного хеширования пароля."""
        # Arrange
        password = "testpassword123"
        expected_hash = "$2b$12$testhash"
        
        with patch.object(pwd_context, 'hash', return_value=expected_hash) as mock_hash:
            # Act
            result = hash_password(password)
            
            # Assert
            assert result == expected_hash
            mock_hash.assert_called_once_with(password)

    def test_hash_password_empty_string(self):
        """Тест хеширования пустой строки."""
        # Arrange
        password = ""
        expected_hash = "$2b$12$emptyhash"
        
        with patch.object(pwd_context, 'hash', return_value=expected_hash) as mock_hash:
            # Act
            result = hash_password(password)
            
            # Assert
            assert result == expected_hash
            mock_hash.assert_called_once_with(password)

    def test_hash_password_special_characters(self):
        """Тест хеширования пароля со специальными символами."""
        # Arrange
        password = "!@#$%^&*()_+-=[]{}|;':\",./<>?"
        expected_hash = "$2b$12$specialhash"
        
        with patch.object(pwd_context, 'hash', return_value=expected_hash) as mock_hash:
            # Act
            result = hash_password(password)
            
            # Assert
            assert result == expected_hash
            mock_hash.assert_called_once_with(password)

    def test_hash_password_unicode(self):
        """Тест хеширования пароля с Unicode символами."""
        # Arrange
        password = "пароль123"
        expected_hash = "$2b$12$unicodehash"
        
        with patch.object(pwd_context, 'hash', return_value=expected_hash) as mock_hash:
            # Act
            result = hash_password(password)
            
            # Assert
            assert result == expected_hash
            mock_hash.assert_called_once_with(password)

    def test_hash_password_long_password(self):
        """Тест хеширования длинного пароля."""
        # Arrange
        password = "a" * 1000  # Очень длинный пароль
        expected_hash = "$2b$12$longhash"
        
        with patch.object(pwd_context, 'hash', return_value=expected_hash) as mock_hash:
            # Act
            result = hash_password(password)
            
            # Assert
            assert result == expected_hash
            mock_hash.assert_called_once_with(password)

    def test_verify_password_success(self):
        """Тест успешной проверки пароля."""
        # Arrange
        plain_password = "testpassword123"
        hashed_password = "$2b$12$testhash"
        
        with patch.object(pwd_context, 'verify', return_value=True) as mock_verify:
            # Act
            result = verify_password(plain_password, hashed_password)
            
            # Assert
            assert result is True
            mock_verify.assert_called_once_with(plain_password, hashed_password)

    def test_verify_password_wrong_password(self):
        """Тест проверки неправильного пароля."""
        # Arrange
        plain_password = "wrongpassword"
        hashed_password = "$2b$12$testhash"
        
        with patch.object(pwd_context, 'verify', return_value=False) as mock_verify:
            # Act
            result = verify_password(plain_password, hashed_password)
            
            # Assert
            assert result is False
            mock_verify.assert_called_once_with(plain_password, hashed_password)

    def test_verify_password_empty_plain(self):
        """Тест проверки пустого пароля."""
        # Arrange
        plain_password = ""
        hashed_password = "$2b$12$testhash"
        
        with patch.object(pwd_context, 'verify', return_value=False) as mock_verify:
            # Act
            result = verify_password(plain_password, hashed_password)
            
            # Assert
            assert result is False
            mock_verify.assert_called_once_with(plain_password, hashed_password)

    def test_verify_password_empty_hash(self):
        """Тест проверки с пустым хешем."""
        # Arrange
        plain_password = "testpassword123"
        hashed_password = ""
        
        with patch.object(pwd_context, 'verify', return_value=False) as mock_verify:
            # Act
            result = verify_password(plain_password, hashed_password)
            
            # Assert
            assert result is False
            mock_verify.assert_called_once_with(plain_password, hashed_password)

    def test_verify_password_none_values(self):
        """Тест проверки с None значениями."""
        # Arrange
        plain_password = None
        hashed_password = "$2b$12$testhash"
        
        with patch.object(pwd_context, 'verify', return_value=False) as mock_verify:
            # Act
            result = verify_password(plain_password, hashed_password)
            
            # Assert
            assert result is False
            mock_verify.assert_called_once_with(plain_password, hashed_password)

    def test_hash_password_hash_context_error(self):
        """Тест обработки ошибки при хешировании."""
        # Arrange
        password = "testpassword123"
        
        with patch.object(pwd_context, 'hash', side_effect=Exception("Hash error")) as mock_hash:
            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                hash_password(password)
            
            assert "Hash error" in str(exc_info.value)
            mock_hash.assert_called_once_with(password)

    def test_verify_password_verify_context_error(self):
        """Тест обработки ошибки при проверке пароля."""
        # Arrange
        plain_password = "testpassword123"
        hashed_password = "$2b$12$testhash"
        
        with patch.object(pwd_context, 'verify', side_effect=Exception("Verify error")) as mock_verify:
            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                verify_password(plain_password, hashed_password)
            
            assert "Verify error" in str(exc_info.value)
            mock_verify.assert_called_once_with(plain_password, hashed_password)

    def test_password_roundtrip(self):
        """Тест полного цикла: хеширование и проверка."""
        # Arrange
        original_password = "testpassword123"
        mock_hash = "$2b$12$roundtriphash"
        
        with patch.object(pwd_context, 'hash', return_value=mock_hash) as mock_hash_func, \
             patch.object(pwd_context, 'verify', return_value=True) as mock_verify:
            
            # Act
            hashed = hash_password(original_password)
            is_valid = verify_password(original_password, hashed)
            
            # Assert
            assert hashed == mock_hash
            assert is_valid is True
            mock_hash_func.assert_called_once_with(original_password)
            mock_verify.assert_called_once_with(original_password, mock_hash)

    def test_password_context_initialization(self):
        """Тест инициализации контекста паролей."""
        # Assert
        assert pwd_context is not None
        assert hasattr(pwd_context, 'hash')
        assert hasattr(pwd_context, 'verify')
        # Проверяем, что схемы содержат bcrypt (может быть не только bcrypt)
        schemes = pwd_context.schemes() if callable(pwd_context.schemes) else pwd_context.schemes
        assert "bcrypt" in schemes
