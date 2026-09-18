import asyncio

import pytest

from app.balance.engine import BalanceEngine
from app.core.models import Deck, Card, Content, Gameplay, Rules, BalanceMetrics, BalanceTargets
from app.llm.client import LLMError


def _make_deck_single_card() -> Deck:
    card = Card(
        id="c1",
        rarity="common",
        gameplay=Gameplay(cost=2, attack=2, defense=1, health=3, element="neutral", faction="none"),
        content=Content(name="Tiny Guard"),
    )
    return Deck(id="d1", name="Tiny", theme="tiny", rules=Rules(elements=[], factions=[], keywords=[]), cards=[card])


@pytest.mark.asyncio
async def test_evaluate_parses_valid_decision():
    class DummyLLM:
        async def generate_json(self, prompt, system=None):
            return {"converged": True, "summary": "ok", "adjustments": []}

    engine = BalanceEngine(DummyLLM())
    deck = _make_deck_single_card()
    metrics = BalanceMetrics(win_rate_spread=0.1, mean_win_rate=0.5, avg_game_length=8.0, dominance=0.3, generation=1)
    targets = BalanceTargets()

    decision = await engine.evaluate(deck, metrics, targets)
    assert decision.converged is True
    assert decision.adjustments == []


@pytest.mark.asyncio
async def test_evaluate_handles_invalid_decision():
    class DummyLLM:
        async def generate_json(self, prompt, system=None):
            # malformed: missing required keys
            return {"foo": "bar"}

    engine = BalanceEngine(DummyLLM())
    deck = _make_deck_single_card()
    metrics = BalanceMetrics(win_rate_spread=0.1, mean_win_rate=0.5, avg_game_length=8.0, dominance=0.3, generation=1)
    targets = BalanceTargets()

    with pytest.raises(LLMError):
        await engine.evaluate(deck, metrics, targets)
