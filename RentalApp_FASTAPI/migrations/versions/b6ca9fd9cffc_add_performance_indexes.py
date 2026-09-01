"""add_performance_indexes

Revision ID: b6ca9fd9cffc
Revises: 0e46837b89e0
Create Date: 2025-10-10 20:32:30.152584

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6ca9fd9cffc'
down_revision: Union[str, None] = '0e46837b89e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # === ИНДЕКСЫ ДЛЯ ВНЕШНИХ КЛЮЧЕЙ ===
    
    # Users table - часто фильтруемые поля
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_status', 'users', ['status'])
    op.create_index('ix_users_is_active', 'users', ['is_active'])
    
    # Equipment table - часто фильтруемые поля
    op.create_index('ix_equipment_equipment_type', 'equipment', ['equipment_type'])
    op.create_index('ix_equipment_brand', 'equipment', ['brand'])
    op.create_index('ix_equipment_condition', 'equipment', ['condition'])
    
    # Reservations table - внешние ключи и часто фильтруемые поля
    op.create_index('ix_reservations_user_id', 'reservations', ['user_id'])
    op.create_index('ix_reservations_promo_code_id', 'reservations', ['promo_code_id'])
    op.create_index('ix_reservations_start_date', 'reservations', ['start_date'])
    op.create_index('ix_reservations_end_date', 'reservations', ['end_date'])
    op.create_index('ix_reservations_created_at', 'reservations', ['created_at'])
    
    # Rentals table - внешние ключи и часто фильтруемые поля
    op.create_index('ix_rentals_user_id', 'rentals', ['user_id'])
    op.create_index('ix_rentals_created_by_id', 'rentals', ['created_by_id'])
    op.create_index('ix_rentals_reservation_id', 'rentals', ['reservation_id'])
    op.create_index('ix_rentals_start_date', 'rentals', ['start_date'])
    op.create_index('ix_rentals_end_date', 'rentals', ['end_date'])
    op.create_index('ix_rentals_created_at', 'rentals', ['created_at'])
    op.create_index('ix_rentals_updated_at', 'rentals', ['updated_at'])
    
    # Payments table - внешние ключи и часто фильтруемые поля
    op.create_index('ix_payments_user_id', 'payments', ['user_id'])
    op.create_index('ix_payments_rental_id', 'payments', ['rental_id'])
    op.create_index('ix_payments_payment_date', 'payments', ['payment_date'])
    op.create_index('ix_payments_transaction_type', 'payments', ['transaction_type'])
    
    # Balance History table - внешние ключи и часто фильтруемые поля
    op.create_index('ix_balance_history_user_id', 'balance_history', ['user_id'])
    op.create_index('ix_balance_history_rental_id', 'balance_history', ['rental_id'])
    op.create_index('ix_balance_history_operation_type', 'balance_history', ['operation_type'])
    op.create_index('ix_balance_history_created_at', 'balance_history', ['created_at'])
    
    # Promo Codes table - внешние ключи и часто фильтруемые поля
    op.create_index('ix_promo_codes_created_by_id', 'promo_codes', ['created_by_id'])
    op.create_index('ix_promo_codes_specific_to_user_id', 'promo_codes', ['specific_to_user_id'])
    op.create_index('ix_promo_codes_is_active', 'promo_codes', ['is_active'])
    op.create_index('ix_promo_codes_valid_from', 'promo_codes', ['valid_from'])
    op.create_index('ix_promo_codes_expires_at', 'promo_codes', ['expires_at'])
    
    # Holiday Rules table - внешние ключи
    op.create_index('ix_holiday_rules_created_by_id', 'holiday_rules', ['created_by_id'])
    
    # Holidays table - внешние ключи
    op.create_index('ix_holidays_created_by_id', 'holidays', ['created_by_id'])
    op.create_index('ix_holidays_rule_id', 'holidays', ['rule_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # === УДАЛЕНИЕ ИНДЕКСОВ В ОБРАТНОМ ПОРЯДКЕ ===
    
    # Holidays table
    op.drop_index('ix_holidays_rule_id', table_name='holidays')
    op.drop_index('ix_holidays_created_by_id', table_name='holidays')
    
    # Holiday Rules table
    op.drop_index('ix_holiday_rules_created_by_id', table_name='holiday_rules')
    
    # Promo Codes table
    op.drop_index('ix_promo_codes_expires_at', table_name='promo_codes')
    op.drop_index('ix_promo_codes_valid_from', table_name='promo_codes')
    op.drop_index('ix_promo_codes_is_active', table_name='promo_codes')
    op.drop_index('ix_promo_codes_specific_to_user_id', table_name='promo_codes')
    op.drop_index('ix_promo_codes_created_by_id', table_name='promo_codes')
    
    # Balance History table
    op.drop_index('ix_balance_history_created_at', table_name='balance_history')
    op.drop_index('ix_balance_history_operation_type', table_name='balance_history')
    op.drop_index('ix_balance_history_rental_id', table_name='balance_history')
    op.drop_index('ix_balance_history_user_id', table_name='balance_history')
    
    # Payments table
    op.drop_index('ix_payments_transaction_type', table_name='payments')
    op.drop_index('ix_payments_payment_date', table_name='payments')
    op.drop_index('ix_payments_rental_id', table_name='payments')
    op.drop_index('ix_payments_user_id', table_name='payments')
    
    # Rentals table
    op.drop_index('ix_rentals_updated_at', table_name='rentals')
    op.drop_index('ix_rentals_created_at', table_name='rentals')
    op.drop_index('ix_rentals_end_date', table_name='rentals')
    op.drop_index('ix_rentals_start_date', table_name='rentals')
    op.drop_index('ix_rentals_reservation_id', table_name='rentals')
    op.drop_index('ix_rentals_created_by_id', table_name='rentals')
    op.drop_index('ix_rentals_user_id', table_name='rentals')
    
    # Reservations table
    op.drop_index('ix_reservations_created_at', table_name='reservations')
    op.drop_index('ix_reservations_end_date', table_name='reservations')
    op.drop_index('ix_reservations_start_date', table_name='reservations')
    op.drop_index('ix_reservations_promo_code_id', table_name='reservations')
    op.drop_index('ix_reservations_user_id', table_name='reservations')
    
    # Equipment table
    op.drop_index('ix_equipment_condition', table_name='equipment')
    op.drop_index('ix_equipment_brand', table_name='equipment')
    op.drop_index('ix_equipment_equipment_type', table_name='equipment')
    
    # Users table
    op.drop_index('ix_users_is_active', table_name='users')
    op.drop_index('ix_users_status', table_name='users')
    op.drop_index('ix_users_role', table_name='users')
