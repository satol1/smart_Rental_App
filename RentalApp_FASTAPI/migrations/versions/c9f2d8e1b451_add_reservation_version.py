"""Add reservation version column for optimistic locking

Revision ID: c9f2d8e1b451
Revises: b3e1c7d9a240
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9f2d8e1b451'
down_revision: Union[str, None] = 'b3e1c7d9a240'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'reservations',
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
    )


def downgrade() -> None:
    op.drop_column('reservations', 'version')
