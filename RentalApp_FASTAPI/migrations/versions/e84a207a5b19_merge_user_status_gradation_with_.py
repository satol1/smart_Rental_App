"""merge user status gradation with security audit

Revision ID: e84a207a5b19
Revises: add_user_status_gradation, a5a01de73060
Create Date: 2025-11-05 00:30:16.032419

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e84a207a5b19'
down_revision: Union[str, None] = ('add_user_status_gradation', 'a5a01de73060')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
