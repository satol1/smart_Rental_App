"""Add security audit logs table

Revision ID: 014
Revises: 0e46837b89e0
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '014'
down_revision = '0e46837b89e0'
branch_labels = None
depends_on = None


def upgrade():
    # Create security_audit_logs table
    op.create_table('security_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('event_category', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('user_email', sa.String(length=255), nullable=True),
        sa.Column('user_role', sa.String(length=50), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.Column('request_path', sa.String(length=500), nullable=True),
        sa.Column('request_id', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('failure_reason', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better performance
    op.create_index('ix_security_audit_logs_event_type', 'security_audit_logs', ['event_type'])
    op.create_index('ix_security_audit_logs_event_category', 'security_audit_logs', ['event_category'])
    op.create_index('ix_security_audit_logs_severity', 'security_audit_logs', ['severity'])
    op.create_index('ix_security_audit_logs_user_id', 'security_audit_logs', ['user_id'])
    op.create_index('ix_security_audit_logs_user_email', 'security_audit_logs', ['user_email'])
    op.create_index('ix_security_audit_logs_ip_address', 'security_audit_logs', ['ip_address'])
    op.create_index('ix_security_audit_logs_request_id', 'security_audit_logs', ['request_id'])
    op.create_index('ix_security_audit_logs_created_at', 'security_audit_logs', ['created_at'])
    op.create_index('ix_security_audit_logs_session_id', 'security_audit_logs', ['session_id'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_security_audit_logs_session_id', table_name='security_audit_logs')
    op.drop_index('ix_security_audit_logs_created_at', table_name='security_audit_logs')
    op.drop_index('ix_security_audit_logs_request_id', table_name='security_audit_logs')
    op.drop_index('ix_security_audit_logs_ip_address', table_name='security_audit_logs')
    op.drop_index('ix_security_audit_logs_user_email', table_name='security_audit_logs')
    op.drop_index('ix_security_audit_logs_user_id', table_name='security_audit_logs')
    op.drop_index('ix_security_audit_logs_severity', table_name='security_audit_logs')
    op.drop_index('ix_security_audit_logs_event_category', table_name='security_audit_logs')
    op.drop_index('ix_security_audit_logs_event_type', table_name='security_audit_logs')
    
    # Drop table
    op.drop_table('security_audit_logs')
