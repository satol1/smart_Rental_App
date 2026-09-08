#!/bin/bash
# Быстрый запуск только юнит-тестов (без интеграционных и E2E)
# Время выполнения: ~30 секунд вместо 6+ минут

echo "========================================"
echo "🚀 Запуск быстрых юнит-тестов"
echo "========================================"

# Проверяем наличие виртуального окружения
if [ ! -d ".venv" ] && [ ! -d "venv" ]; then
    echo "❌ Виртуальное окружение не найдено. Создайте его командой: python -m venv venv"
    exit 1
fi

# Активируем виртуальное окружение
if [ -d ".venv" ]; then source .venv/bin/activate; else source venv/bin/activate; fi

# Устанавливаем зависимости если нужно
if ! ls .venv/lib/python*/site-packages/pytest >/dev/null 2>&1 && ! ls venv/lib/python*/site-packages/pytest >/dev/null 2>&1; then
    echo "📦 Устанавливаем тестовые зависимости..."
    pip install -r requirements-test.txt
fi

echo "🧪 Запускаем только юнит-тесты..."
pytest tests/services/ -v --tb=short -m "not slow"

echo "========================================"
echo "✅ Юнит-тесты завершены"
echo "========================================"
