"""add_tech_role_and_team

Adds 'tech' to UserRole and TeamTarget enums for the Sales -> Product -> Tech
ticket workflow.

Revision ID: 5c1d4e8a9f02
Revises: 3a8f2c91e6d4
Create Date: 2026-06-23 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c1d4e8a9f02'
down_revision: Union[str, Sequence[str], None] = '3a8f2c91e6d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ROLE_OLD = ('sales', 'product', 'admin')
ROLE_NEW = ('sales', 'product', 'tech', 'admin')
TEAM_OLD = ('sales', 'product')
TEAM_NEW = ('sales', 'product', 'tech')


def upgrade() -> None:
    bind = op.get_bind()
    # On Postgres these columns are plain VARCHAR with no CHECK constraint
    # (native_enum=False, create_constraint defaults False), and 'tech' fits the
    # existing width — nothing to do. Only SQLite enforces the enum via CHECK.
    if bind.dialect.name != 'sqlite':
        return
    with op.batch_alter_table('users', recreate='always') as batch_op:
        batch_op.alter_column(
            'role',
            existing_type=sa.Enum(*ROLE_OLD, name='userrole', native_enum=False),
            type_=sa.Enum(*ROLE_NEW, name='userrole', native_enum=False),
            existing_nullable=False,
        )
    with op.batch_alter_table('tickets', recreate='always') as batch_op:
        batch_op.alter_column(
            'to_team',
            existing_type=sa.Enum(*TEAM_OLD, name='teamtarget', native_enum=False),
            type_=sa.Enum(*TEAM_NEW, name='teamtarget', native_enum=False),
            existing_nullable=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != 'sqlite':
        return
    with op.batch_alter_table('tickets', recreate='always') as batch_op:
        batch_op.alter_column(
            'to_team',
            existing_type=sa.Enum(*TEAM_NEW, name='teamtarget', native_enum=False),
            type_=sa.Enum(*TEAM_OLD, name='teamtarget', native_enum=False),
            existing_nullable=False,
        )
    with op.batch_alter_table('users', recreate='always') as batch_op:
        batch_op.alter_column(
            'role',
            existing_type=sa.Enum(*ROLE_NEW, name='userrole', native_enum=False),
            type_=sa.Enum(*ROLE_OLD, name='userrole', native_enum=False),
            existing_nullable=False,
        )
