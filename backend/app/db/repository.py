"""Repository layer — reads and writes the database.

The rest of the app uses these functions; it never writes SQL directly.
This keeps the ORM contained to the db package.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.models import Deck
from app.db.orm import (
    BuildRun,
    CardRow,
    CardValueRow,
    ConversationRow,
    DeckRow,
    MessageRow,
    ProjectRow,
)


async def create_build_run(session: AsyncSession, theme: str) -> BuildRun:
    """Record the start of a build."""
    run = BuildRun(theme=theme, status="running")
    session.add(run)
    await session.commit()
    await session.refresh(run)
    return run


async def save_deck(
    session: AsyncSession, deck: Deck, balance_history: list[dict]
) -> DeckRow:
    """Persist a finished deck and its cards."""
    return await save_or_update_deck(session, deck, balance_history)


async def save_or_update_deck(
    session: AsyncSession, deck: Deck, balance_history: list[dict] | None = None
) -> DeckRow:
    """Save a new deck or update an existing one including all its cards."""
    result = await session.execute(
        select(DeckRow)
        .where(DeckRow.id == deck.id)
        .options(selectinload(DeckRow.cards))
    )
    row = result.scalar_one_or_none()

    if row is None:
        row = DeckRow(
            id=deck.id,
            name=deck.name,
            theme=deck.theme,
            rules=deck.rules.model_dump(),
            balance_history=balance_history or [],
        )
        for position, card in enumerate(deck.cards):
            row.cards.append(
                CardRow(
                    id=card.id,
                    deck_id=deck.id,
                    position=position,
                    rarity=card.rarity,
                    payload=card.model_dump(),
                )
            )
        session.add(row)
    else:
        row.name = deck.name
        row.theme = deck.theme
        row.rules = deck.rules.model_dump()
        if balance_history is not None:
            row.balance_history = balance_history
        row.cards.clear()
        await session.flush()
        for position, card in enumerate(deck.cards):
            row.cards.append(
                CardRow(
                    id=card.id,
                    deck_id=deck.id,
                    position=position,
                    rarity=card.rarity,
                    payload=card.model_dump(),
                )
            )
        session.add(row)

    await session.commit()
    await session.refresh(row)
    return row



async def finish_build_run(
    session: AsyncSession,
    run: BuildRun,
    *,
    deck_id: str | None,
    error: str | None = None,
) -> None:
    """Mark a build run complete or failed."""
    run.status = "failed" if error else "succeeded"
    run.error = error
    run.deck_id = deck_id
    run.finished_at = datetime.now(timezone.utc)
    session.add(run)
    await session.commit()


async def list_decks(session: AsyncSession, limit: int = 50) -> list[DeckRow]:
    """Return recently generated decks, newest first."""
    result = await session.execute(
        select(DeckRow).order_by(DeckRow.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def get_deck(session: AsyncSession, deck_id: str) -> DeckRow | None:
    """Load a single deck with its cards."""
    result = await session.execute(
        select(DeckRow)
        .where(DeckRow.id == deck_id)
        .options(selectinload(DeckRow.cards))
    )
    return result.scalar_one_or_none()


# ── projects ─────────────────────────────────────────────────

async def list_projects(session: AsyncSession) -> list[ProjectRow]:
    """Return all saved projects, most recently updated first."""
    result = await session.execute(
        select(ProjectRow).order_by(ProjectRow.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_project(
    session: AsyncSession, project_id: str
) -> ProjectRow | None:
    """Load one project."""
    return await session.get(ProjectRow, project_id)


async def create_project(
    session: AsyncSession,
    *,
    name: str,
    topic: str,
    deck: dict,
    cards: list,
    project_id: str | None = None,
) -> ProjectRow:
    """Create a project. An id may be supplied to match a client id."""
    row = ProjectRow(name=name, topic=topic, deck=deck, cards=cards)
    if project_id:
        row.id = project_id
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def update_project(
    session: AsyncSession, project_id: str, fields: dict
) -> ProjectRow | None:
    """Update a project's fields. Returns the updated row, or None."""
    row = await session.get(ProjectRow, project_id)
    if row is None:
        return None
    for key in ("name", "topic", "deck", "cards"):
        if key in fields:
            setattr(row, key, fields[key])
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def delete_project(session: AsyncSession, project_id: str) -> bool:
    """Delete a project. Returns True if a row was removed."""
    row = await session.get(ProjectRow, project_id)
    if row is None:
        return False
    await session.delete(row)
    await session.commit()
    return True


# ── conversations ────────────────────────────────────────────

async def create_conversation(
    session: AsyncSession, *, title: str = "New conversation"
) -> ConversationRow:
    """Start a new chat conversation."""
    row = ConversationRow(title=title)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def get_conversation(
    session: AsyncSession, conversation_id: str
) -> ConversationRow | None:
    """Load a conversation with its messages."""
    result = await session.execute(
        select(ConversationRow)
        .where(ConversationRow.id == conversation_id)
        .options(selectinload(ConversationRow.messages))
    )
    return result.scalar_one_or_none()


async def append_message(
    session: AsyncSession,
    conversation: ConversationRow,
    *,
    kind: str,
    payload: dict,
) -> MessageRow:
    """Append one turn to a conversation."""
    count = await session.scalar(
        select(func.count())
        .select_from(MessageRow)
        .where(MessageRow.conversation_id == conversation.id)
    )
    msg = MessageRow(
        conversation_id=conversation.id,
        position=count or 0,
        kind=kind,
        payload=payload,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return msg


async def set_conversation_context(
    session: AsyncSession, conversation: ConversationRow, context: dict
) -> None:
    """Replace a conversation's stored context (the agent's memory)."""
    conversation.context = context
    session.add(conversation)
    await session.commit()


async def save_card_values(
    session: AsyncSession, values: list[dict], *, deck_id: str | None = None
) -> None:
    """Persist sampled card attribute values.

    `values` is a list of dicts with keys: card_id, cost, attack, defense, ability_magnitude
    """
    for v in values:
        row = CardValueRow(
            deck_id=deck_id,
            card_id=v.get("card_id") or v.get("id"),
            cost=int(v.get("cost", 0)),
            attack=int(v.get("attack", 0)),
            defense=int(v.get("defense", 0)),
            ability_magnitude=int(v.get("ability_magnitude", 0)),
        )
        session.add(row)
    await session.commit()
