"""add granular fields to rental_equipment

Revision ID: f2a3b4c5d6e7
Revises: 577db0f26ebd
Create Date: 2026-09-12

Добавление полей детализации позиций в связующую таблицу rental_equipment:
- status: rented / returned / lost (default 'rented')
- actual_return_date: дата возврата позиции (для частичного возврата)
- daily_rate: суточная ставка единицы на момент аренды
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f2a3b4c5d6e7'
down_revision = '577db0f26ebd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'rental_equipment',
        sa.Column('status', sa.String(length=20), nullable=False, server_default='rented')
    )
    op.add_column(
        'rental_equipment',
        sa.Column('actual_return_date', sa.Date(), nullable=True)
    )
    op.add_column(
        'rental_equipment',
        sa.Column('daily_rate', sa.Numeric(precision=12, scale=2), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('rental_equipment', 'daily_rate')
    op.drop_column('rental_equipment', 'actual_return_date')
    op.drop_column('rental_equipment', 'status')
