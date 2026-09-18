"""The balance loop — the hybrid of genetic algorithm and LLM.

This is the three-stage loop from the design doc:

  1. SIMULATE   the genetic algorithm runs and produces metrics
  2. EVALUATE   the LLM reads those metrics and decides what to change
  3. REGENERATE the decided changes are applied to the deck

Steps 2 is where the AI makes the balancing decision. The GA finds the
numbers; the model interprets them and chooses specific stat changes
with reasons. The loop repeats until the model reports convergence.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

from app.balance.genetic_algorithm import optimize
from app.core.models import (
    BalanceDecision,
    BalanceMetrics,
    BalanceTargets,
    Card,
    CardAdjustment,
    Deck,
)
from app.llm.client import LLMClient, LLMError
from app.skills.loader import load_skill
from app.core.validators import validate_balance_decision


@dataclass
class BalanceRound:
    """One pass of the balance loop — what happened in it."""
    round_number: int
    metrics: BalanceMetrics
    decision: BalanceDecision


def _apply(deck: Deck, adjustments: list[CardAdjustment]) -> Deck:
    """Apply the LLM's decided adjustments to the deck's cards."""
    by_id = {c.id: c for c in deck.cards}
    for adj in adjustments:
        card = by_id.get(adj.card_id)
        if card is None:
            continue
        stat = adj.stat
        current = getattr(card.gameplay, stat)
        setattr(card.gameplay, stat, max(0, current + adj.delta))
    return deck


def _decision_prompt(deck: Deck, metrics: BalanceMetrics, targets: BalanceTargets) -> str:
    """Build the prompt that asks the model for a balancing decision."""
    cards = [
        {
            "id": c.id,
            "name": c.content.name,
            "type": c.content.type_line,
            "rarity": c.rarity,
            "cost": c.gameplay.cost,
            "attack": c.gameplay.attack,
            "defense": c.gameplay.defense,
            "ability": c.content.ability,
            "power": c.power(),
            "cost_power_ratio": round(c.cost_power_ratio(), 2),
        }
        for c in deck.cards
    ]
    return (
        "A multi-deck battle simulator tested this deck against benchmark meta archetypes "
        "(Aggro, Midrange, Control) following Godot combat rules and produced these metrics:\n"
        f"{metrics.model_dump_json(indent=2)}\n\n"
        "The deck is balanced when it meets these targets:\n"
        f"{targets.model_dump_json(indent=2)}\n\n"
        "Here are the cards in the deck:\n"
        f"{json.dumps(cards, indent=2)}\n\n"
        "Decide whether the deck is balanced against the meta pool. If it is not, choose the "
        "smallest set of single-stat changes (cost, attack, defense) that would move the metrics "
        "toward the targets. For spell cards, only modify 'cost'. Reply with raw JSON of this shape:\n"
        '{"converged": bool, "summary": str, "adjustments": '
        '[{"card_id": str, "stat": "cost|attack|defense", '
        '"delta": int, "reason": str}]}'
    )


class BalanceEngine:
    """Runs the GA + LLM balance loop over a deck."""

    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm

    async def evaluate(
        self, deck: Deck, metrics: BalanceMetrics, targets: BalanceTargets
    ) -> BalanceDecision:
        """Stage 2 — the LLM reads the metrics and decides adjustments."""
        system = load_skill("balance-tuning")
        prompt = _decision_prompt(deck, metrics, targets)
        raw = await self._llm.generate_json(prompt, system=system)
        try:
            return validate_balance_decision(raw)
        except ValueError as exc:
            # Surface a clear LLM-related error so callers can handle it.
            raise LLMError(f"Failed to parse balance decision from LLM: {exc}") from exc

    async def run(
        self,
        deck: Deck,
        *,
        targets: BalanceTargets | None = None,
        max_rounds: int = 4,
    ):
        """Run the full balance loop, yielding each round as it completes."""
        targets = targets or BalanceTargets()

        for round_number in range(1, max_rounds + 1):
            # 1. SIMULATE — the genetic algorithm
            metrics = optimize(deck.cards, seed=round_number)

            # 2. EVALUATE — the LLM makes the balancing decision
            decision = await self.evaluate(deck, metrics, targets)

            yield BalanceRound(round_number, metrics, decision)

            if decision.converged or not decision.adjustments:
                return

            # 3. REGENERATE — apply the decided changes
            deck = _apply(deck, decision.adjustments)
