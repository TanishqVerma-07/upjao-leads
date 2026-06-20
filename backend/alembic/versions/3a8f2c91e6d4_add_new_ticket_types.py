"""add_new_ticket_types

Revision ID: 3a8f2c91e6d4
Revises: 07bef710acde
Create Date: 2026-06-19 11:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a8f2c91e6d4'
down_revision: Union[str, Sequence[str], None] = '07bef710acde'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_VALUES = ('analysis_request', 'sample_request', 'general')
NEW_VALUES = OLD_VALUES + (
    'new_commodity', 'new_variety', 'quality_mismatch', 'accuracy_issue',
)


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('tickets', recreate='always') as batch_op:
        batch_op.alter_column(
            'type',
            existing_type=sa.Enum(*OLD_VALUES, name='tickettype', native_enum=False),
            type_=sa.Enum(*NEW_VALUES, name='tickettype', native_enum=False),
            existing_nullable=False,
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('tickets', recreate='always') as batch_op:
        batch_op.alter_column(
            'type',
            existing_type=sa.Enum(*NEW_VALUES, name='tickettype', native_enum=False),
            type_=sa.Enum(*OLD_VALUES, name='tickettype', native_enum=False),
            existing_nullable=False,
        )
