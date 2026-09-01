"""merge security audit with performance indexes

Revision ID: 8a94d05ff759
Revises: 014, b6ca9fd9cffc
Create Date: 2025-10-27 20:37:22.970436

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a94d05ff759'
down_revision: Union[str, None] = ('014', 'b6ca9fd9cffc')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
