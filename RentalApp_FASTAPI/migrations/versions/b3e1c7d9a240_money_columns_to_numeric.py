"""Money columns to Numeric(12,2)

Перевод денежных колонок с Float на Numeric(12,2):
- reservations.total_cost / discount_amount
- rentals.total_cost / discount_amount / final_cost / deposit_amount / prepayment_amount
- payments.amount
- users.balance
- balance_history.amount

Расчёты в сервисах переведены на Decimal (api/services/financial_service.to_decimal);
Pydantic-схемы остались float — конвертация на границе API, контракт фронтенда не меняется.
Float -> Numeric в PostgreSQL конвертируется неявно, данные не теряются
(значения округляются до 2 знаков — исторические значения были не точнее).

Revision ID: b3e1c7d9a240
Revises: 6d2468842f18
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3e1c7d9a240'
down_revision: Union[str, None] = '6d2468842f18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MONEY_COLUMNS = [
    ("reservations", "total_cost", "numeric", 12, 2, False),
    ("reservations", "discount_amount", "numeric", 12, 2, False),
    ("rentals", "total_cost", "numeric", 12, 2, False),
    ("rentals", "discount_amount", "numeric", 12, 2, False),
    ("rentals", "final_cost", "numeric", 12, 2, True),
    ("rentals", "deposit_amount", "numeric", 12, 2, True),
    ("rentals", "prepayment_amount", "numeric", 12, 2, False),
    ("payments", "amount", "numeric", 12, 2, False),
    ("users", "balance", "numeric", 12, 2, True),
    ("balance_history", "amount", "numeric", 12, 2, False),
]


def upgrade() -> None:
    for table, column, type_name, precision, scale, _nullable in MONEY_COLUMNS:
        op.alter_column(
            table,
            column,
            type_=sa.Numeric(precision=precision, scale=scale),
            postgresql_using=f"{column}::{type_name}({precision},{scale})",
        )


def downgrade() -> None:
    for table, column, _type_name, precision, scale, _nullable in MONEY_COLUMNS:
        # Float() без precision = double precision (как исходные колонки);
        # FLOAT(12) в PG = real (4 байта) и испортил бы суммы
        op.alter_column(
            table,
            column,
            type_=sa.Float(),
        )
