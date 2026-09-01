"""Add user status gradation

Revision ID: add_user_status_gradation
Revises: b6ca9fd9cffc
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

ВАЖНО: Эта миграция не изменяет структуру БД.
Миграция данных выполняется через скрипт scripts/migrate_user_statuses.py

Для применения миграции данных выполните:
    python scripts/migrate_user_statuses.py

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
# ВАЖНО: Перед применением миграции сгенерируйте правильный revision ID командой:
# alembic revision -m "add_user_status_gradation"
revision: str = 'add_user_status_gradation'
down_revision: Union[str, None] = 'b6ca9fd9cffc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Миграция данных выполняется через скрипт scripts/migrate_user_statuses.py
    # Структурные изменения не требуются:
    # - Индекс на users.status уже создан в миграции b6ca9fd9cffc
    # - Дефолтное значение статуса установлено в модели User
    # - Тип поля status (String) поддерживает новые значения
    
    # Миграция данных должна быть выполнена вручную:
    # python scripts/migrate_user_statuses.py
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # Откат миграции данных должен быть выполнен через скрипт
    # Структурные изменения не требуются
    pass

