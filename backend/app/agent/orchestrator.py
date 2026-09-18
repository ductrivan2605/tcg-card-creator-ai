"""The agent orchestrator.

The agent builds a balanced deck from a user's request. It runs a real
workflow — each step's output feeds the next — and emits progress
events so a UI can show what is happening:

  request -> generate rules -> generate cards -> balance loop -> deck

The balance loop is the genetic algorithm and the LLM working together:
the GA simulates, the LLM decides the changes. The agent streams an
event for every step, including each round of the balance loop.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

from app.agent.tools import generate_cards, generate_images, generate_rules, new_deck
from app.balance.engine import BalanceEngine
from app.core.models import BalanceTargets, Deck
from app.llm.client import LLMClient


@dataclass
class AgentEvent:
    """A progress event emitted by the agent as it works."""
    type: str                       # "status" | "rules" | "cards" | "balance" | "done"
    message: str
    data: dict[str, Any] = field(default_factory=dict)


class DeckBuildingAgent:
    """Builds and balances a deck, emitting progress events."""

    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm
        self._balance = BalanceEngine(llm)

    async def build(
        self, theme: str, *, card_count: int = 60, generate_art: bool = True
    ) -> AsyncIterator[AgentEvent]:
        """Run the full deck-building workflow for a theme."""
        yield AgentEvent("status", f"Designing rules for '{theme}'.")

        # step 1 — rules
        rules = await generate_rules(self._llm, theme)
        yield AgentEvent(
            "rules",
            f"Rules ready: {len(rules.elements)} elements, "
            f"{len(rules.factions)} factions.",
            data=rules.model_dump(),
        )

        # step 2 — cards
        yield AgentEvent("status", f"Generating {card_count} cards.")
        deck = new_deck(theme, rules)
        deck.cards = await generate_cards(self._llm, theme, rules, card_count)
        yield AgentEvent(
            "cards",
            f"Generated {len(deck.cards)} cards.",
            data={"cards": [c.model_dump() for c in deck.cards]},
        )

        # step 2b — artwork (concurrent, streams one event per card)
        if generate_art:
            yield AgentEvent("status", f"Generating artwork for {len(deck.cards)} cards.")
            art_queue: asyncio.Queue = asyncio.Queue()
            total_cards = len(deck.cards)

            async def _on_art_progress(card) -> None:
                await art_queue.put(
                    AgentEvent(
                        "artwork",
                        f"Artwork done: {card.content.name}",
                        data={
                            "card_id": card.id,
                            "has_artwork": bool(card.content.artwork),
                        },
                    )
                )

            art_task = asyncio.create_task(
                generate_images(self._llm, deck.cards, theme, on_progress=_on_art_progress)
            )
            received = 0
            while received < total_cards:
                try:
                    event = await asyncio.wait_for(art_queue.get(), timeout=0.5)
                    received += 1
                    yield event
                except asyncio.TimeoutError:
                    if art_task.done():
                        break
            await art_task  # re-raise if generate_images itself raised

        # step 3 — the balance loop (genetic algorithm + LLM)
        yield AgentEvent("status", "Balancing the deck.")
        targets = BalanceTargets()
        async for rnd in self._balance.run(deck, targets=targets):
            verdict = "balanced" if rnd.decision.converged else "needs work"
            yield AgentEvent(
                "balance",
                f"Round {rnd.round_number}: {verdict}. "
                f"{rnd.decision.summary}",
                data={
                    "round": rnd.round_number,
                    "metrics": rnd.metrics.model_dump(),
                    "decision": rnd.decision.model_dump(),
                },
            )

        # done
        yield AgentEvent(
            "done",
            f"Deck '{deck.name}' is ready.",
            data={"deck": deck.model_dump()},
        )
