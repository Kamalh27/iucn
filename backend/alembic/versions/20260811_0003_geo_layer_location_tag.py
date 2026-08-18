"""Add location tags to geospatial layers."""
from alembic import op
import sqlalchemy as sa

revision = "20260811_0003"
down_revision = "20260811_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("geo_layers", sa.Column("location_tag", sa.String(), nullable=True))
    op.execute("UPDATE geo_layers SET location_tag = 'chiang-rai' WHERE location_tag IS NULL")
    op.alter_column("geo_layers", "location_tag", nullable=False, server_default="chiang-rai")


def downgrade() -> None:
    op.drop_column("geo_layers", "location_tag")
