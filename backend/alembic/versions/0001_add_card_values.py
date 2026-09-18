"""create card_values table

Revision ID: 0001_add_card_values
Revises: 
Create Date: 2026-05-21 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_add_card_values'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'card_values',
        sa.Column('id', sa.String(length=32), primary_key=True),
        sa.Column('deck_id', sa.String(length=64), sa.ForeignKey('decks.id'), nullable=True),
        sa.Column('card_id', sa.String(length=32), nullable=False),
        sa.Column('cost', sa.Integer(), nullable=False),
        sa.Column('attack', sa.Integer(), nullable=False),
        sa.Column('defense', sa.Integer(), nullable=False),
        sa.Column('ability_magnitude', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('card_values')
