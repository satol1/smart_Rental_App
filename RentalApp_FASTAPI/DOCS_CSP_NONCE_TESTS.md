# Тесты для CSP Nonce

## Описание

Данные тесты проверяют корректность генерации и использования CSP nonce в middleware `SecureHeadersMiddleware`.

## Покрытие тестами

Тесты проверяют следующие аспекты:

1. **Присутствие CSP заголовка** - `test_csp_header_present`
   - Проверяет, что заголовок `Content-Security-Policy` присутствует в ответе

2. **Присутствие nonce в CSP** - `test_csp_nonce_in_header`
   - Проверяет, что nonce присутствует в директивной `script-src`
   - Проверяет наличие `strict-dynamic`

3. **Формат nonce** - `test_csp_nonce_format`
   - Проверяет, что nonce соответствует формату base64url
   - Проверяет корректность символов (A-Z, a-z, 0-9, -, _)

4. **Уникальность nonce** - `test_csp_nonce_uniqueness`
   - Проверяет, что каждый запрос получает уникальный nonce
   - Тестирует на 3 последовательных запросах

5. **Генерация на каждый запрос** - `test_csp_nonce_generation_per_request`
   - Проверяет уникальность nonce для 10 последовательных запросов

6. **Разные эндпоинты** - `test_csp_nonce_different_endpoints`
   - Проверяет, что разные эндпоинты получают разные nonce

7. **Структура CSP политики** - `test_csp_full_policy_structure`
   - Проверяет наличие всех необходимых CSP директив
   - Проверяет корректность `script-src` с nonce

8. **Длина nonce** - `test_csp_nonce_length`
   - Проверяет, что nonce имеет достаточную длину (минимум 16 символов)

9. **Заголовки безопасности** - `test_security_headers_present`
   - Проверяет наличие всех заголовков безопасности вместе с CSP nonce

## Запуск тестов

### В Docker (рекомендуется)

#### Windows:
```powershell
cd RentalApp_FASTAPI
.\run_csp_nonce_tests.bat
```

#### Linux/Mac:
```bash
cd RentalApp_FASTAPI
./run_csp_nonce_tests.sh
```

#### Вручную через Docker Compose:
```bash
cd RentalApp_FASTAPI
docker compose -f docker-compose.csp-nonce-tests.yml up --build --abort-on-container-exit
```

### Локально (без Docker)

**Внимание:** Для локального запуска требуется:
- Установленный PostgreSQL (или отключить фикстуру создания БД)
- Настроенные переменные окружения

```bash
cd RentalApp_FASTAPI
pytest tests/api/test_csp_nonce.py -v --tb=short
```

## Реализация

Тесты используют `TestClient` из FastAPI для эмуляции HTTP запросов к приложению.

### Переменные окружения для тестов

Тесты автоматически устанавливают необходимые переменные окружения:
- `SECRET_KEY=abcdef0123456789abcdef0123456789`
- `CSRF_SECRET_KEY=0123456789abcdef0123456789abcdef`
- `DEBUG=false`
- `DISABLE_CSRF=false`

### Структура тестов

Все тесты находятся в классе `TestCSPNonce` и используют фикстуру `client` для получения тестового клиента FastAPI.

## Ожидаемые результаты

Все 9 тестов должны проходить успешно, подтверждая:
- ✅ CSP nonce генерируется для каждого запроса
- ✅ Nonce присутствует в CSP заголовке
- ✅ Nonce уникален для каждого запроса
- ✅ Nonce имеет корректный формат base64url
- ✅ CSP политика настроена корректно
- ✅ Все заголовки безопасности присутствуют

## Связанные файлы

- `api/main_api.py` - реализация `SecureHeadersMiddleware`
- `tests/api/test_csp_nonce.py` - файл с тестами
- `docker-compose.csp-nonce-tests.yml` - конфигурация Docker для тестов
- `run_csp_nonce_tests.sh` / `run_csp_nonce_tests.bat` - скрипты запуска

## Примечания

- Тесты не требуют базы данных, но используют общую фикстуру `create_test_database`, которая будет вызвана автоматически в Docker окружении.
- В Docker окружении фикстура работает корректно благодаря правильному пути `/app`.

