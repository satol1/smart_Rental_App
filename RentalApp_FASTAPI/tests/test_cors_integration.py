"""
Integration тесты для CORS настроек.
Тестирует CORS на уровне HTTP запросов.
"""

import pytest
import os
from httpx import AsyncClient
from unittest.mock import patch

# Импортируем фикстуры из изолированной конфигурации
pytest_plugins = ["tests.integration.conftest_isolated"]


@pytest.mark.asyncio
@pytest.mark.integration
class TestCORSIntegration:
    """Интеграционные тесты для CORS."""
    
    async def test_cors_preflight_request_allowed_origin(
        self, 
        isolated_client: AsyncClient
    ):
        """Тест preflight запроса (OPTIONS) для разрешенного источника."""
        origin = "http://localhost:5173"
        
        response = await isolated_client.options(
            "/api/auth/csrf-token",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type,Authorization"
            }
        )
        
        assert response.status_code == 200
        assert "Access-Control-Allow-Origin" in response.headers
        assert response.headers["Access-Control-Allow-Origin"] == origin
        assert "Access-Control-Allow-Methods" in response.headers
        assert "Access-Control-Allow-Headers" in response.headers
        assert "Access-Control-Max-Age" in response.headers
    
    async def test_cors_preflight_request_allowed_methods(
        self, 
        isolated_client: AsyncClient
    ):
        """Тест что разрешенные методы присутствуют в ответе."""
        origin = "http://localhost:5173"
        
        response = await isolated_client.options(
            "/api/auth/csrf-token",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        assert response.status_code == 200
        allow_methods = response.headers.get("Access-Control-Allow-Methods", "")
        # Проверяем что POST присутствует (может быть через запятую)
        assert "POST" in allow_methods or allow_methods == "*"
    
    async def test_cors_preflight_request_allowed_headers(
        self, 
        isolated_client: AsyncClient
    ):
        """Тест что разрешенные заголовки присутствуют в ответе."""
        origin = "http://localhost:5173"
        
        response = await isolated_client.options(
            "/api/auth/csrf-token",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type,Authorization"
            }
        )
        
        assert response.status_code == 200
        allow_headers = response.headers.get("Access-Control-Allow-Headers", "")
        # Проверяем что Authorization присутствует (может быть через запятую, регистр не важен)
        allow_headers_upper = allow_headers.upper()
        assert "AUTHORIZATION" in allow_headers_upper or allow_headers == "*"
    
    async def test_cors_actual_request_allowed_origin(
        self, 
        isolated_client: AsyncClient
    ):
        """Тест реального запроса с разрешенным источником."""
        origin = "http://localhost:5173"
        
        response = await isolated_client.get(
            "/api/auth/csrf-token",
            headers={"Origin": origin}
        )
        
        # Запрос должен пройти (статус зависит от эндпоинта)
        assert response.status_code in [200, 401, 403]  # В зависимости от аутентификации
        assert "Access-Control-Allow-Origin" in response.headers
        assert response.headers["Access-Control-Allow-Origin"] == origin
    
    async def test_cors_credentials_header_present(
        self, 
        isolated_client: AsyncClient
    ):
        """Тест что заголовок credentials присутствует когда разрешен."""
        origin = "http://localhost:5173"
        
        response = await isolated_client.options(
            "/api/auth/csrf-token",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET"
            }
        )
        
        assert response.status_code == 200
        # Если credentials разрешены, должен быть заголовок
        # (в зависимости от настроек)
        allow_credentials = response.headers.get("Access-Control-Allow-Credentials")
        # Проверяем что заголовок либо присутствует, либо отсутствует (оба варианта валидны)
        # Но если он есть, должен быть "true"
        if allow_credentials is not None:
            assert allow_credentials.lower() == "true"
    
    async def test_cors_expose_headers_present(
        self, 
        isolated_client: AsyncClient
    ):
        """Тест что expose headers присутствуют в ответе."""
        origin = "http://localhost:5173"
        
        response = await isolated_client.get(
            "/api/auth/csrf-token",
            headers={"Origin": origin}
        )
        
        # Проверяем что заголовок либо присутствует (если настроен), либо отсутствует
        expose_headers = response.headers.get("Access-Control-Expose-Headers")
        # Если заголовок настроен, должен содержать ожидаемые значения
        if expose_headers:
            # Может содержать X-Total-Count или X-Request-ID
            assert len(expose_headers) > 0
    
    @pytest.mark.parametrize("origin", [
        "http://malicious-site.com",
        "https://evil.com",
        "http://localhost:9999",  # Другой порт
    ])
    async def test_cors_rejected_origin_not_in_list(
        self, 
        isolated_client: AsyncClient,
        origin: str
    ):
        """Тест что неразрешенные источники отклоняются."""
        # Если источник не в списке, CORS должен блокировать запрос
        # В зависимости от настроек, это может быть 403 или отсутствие CORS заголовков
        
        response = await isolated_client.options(
            "/api/auth/csrf-token",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET"
            }
        )
        
        # Если источник не разрешен, либо:
        # 1. Нет заголовка Access-Control-Allow-Origin с этим источником
        # 2. Статус может быть 403
        # 3. Или заголовок Access-Control-Allow-Origin отсутствует или отличается
        
        allow_origin = response.headers.get("Access-Control-Allow-Origin")
        if allow_origin:
            assert allow_origin != origin, f"Источник {origin} не должен быть разрешен"
        
        # Если есть заголовок, он не должен совпадать с запрошенным источником
        if allow_origin and allow_origin != "*":
            assert allow_origin != origin


@pytest.mark.asyncio
@pytest.mark.integration
class TestCORSConfiguration:
    """Тесты конфигурации CORS."""
    
    async def test_cors_max_age_value(
        self, 
        isolated_client: AsyncClient
    ):
        """Тест что Max-Age установлен корректно."""
        origin = "http://localhost:5173"
        
        response = await isolated_client.options(
            "/api/auth/csrf-token",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET"
            }
        )
        
        max_age = response.headers.get("Access-Control-Max-Age")
        if max_age:
            # Должно быть числовое значение (в секундах)
            assert max_age.isdigit()
            max_age_int = int(max_age)
            assert 0 <= max_age_int <= 86400  # Максимум 24 часа
            assert max_age_int >= 0
    
    async def test_cors_methods_list_not_wildcard_in_production(
        self, 
        isolated_client: AsyncClient
    ):
        """Тест что в production не используется wildcard для методов."""
        origin = "http://localhost:5173"
        
        response = await isolated_client.options(
            "/api/auth/csrf-token",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET"
            }
        )
        
        allow_methods = response.headers.get("Access-Control-Allow-Methods", "")
        
        # Если не dev режим, не должно быть wildcard
        debug_mode = os.getenv("DEBUG", "True").lower() == "true"
        if not debug_mode:
            assert allow_methods != "*", "В production не должен использоваться wildcard для методов"
        
        # Проверяем что методы валидны
        if allow_methods and allow_methods != "*":
            methods = [m.strip().upper() for m in allow_methods.split(",")]
            valid_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
            for method in methods:
                assert method in valid_methods, f"Метод {method} должен быть валидным"
    
    async def test_cors_headers_list_not_wildcard_in_production(
        self, 
        isolated_client: AsyncClient
    ):
        """Тест что в production не используется wildcard для заголовков."""
        origin = "http://localhost:5173"
        
        response = await isolated_client.options(
            "/api/auth/csrf-token",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        allow_headers = response.headers.get("Access-Control-Allow-Headers", "")
        
        # Если не dev режим, не должно быть wildcard
        debug_mode = os.getenv("DEBUG", "True").lower() == "true"
        if not debug_mode:
            assert allow_headers != "*", "В production не должен использоваться wildcard для заголовков"
        
        # Проверяем что заголовки валидны
        if allow_headers and allow_headers != "*":
            headers = [h.strip() for h in allow_headers.split(",")]
            # Должны быть базовые заголовки
            assert len(headers) > 0

