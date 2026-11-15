from contextlib import contextmanager
from threading import RLock
from sqlalchemy import create_engine, String, JSON, ForeignKey, Integer, UniqueConstraint, event
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from .config import settings
class Base(DeclarativeBase): pass
class Dataset(Base):
    __tablename__='datasets'
    id: Mapped[str] = mapped_column(String,primary_key=True)
    details: Mapped[dict] = mapped_column(JSON)
class ReferenceIndex(Base):
    __tablename__='reference_indexes'
    id: Mapped[str] = mapped_column(String,primary_key=True)
    dataset_id: Mapped[str] = mapped_column(ForeignKey('datasets.id'))
    details: Mapped[dict] = mapped_column(JSON)
class Candidate(Base):
    __tablename__='candidates'
    id: Mapped[str] = mapped_column(String,primary_key=True)
    index_id: Mapped[str] = mapped_column(ForeignKey('reference_indexes.id'))
    details: Mapped[dict] = mapped_column(JSON)
class Experiment(Base):
    __tablename__='experiments'
    id: Mapped[str] = mapped_column(String,primary_key=True)
    index_id: Mapped[str] = mapped_column(ForeignKey('reference_indexes.id'))
    public: Mapped[dict] = mapped_column(JSON)
    private: Mapped[dict] = mapped_column(JSON)
class Localization(Base):
    __tablename__='localizations'
    id: Mapped[str] = mapped_column(String,primary_key=True)
    experiment_id: Mapped[str] = mapped_column(ForeignKey('experiments.id'),unique=True)
    result: Mapped[dict] = mapped_column(JSON)
class Evaluation(Base):
    __tablename__='evaluations'
    id: Mapped[str] = mapped_column(String,primary_key=True)
    details: Mapped[dict] = mapped_column(JSON)
class Trial(Base):
    __tablename__='trials'
    __table_args__=(UniqueConstraint('evaluation_id','number'),)
    id: Mapped[str] = mapped_column(String,primary_key=True)
    evaluation_id: Mapped[str] = mapped_column(ForeignKey('evaluations.id'))
    number: Mapped[int] = mapped_column(Integer)
    details: Mapped[dict] = mapped_column(JSON)
class Job(Base):
    __tablename__='jobs'
    id: Mapped[str] = mapped_column(String,primary_key=True)
    details: Mapped[dict] = mapped_column(JSON)
engine=create_engine(f'sqlite:///{settings.state / "lunatrail.sqlite"}',connect_args={'check_same_thread':False,'timeout':30})
@event.listens_for(engine,'connect')
def pragmas(connection, _):
    connection.execute('PRAGMA foreign_keys=ON')
    connection.execute('PRAGMA journal_mode=WAL')
Session=sessionmaker(engine,expire_on_commit=False)
lock=RLock()
@contextmanager
def session():
    with lock, Session.begin() as s: yield s

def get(cls,id):
    with session() as s:
        obj=s.get(cls,id)
        if obj is None: raise KeyError(f'{cls.__name__} not found')
        s.expunge(obj)
        return obj

def migrate():
    from alembic.config import Config
    from alembic import command
    from .config import ROOT
    c=Config(str(ROOT/'backend/alembic.ini'))
    c.set_main_option('script_location',str(ROOT/'backend/migrations'))
    command.upgrade(c,'head')
