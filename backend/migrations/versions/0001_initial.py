"""Frozen initial local research schema (independent of future ORM changes)."""
from alembic import op
import sqlalchemy as sa
revision='0001'
down_revision=None
branch_labels=None
depends_on=None

def upgrade():
    def identity(): return sa.Column('id',sa.String(),primary_key=True)
    def details(name='details'): return sa.Column(name,sa.JSON(),nullable=False)
    op.create_table('datasets',identity(),details())
    op.create_table('reference_indexes',identity(),sa.Column('dataset_id',sa.String(),sa.ForeignKey('datasets.id'),nullable=False),details())
    op.create_table('candidates',identity(),sa.Column('index_id',sa.String(),sa.ForeignKey('reference_indexes.id'),nullable=False),details())
    op.create_table('experiments',identity(),sa.Column('index_id',sa.String(),sa.ForeignKey('reference_indexes.id'),nullable=False),details('public'),details('private'))
    op.create_table('localizations',identity(),sa.Column('experiment_id',sa.String(),sa.ForeignKey('experiments.id'),nullable=False,unique=True),details('result'))
    op.create_table('evaluations',identity(),details())
    op.create_table('trials',identity(),sa.Column('evaluation_id',sa.String(),sa.ForeignKey('evaluations.id'),nullable=False),sa.Column('number',sa.Integer(),nullable=False),details(),sa.UniqueConstraint('evaluation_id','number'))
    op.create_table('jobs',identity(),details())

def downgrade():
    for table in ['jobs','trials','evaluations','localizations','experiments','candidates','reference_indexes','datasets']:op.drop_table(table)
