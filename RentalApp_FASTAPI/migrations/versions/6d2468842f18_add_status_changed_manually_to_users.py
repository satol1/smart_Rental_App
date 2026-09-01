"""add_status_changed_manually_to_users

Revision ID: 6d2468842f18
Revises: e84a207a5b19
Create Date: 2025-11-05 01:58:04.159215

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d2468842f18'
down_revision: Union[str, None] = 'e84a207a5b19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Добавляем поле status_changed_manually для отслеживания ручного изменения статуса
    op.add_column('users', sa.Column('status_changed_manually', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    # Удаляем поле status_changed_manually
    op.drop_column('users', 'status_changed_manually')
