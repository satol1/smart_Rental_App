"""Экспорт OpenAPI-схемы в JSON для codegen типов фронтенда.

Запуск (из корня RentalApp_FASTAPI):
    python scripts/export_openapi.py [выходной_файл]

По умолчанию пишет openapi.json в корень бэкенда. Переменные окружения
берутся из env.test (если файл есть) — импорт приложения требует
SECRET_KEY/CSRF_SECRET_KEY, БД при импорте не нужна.
"""
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))


def _load_test_env() -> None:
    env_file = BACKEND_ROOT / "env.test"
    if not env_file.exists():
        return
    import os

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def main() -> None:
    _load_test_env()

    from api.main_api import app  # noqa: E402 — импорт после настройки env

    spec = app.openapi()
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else BACKEND_ROOT / "openapi.json"
    out.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OpenAPI {spec.get('info', {}).get('title')}: {len(spec.get('paths', {}))} путей -> {out}")


if __name__ == "__main__":
    main()
