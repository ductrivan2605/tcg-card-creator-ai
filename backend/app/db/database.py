"""Database engine and session management.

Uses SQLAlchemy with the async Postgres driver. The connection string
comes from the environment so it works the same in Docker and locally.
"""
from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""


engine = create_async_engine(settings.database_url, echo=False, future=True)

SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency that yields a database session per request."""
    async with SessionFactory() as session:
        yield session


async def init_models() -> None:
    """Create all tables that do not yet exist."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        import logging
        logging.warning("Database connection failed (%s); proceeding in offline/stateless mode.", exc)
