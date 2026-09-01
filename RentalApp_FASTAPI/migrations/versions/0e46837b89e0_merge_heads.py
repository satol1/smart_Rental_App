"""Merge heads

Revision ID: 0e46837b89e0
Revises: 59f726050559, dc7cf2a3570f
Create Date: 2025-10-06 21:45:41.209182

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e46837b89e0'
down_revision: Union[str, None] = ('59f726050559', 'dc7cf2a3570f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
