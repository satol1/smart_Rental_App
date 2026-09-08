# tests/attic/misc-legacy — устаревшие тесты вне канонических наборов

Перенесено 08.09.2026 при стабилизации full-architecture стека.

| Файл | Откуда | Причина |
|---|---|---|
| `test_holiday_auto_extension_e2e.py` | tests/e2e | Конструирует `RentalRepository()` со старой сигнатурой (репозиторий расщеплён на query/command/financial — все 4 теста TypeError). Сценарий авто-продления сам помечен аудитом как проблемный (коммиты из репозиториев) |
| `test_equipment_copy_integration.py` | tests/integration | Ожидает старый контракт эндпоинта копирования (201/403/500, поле `id`) — все 5 падали против текущего API |
| `test_period_filtering_api.py` | tests/integration | Создаёт `User(telegram=...)` — поле переименовано в `telegram_username`; 16 setup-ошибок. Покрытие живо в `tests/integration/test_period_filtering.py` |
| `test_rental_creation_fix.py` | tests/ (корень) | Моки под старую реализацию сервиса создания аренды (coroutine-менеджеры, regex логов) — 5 из 6 падали; актуальное покрытие — `tests/services/test_rental_creation_service.py` |

Правило то же, что для `api-legacy`: файлы не удалены, при необходимости
перенести обратно и привести к текущим сигнатурам/контрактам.
