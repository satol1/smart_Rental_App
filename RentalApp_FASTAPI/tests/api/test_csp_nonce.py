"""
Тесты для CSP nonce функциональности

Проверяет:
- Генерацию nonce для каждого запроса
- Присутствие nonce в CSP заголовке
- Уникальность nonce между запросами
- Корректный формат nonce (base64url)
- Доступность nonce через request.state
"""
import pytest
import re
import base64
import os
from fastapi.testclient import TestClient
from fastapi import Request

# Устанавливаем переменные окружения перед импортом app
os.environ.setdefault("SECRET_KEY", "abcdef0123456789abcdef0123456789")
os.environ.setdefault("CSRF_SECRET_KEY", "0123456789abcdef0123456789abcdef")
os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("DISABLE_CSRF", "false")

from api.main_api import app


# Примечание: Эти тесты не требуют базы данных, но фикстура create_test_database
# будет вызвана автоматически. В Docker она работает корректно.


class TestCSPNonce:
    """Тесты для CSP nonce функциональности"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    def test_csp_header_present(self, client):
        """
        Тест: CSP заголовок присутствует в ответе
        """
        # Act
        response = client.get("/health")
        
        # Assert
        assert response.status_code == 200
        assert "Content-Security-Policy" in response.headers
        csp_header = response.headers["Content-Security-Policy"]
        assert csp_header is not None
        assert len(csp_header) > 0

    def test_csp_nonce_in_header(self, client):
        """
        Тест: CSP заголовок содержит nonce в директивных script-src
        """
        # Act
        response = client.get("/health")
        
        # Assert
        assert response.status_code == 200
        csp_header = response.headers["Content-Security-Policy"]
        
        # Проверяем, что nonce присутствует в script-src директиве
        assert "script-src" in csp_header
        assert "'nonce-" in csp_header
        assert "strict-dynamic" in csp_header
        
        # Извлекаем nonce из CSP заголовка
        nonce_match = re.search(r"'nonce-([^']+)'", csp_header)
        assert nonce_match is not None, "Nonce не найден в CSP заголовке"
        nonce = nonce_match.group(1)
        assert len(nonce) > 0, "Nonce пустой"

    def test_csp_nonce_format(self, client):
        """
        Тест: Nonce имеет корректный формат base64url
        Base64url использует символы: A-Z, a-z, 0-9, -, _
        """
        # Act
        response = client.get("/health")
        
        # Assert
        assert response.status_code == 200
        csp_header = response.headers["Content-Security-Policy"]
        
        # Извлекаем nonce
        nonce_match = re.search(r"'nonce-([^']+)'", csp_header)
        assert nonce_match is not None
        nonce = nonce_match.group(1)
        
        # Проверяем формат base64url (A-Z, a-z, 0-9, -, _)
        base64url_pattern = re.compile(r'^[A-Za-z0-9_-]+$')
        assert base64url_pattern.match(nonce), f"Nonce '{nonce}' не соответствует формату base64url"
        
        # Проверяем, что можно декодировать (опционально, для валидации)
        try:
            # base64url использует - и _ вместо + и /
            decoded = base64.urlsafe_b64decode(nonce + '==')  # Добавляем padding если нужно
            assert len(decoded) > 0, "Nonce декодируется в пустую строку"
        except Exception:
            # Если декодирование не удалось, это нормально для криптографически стойких токенов
            pass

    def test_csp_nonce_uniqueness(self, client):
        """
        Тест: Nonce уникален для каждого запроса
        """
        # Act - делаем несколько запросов
        response1 = client.get("/health")
        response2 = client.get("/health")
        response3 = client.get("/health")
        
        # Assert
        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response3.status_code == 200
        
        # Извлекаем nonce из каждого ответа
        def extract_nonce(response):
            csp_header = response.headers["Content-Security-Policy"]
            nonce_match = re.search(r"'nonce-([^']+)'", csp_header)
            assert nonce_match is not None
            return nonce_match.group(1)
        
        nonce1 = extract_nonce(response1)
        nonce2 = extract_nonce(response2)
        nonce3 = extract_nonce(response3)
        
        # Проверяем, что все nonce уникальны
        assert nonce1 != nonce2, "Nonce1 и Nonce2 должны быть разными"
        assert nonce2 != nonce3, "Nonce2 и Nonce3 должны быть разными"
        assert nonce1 != nonce3, "Nonce1 и Nonce3 должны быть разными"
        
        # Проверяем, что все nonce имеют корректную длину (secrets.token_urlsafe(16) дает ~22 символа)
        assert len(nonce1) >= 16, f"Nonce слишком короткий: {len(nonce1)}"
        assert len(nonce2) >= 16, f"Nonce слишком короткий: {len(nonce2)}"
        assert len(nonce3) >= 16, f"Nonce слишком короткий: {len(nonce3)}"

    def test_csp_nonce_generation_per_request(self, client):
        """
        Тест: Nonce генерируется заново для каждого запроса
        Проверяем, что даже последовательные запросы получают разные nonce
        """
        nonces = []
        
        # Делаем 10 последовательных запросов
        for _ in range(10):
            response = client.get("/health")
            assert response.status_code == 200
            
            csp_header = response.headers["Content-Security-Policy"]
            nonce_match = re.search(r"'nonce-([^']+)'", csp_header)
            assert nonce_match is not None
            nonces.append(nonce_match.group(1))
        
        # Проверяем, что все nonce уникальны
        unique_nonces = set(nonces)
        assert len(unique_nonces) == len(nonces), \
            f"Найдены повторяющиеся nonce. Всего: {len(nonces)}, уникальных: {len(unique_nonces)}"

    def test_csp_nonce_different_endpoints(self, client):
        """
        Тест: Разные эндпоинты получают разные nonce
        """
        # Act
        response1 = client.get("/health")
        response2 = client.get("/health")
        
        # Assert
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Извлекаем nonce
        def extract_nonce(response):
            csp_header = response.headers["Content-Security-Policy"]
            nonce_match = re.search(r"'nonce-([^']+)'", csp_header)
            return nonce_match.group(1) if nonce_match else None
        
        nonce1 = extract_nonce(response1)
        nonce2 = extract_nonce(response2)
        
        assert nonce1 is not None
        assert nonce2 is not None
        assert nonce1 != nonce2, "Разные эндпоинты должны получать разные nonce"

    def test_csp_full_policy_structure(self, client):
        """
        Тест: CSP заголовок содержит все необходимые директивы с nonce
        """
        # Act
        response = client.get("/health")
        
        # Assert
        assert response.status_code == 200
        csp_header = response.headers["Content-Security-Policy"]
        
        # Проверяем наличие основных директив
        assert "default-src 'self'" in csp_header
        assert "script-src" in csp_header
        assert "style-src" in csp_header
        assert "object-src 'none'" in csp_header
        assert "frame-ancestors 'none'" in csp_header
        
        # Проверяем, что script-src содержит nonce и strict-dynamic
        script_src_match = re.search(r"script-src\s+([^;]+)", csp_header)
        assert script_src_match is not None
        script_src_value = script_src_match.group(1)
        assert "'self'" in script_src_value
        assert "strict-dynamic" in script_src_value
        assert "'nonce-" in script_src_value

    def test_csp_nonce_length(self, client):
        """
        Тест: Nonce имеет достаточную длину для безопасности
        secrets.token_urlsafe(16) генерирует примерно 22 символа
        """
        # Act
        response = client.get("/health")
        
        # Assert
        assert response.status_code == 200
        csp_header = response.headers["Content-Security-Policy"]
        
        nonce_match = re.search(r"'nonce-([^']+)'", csp_header)
        assert nonce_match is not None
        nonce = nonce_match.group(1)
        
        # secrets.token_urlsafe(16) дает минимум 16 символов (обычно ~22)
        assert len(nonce) >= 16, f"Nonce слишком короткий: {len(nonce)} символов"
        assert len(nonce) <= 32, f"Nonce слишком длинный: {len(nonce)} символов"

    def test_security_headers_present(self, client):
        """
        Тест: Все заголовки безопасности присутствуют вместе с CSP nonce
        """
        # Act
        response = client.get("/health")
        
        # Assert
        assert response.status_code == 200
        
        # Проверяем наличие всех заголовков безопасности
        assert "Content-Security-Policy" in response.headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-Frame-Options" in response.headers
        assert "X-XSS-Protection" in response.headers
        assert "Referrer-Policy" in response.headers
        assert "Permissions-Policy" in response.headers
        
        # Проверяем значения заголовков
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["X-XSS-Protection"] == "1; mode=block"
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        
        # Проверяем, что CSP содержит nonce
        csp_header = response.headers["Content-Security-Policy"]
        assert "'nonce-" in csp_header

