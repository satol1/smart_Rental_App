"""add usage_count to promo_code_usages

Revision ID: 577db0f26ebd
Revises: c9f2d8e1b451
Create Date: 2026-09-12

Счётчик использований в строке usages: PK (user_id, promo_code_id) допускает
только одну строку на пару, поэтому max_uses_per_user > 1 реализован
инкрементом usage_count. Существующие строки = одно использование.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '577db0f26ebd'
down_revision = 'c9f2d8e1b451'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'promo_code_usages',
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='1'),
    )


def downgrade() -> None:
    op.drop_column('promo_code_usages', 'usage_count')
