import pytest
from unittest.mock import AsyncMock, MagicMock

from app.core.models import Card, Content, Deck, Gameplay, Rules
from app.db import repository as repo
from app.db.orm import CardRow, DeckRow


def _sample_deck(deck_id: str = "deck-1", card_count: int = 2) -> Deck:
    cards = [
        Card(
            id=f"c{i}",
            rarity="common",
            gameplay=Gameplay(
                cost=i + 1, attack=i + 2, defense=i + 1, health=3, element="water", faction="deep"
            ),
            content=Content(name=f"Card {i}"),
        )
        for i in range(card_count)
    ]
    return Deck(
        id=deck_id,
        name="Deep Waters",
        theme="deep sea",
        rules=Rules(elements=["water"], factions=["deep"], keywords=["swim"]),
        cards=cards,
    )


@pytest.mark.asyncio
async def test_save_or_update_deck_creates_new():
    session = AsyncMock()
    session.add = MagicMock()
    # No existing deck
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    session.execute.return_value = result_mock

    deck = _sample_deck()
    row = await repo.save_or_update_deck(session, deck, balance_history=[{"round": 1}])

    assert session.add.called
    assert session.commit.called
    assert session.refresh.called
    assert row.id == "deck-1"
    assert row.name == "Deep Waters"
    assert len(row.cards) == 2


@pytest.mark.asyncio
async def test_save_or_update_deck_updates_existing():
    session = AsyncMock()
    session.add = MagicMock()
    # Existing deck row
    existing_row = DeckRow(
        id="deck-1",
        name="Old Name",
        theme="old theme",
        rules={},
        balance_history=[],
    )
    existing_row.cards = [
        CardRow(id="c0", deck_id="deck-1", position=0, rarity="common", payload={})
    ]

    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = existing_row
    session.execute.return_value = result_mock

    updated_deck = _sample_deck(card_count=3)
    updated_deck.name = "New Name"

    row = await repo.save_or_update_deck(session, updated_deck, balance_history=[{"round": 2}])

    assert session.flush.called
    assert session.commit.called
    assert session.refresh.called
    assert row.name == "New Name"
    assert len(row.cards) == 3
    assert row.balance_history == [{"round": 2}]
