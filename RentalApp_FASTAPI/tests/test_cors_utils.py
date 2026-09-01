"""
Unit тесты для модуля shared/cors_utils.py
Тестирует функции парсинга, валидации и конфигурации CORS.
"""

import pytest
from unittest.mock import Mock, patch
from shared.cors_utils import (
    parse_cors_origins,
    validate_cors_origin,
    parse_cors_list,
    get_cors_config
)
from config.core import Settings


class TestParseCorsOrigins:
    """Тесты для функции parse_cors_origins."""
    
    def test_parse_single_origin(self):
        """Тест парсинга одного источника."""
        result = parse_cors_origins("http://localhost:5173")
        assert result == ["http://localhost:5173"]
    
    def test_parse_multiple_origins(self):
        """Тест парсинга нескольких источников."""
        result = parse_cors_origins("http://localhost:5173,https://example.com")
        assert result == ["http://localhost:5173", "https://example.com"]
    
    def test_parse_origins_with_spaces(self):
        """Тест парсинга источников с пробелами."""
        result = parse_cors_origins("http://localhost:5173, https://example.com")
        assert result == ["http://localhost:5173", "https://example.com"]
    
    def test_parse_origins_empty_string_raises(self):
        """Тест что пустая строка вызывает ошибку."""
        with pytest.raises(ValueError, match="не может быть пустым"):
            parse_cors_origins("")
    
    def test_parse_origins_whitespace_only_raises(self):
        """Тест что строка только с пробелами вызывает ошибку."""
        with pytest.raises(ValueError, match="не может быть пустым"):
            parse_cors_origins("   ")
    
    def test_parse_origins_only_commas_raises(self):
        """Тест что строка только с запятыми вызывает ошибку."""
        with pytest.raises(ValueError, match="должен содержать хотя бы один источник"):
            parse_cors_origins(",,,")


class TestValidateCorsOrigin:
    """Тесты для функции validate_cors_origin."""
    
    def test_validate_http_localhost_dev_mode(self):
        """Тест валидации HTTP localhost в dev режиме."""
        assert validate_cors_origin("http://localhost:5173", debug=True) is True
    
    def test_validate_https_production_mode(self):
        """Тест валидации HTTPS в production режиме."""
        assert validate_cors_origin("https://example.com", debug=False) is True
    
    def test_validate_http_production_mode_raises(self):
        """Тест что HTTP в production вызывает ошибку (кроме localhost)."""
        with pytest.raises(ValueError, match="должны использовать HTTPS"):
            validate_cors_origin("http://example.com", debug=False)
    
    def test_validate_http_localhost_production_allowed(self):
        """Тест что localhost разрешен в production (для локального тестирования)."""
        assert validate_cors_origin("http://localhost:5173", debug=False) is True
    
    def test_validate_127_0_0_1_production_allowed(self):
        """Тест что 127.0.0.1 разрешен в production."""
        assert validate_cors_origin("http://127.0.0.1:5173", debug=False) is True
    
    def test_validate_no_scheme_raises(self):
        """Тест что отсутствие схемы вызывает ошибку."""
        with pytest.raises(ValueError, match="должен содержать протокол"):
            validate_cors_origin("localhost:5173", debug=True)
    
    def test_validate_no_netloc_raises(self):
        """Тест что отсутствие домена вызывает ошибку."""
        with pytest.raises(ValueError, match="должен содержать домен"):
            validate_cors_origin("http://", debug=True)
    
    def test_validate_wildcard_raises(self):
        """Тест что wildcard вызывает ошибку."""
        with pytest.raises(ValueError, match="Wildcard"):
            validate_cors_origin("*", debug=True)


class TestParseCorsList:
    """Тесты для функции parse_cors_list."""
    
    def test_parse_methods(self):
        """Тест парсинга методов."""
        result = parse_cors_list("GET,POST,PUT")
        assert result == ["GET", "POST", "PUT"]
    
    def test_parse_headers(self):
        """Тест парсинга заголовков."""
        result = parse_cors_list("Content-Type,Authorization")
        assert result == ["CONTENT-TYPE", "AUTHORIZATION"]
    
    def test_parse_with_spaces(self):
        """Тест парсинга с пробелами."""
        result = parse_cors_list("GET, POST, PUT")
        assert result == ["GET", "POST", "PUT"]
    
    def test_parse_lowercase_converts_to_uppercase(self):
        """Тест что строчные буквы преобразуются в заглавные."""
        result = parse_cors_list("get,post,put")
        assert result == ["GET", "POST", "PUT"]
    
    def test_parse_empty_string_raises(self):
        """Тест что пустая строка вызывает ошибку."""
        with pytest.raises(ValueError, match="не может быть пустым"):
            parse_cors_list("")
    
    def test_parse_only_commas_raises(self):
        """Тест что строка только с запятыми вызывает ошибку."""
        with pytest.raises(ValueError, match="должен содержать хотя бы один элемент"):
            parse_cors_list(",,,")


class TestGetCorsConfig:
    """Тесты для функции get_cors_config."""
    
    def test_get_cors_config_production_mode(self):
        """Тест конфигурации в production режиме."""
        settings = Mock(spec=Settings)
        settings.CORS_ORIGINS = "https://example.com,https://app.example.com"
        settings.CORS_ALLOW_CREDENTIALS = True
        settings.CORS_ALLOW_METHODS = "GET,POST,PUT"
        settings.CORS_ALLOW_HEADERS = "Content-Type,Authorization"
        settings.CORS_EXPOSE_HEADERS = "X-Total-Count"
        settings.CORS_MAX_AGE = 3600
        settings.CORS_ALLOW_WILDCARD = False
        settings.DEBUG = False
        
        config = get_cors_config(settings)
        
        assert config["allow_origins"] == ["https://example.com", "https://app.example.com"]
        assert config["allow_credentials"] is True
        assert config["allow_methods"] == ["GET", "POST", "PUT"]
        assert config["allow_headers"] == ["CONTENT-TYPE", "AUTHORIZATION", "X-CSRF-TOKEN"]
        assert config["expose_headers"] == ["X-TOTAL-COUNT"]
        assert config["max_age"] == 3600
    
    def test_get_cors_config_wildcard_dev_mode(self):
        """Тест конфигурации с wildcard в dev режиме."""
        settings = Mock(spec=Settings)
        settings.CORS_ORIGINS = "http://localhost:5173"
        settings.CORS_ALLOW_CREDENTIALS = True
        settings.CORS_ALLOW_METHODS = "GET,POST"
        settings.CORS_ALLOW_HEADERS = "Content-Type"
        settings.CORS_EXPOSE_HEADERS = ""
        settings.CORS_MAX_AGE = 3600
        settings.CORS_ALLOW_WILDCARD = True
        settings.DEBUG = True
        
        with patch('shared.cors_utils.logger') as mock_logger:
            config = get_cors_config(settings)
            
            assert config["allow_origins"] == ["*"]
            assert config["allow_methods"] == ["*"]
            assert config["allow_headers"] == ["*"]
            mock_logger.info.assert_called_once()
    
    def test_get_cors_config_wildcard_production_warning(self):
        """Тест что wildcard в production вызывает предупреждение."""
        settings = Mock(spec=Settings)
        settings.CORS_ORIGINS = "https://example.com"
        settings.CORS_ALLOW_CREDENTIALS = True
        settings.CORS_ALLOW_METHODS = "GET,POST"
        settings.CORS_ALLOW_HEADERS = "Content-Type"
        settings.CORS_EXPOSE_HEADERS = ""
        settings.CORS_MAX_AGE = 3600
        settings.CORS_ALLOW_WILDCARD = True
        settings.DEBUG = False
        
        with patch('shared.cors_utils.logger') as mock_logger:
            # В production с wildcard должна быть ошибка валидации при парсинге
            # Но если это пройдет, должно быть предупреждение
            config = get_cors_config(settings)
            mock_logger.warning.assert_called_once()
    
    def test_get_cors_config_adds_csrf_token_header(self):
        """Тест что X-CSRF-Token всегда добавляется в заголовки."""
        settings = Mock(spec=Settings)
        settings.CORS_ORIGINS = "https://example.com"
        settings.CORS_ALLOW_CREDENTIALS = True
        settings.CORS_ALLOW_METHODS = "GET,POST"
        settings.CORS_ALLOW_HEADERS = "Content-Type,Authorization"
        settings.CORS_EXPOSE_HEADERS = ""
        settings.CORS_MAX_AGE = 3600
        settings.CORS_ALLOW_WILDCARD = False
        settings.DEBUG = False
        
        config = get_cors_config(settings)
        
        assert "X-CSRF-TOKEN" in config["allow_headers"]
    
    def test_get_cors_config_empty_expose_headers(self):
        """Тест что пустые expose headers обрабатываются корректно."""
        settings = Mock(spec=Settings)
        settings.CORS_ORIGINS = "https://example.com"
        settings.CORS_ALLOW_CREDENTIALS = True
        settings.CORS_ALLOW_METHODS = "GET,POST"
        settings.CORS_ALLOW_HEADERS = "Content-Type"
        settings.CORS_EXPOSE_HEADERS = ""
        settings.CORS_MAX_AGE = 3600
        settings.CORS_ALLOW_WILDCARD = False
        settings.DEBUG = False
        
        config = get_cors_config(settings)
        
        assert config["expose_headers"] == []
    
    def test_get_cors_config_invalid_origin_raises(self):
        """Тест что невалидный источник вызывает ошибку."""
        settings = Mock(spec=Settings)
        settings.CORS_ORIGINS = "invalid-origin"
        settings.CORS_ALLOW_CREDENTIALS = True
        settings.CORS_ALLOW_METHODS = "GET,POST"
        settings.CORS_ALLOW_HEADERS = "Content-Type"
        settings.CORS_EXPOSE_HEADERS = ""
        settings.CORS_MAX_AGE = 3600
        settings.CORS_ALLOW_WILDCARD = False
        settings.DEBUG = False
        
        with pytest.raises(ValueError):
            get_cors_config(settings)

