"""ORM models — the database schema.

Tables:
  build_runs     one row per build request: status, theme, timing
  decks          a generated deck: identity, theme, rules
  cards          the cards belonging to a deck
  projects       a saved user project (mirrors the frontend Projects shape)
  conversations  an agent chat session
  messages       the turns within a conversation
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class BuildRun(Base):
    """One deck-building request and its outcome."""

    __tablename__ = "build_runs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    theme: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="running")
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deck_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("decks.id"), nullable=True
    )
    deck: Mapped[Optional["DeckRow"]] = relationship(back_populates="build_run")


class DeckRow(Base):
    """A generated, balanced deck."""

    __tablename__ = "decks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    theme: Mapped[str] = mapped_column(String(200))
    rules: Mapped[dict] = mapped_column(JSON)
    balance_history: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    cards: Mapped[list["CardRow"]] = relationship(
        back_populates="deck", cascade="all, delete-orphan"
    )
    build_run: Mapped[Optional["BuildRun"]] = relationship(back_populates="deck")


class CardRow(Base):
    """One card belonging to a deck."""

    __tablename__ = "cards"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    deck_id: Mapped[str] = mapped_column(ForeignKey("decks.id"))
    position: Mapped[int] = mapped_column(Integer)
    rarity: Mapped[str] = mapped_column(String(20))
    payload: Mapped[dict] = mapped_column(JSON)

    deck: Mapped["DeckRow"] = relationship(back_populates="cards")


class ProjectRow(Base):
    """A saved user project.

    Mirrors the frontend's Projects shape exactly:
    {id, name, topic, deck, cards, createdAt, updatedAt}. The deck and
    cards are stored as JSON because the frontend owns their structure.
    """

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200))
    topic: Mapped[str] = mapped_column(String(200))
    deck: Mapped[dict] = mapped_column(JSON, default=dict)
    cards: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )


class ConversationRow(Base):
    """An agent chat session.

    `context` holds whatever the agent needs to remember between
    messages — most importantly the deck it has built so far.
    """

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(200), default="New conversation")
    context: Mapped[dict] = mapped_column(JSON, default=dict)
    project_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    messages: Mapped[list["MessageRow"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="MessageRow.position",
    )


class MessageRow(Base):
    """One turn in a conversation.

    A turn's `kind` matches the frontend turn vocabulary: user, agent,
    thinking, tools, panel, deliverable. `payload` is the full turn.
    """

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"))
    position: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(20))
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    conversation: Mapped["ConversationRow"] = relationship(
        back_populates="messages"
    )


class CardValueRow(Base):
    """Numeric attribute values sampled for a card (pre-balance)."""

    __tablename__ = "card_values"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    deck_id: Mapped[Optional[str]] = mapped_column(ForeignKey("decks.id"), nullable=True)
    card_id: Mapped[str] = mapped_column(String(32))
    cost: Mapped[int] = mapped_column(Integer)
    attack: Mapped[int] = mapped_column(Integer)
    defense: Mapped[int] = mapped_column(Integer)
    ability_magnitude: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
