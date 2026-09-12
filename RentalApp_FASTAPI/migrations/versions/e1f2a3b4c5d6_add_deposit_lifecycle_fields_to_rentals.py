"""add deposit lifecycle fields to rentals

Revision ID: e1f2a3b4c5d6
Revises: f2a3b4c5d6e7
Create Date: 2026-09-12

Добавление полей жизненного цикла залога в таблицу rentals:
- deposit_status: held / refunded / partially_retained / retained_for_damage
- deposit_refunded_amount: фактически возвращенная сумма залога
- deposit_retained_amount: фактически удержанная сумма залога
- deposit_notes: комментарий / обоснование удержания или возврата
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e1f2a3b4c5d6'
down_revision = 'f2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'rentals',
        sa.Column('deposit_status', sa.String(length=30), nullable=True)
    )
    op.add_column(
        'rentals',
        sa.Column('deposit_refunded_amount', sa.Numeric(precision=12, scale=2), nullable=True, server_default='0.00')
    )
    op.add_column(
        'rentals',
        sa.Column('deposit_retained_amount', sa.Numeric(precision=12, scale=2), nullable=True, server_default='0.00')
    )
    op.add_column(
        'rentals',
        sa.Column('deposit_notes', sa.Text(), nullable=True)
    )

    # Инициализация существующих данных:
    # Активные аренды с залогом считаются удерживающими залог ('held')
    op.execute(
        "UPDATE rentals SET deposit_status = 'held' WHERE deposit_amount > 0 AND status IN ('active', 'overdue')"
    )
    # Завершенные аренды с залогом считаются возвращенными ('refunded')
    op.execute(
        "UPDATE rentals SET deposit_status = 'refunded', deposit_refunded_amount = deposit_amount WHERE deposit_amount > 0 AND status IN ('completed', 'completed_with_debt')"
    )


def downgrade() -> None:
    op.drop_column('rentals', 'deposit_notes')
    op.drop_column('rentals', 'deposit_retained_amount')
    op.drop_column('rentals', 'deposit_refunded_amount')
    op.drop_column('rentals', 'deposit_status')
