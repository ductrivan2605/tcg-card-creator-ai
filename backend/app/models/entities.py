from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Session(Base):
    __tablename__ = 'sessions'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default='created', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    cards: Mapped[list[Card]] = relationship('Card', back_populates='session', cascade='all, delete-orphan')
    simulation_results: Mapped[list[SimulationResult]] = relationship(
        'SimulationResult', back_populates='session', cascade='all, delete-orphan'
    )
    decks: Mapped[list[Deck]] = relationship('Deck', back_populates='session', cascade='all, delete-orphan')


class Card(Base):
    __tablename__ = 'cards'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('sessions.id', ondelete='CASCADE'))
    card_id: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    flavour_text: Mapped[str] = mapped_column(Text, nullable=False)
    ability_name: Mapped[str] = mapped_column(String(120), nullable=False)
    ability_description: Mapped[str] = mapped_column(Text, nullable=False)
    ability_type: Mapped[str] = mapped_column(String(50), nullable=False)
    rarity: Mapped[str] = mapped_column(String(20), nullable=False)
    theme_tags: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    raw_provider_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session: Mapped[Session] = relationship('Session', back_populates='cards')
    values: Mapped[CardValue] = relationship('CardValue', back_populates='card', uselist=False, cascade='all, delete-orphan')


class CardValue(Base):
    __tablename__ = 'card_values'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('cards.id', ondelete='CASCADE'), unique=True)
    attack: Mapped[int] = mapped_column(Integer, nullable=False)
    defence: Mapped[int] = mapped_column(Integer, nullable=False)
    cost: Mapped[int] = mapped_column(Integer, nullable=False)
    ability_magnitude: Mapped[float] = mapped_column(Float, nullable=False)
    generated_from_rules: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    card: Mapped[Card] = relationship('Card', back_populates='values')


class SimulationResult(Base):
    __tablename__ = 'simulation_results'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('sessions.id', ondelete='CASCADE'))
    iteration: Mapped[int] = mapped_column(Integer, nullable=False)
    win_rate_std: Mapped[float] = mapped_column(Float, nullable=False)
    usage_entropy: Mapped[float] = mapped_column(Float, nullable=False)
    converged: Mapped[bool] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session: Mapped[Session] = relationship('Session', back_populates='simulation_results')


class Deck(Base):
    __tablename__ = 'decks'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('sessions.id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    card_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default='draft', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session: Mapped[Session] = relationship('Session', back_populates='decks')
