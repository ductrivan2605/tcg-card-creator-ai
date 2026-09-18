"""Conversational agent — the chat-driven orchestrator.

The orchestration tab in the UI is a conversation: the user sends a
message, the agent replies, the user asks a follow-up. This agent
backs that conversation. It is stateful — it remembers the deck it has
built so far (carried in the conversation's context) so a follow-up
like "make the legendary cheaper" has something to act on.

A reply is a sequence of turns, each matching the UI's turn vocabulary:
  user        a message from the user
  agent       a text reply from the agent
  thinking    the agent's reasoning, shown collapsed
  tools       a group of tool calls the agent made
  panel       opens an artifact panel in the right rail
  deliverable a downloadable result

The agent emits these turns as a stream so the UI renders them live.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, AsyncIterator

from app.agent.tools import generate_cards, generate_rules, new_deck
from app.balance.engine import BalanceEngine
from app.core.models import BalanceTargets, Card, Deck
from app.llm.client import LLMClient


@dataclass
class Turn:
    """One turn in the conversation, in the UI's turn shape."""
    kind: str
    data: dict[str, Any] = field(default_factory=dict)

    def as_event(self) -> dict:
        return {"kind": self.kind, **self.data}


# the intents a user message can have, once the agent has a deck
_INTENT_PROMPT = """\
You route a user's message in a trading-card-game deck builder.
The user {deck_state}.

Classify the message into exactly one intent:
- "build"   : the user wants a brand-new deck created
- "adjust"  : the user wants changes to the existing deck's cards
- "rebalance": the user wants the existing deck re-balanced
- "question": the user is asking a question, no deck change needed

Reply with raw JSON: {{"intent": "...", "theme": "...or null"}}
The "theme" is only set for a "build" intent.

User message: {message}
"""


class ConversationalAgent:
    """Drives a multi-turn deck-building conversation."""

    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm
        self._balance = BalanceEngine(llm)

    async def _classify(self, message: str, has_deck: bool) -> dict:
        """Decide what the user's message is asking for."""
        state = (
            "already has a deck" if has_deck
            else "does not have a deck yet"
        )
        prompt = _INTENT_PROMPT.format(deck_state=state, message=message)
        result = await self._llm.generate_json(prompt)
        if not has_deck:
            result["intent"] = "build"
        return result

    async def respond(
        self, message: str, context: dict
    ) -> AsyncIterator[Turn]:
        """Handle one user message; yield the agent's reply turns.

        `context` is the conversation's memory. It is read here and the
        caller persists whatever this method puts back into it via the
        final 'context' turn.
        """
        deck = Deck.model_validate(context["deck"]) if context.get("deck") else None
        routing = await self._classify(message, deck is not None)
        intent = routing["intent"]

        if intent == "build":
            async for turn in self._build(routing.get("theme") or message):
                yield turn

        elif intent == "adjust":
            async for turn in self._adjust(message, deck):
                yield turn

        elif intent == "rebalance":
            async for turn in self._rebalance(deck):
                yield turn

        else:  # question
            async for turn in self._answer(message, deck):
                yield turn

    # ── intent handlers ──────────────────────────────────────

    async def _build(self, theme: str) -> AsyncIterator[Turn]:
        """Create a new deck from a theme."""
        yield Turn("thinking", {
            "text": f"The user wants a deck themed around {theme}. "
                    f"I will design the rules, generate cards, then "
                    f"run the balance loop."
        })

        rules = await generate_rules(self._llm, theme)
        deck = new_deck(theme, rules)
        deck.cards = await generate_cards(self._llm, theme, rules, 20)

        yield Turn("tools", {
            "title": "Generated rules and cards",
            "tools": [
                {"name": "generate_rules", "result": rules.model_dump()},
                {"name": "generate_cards",
                 "result": {"count": len(deck.cards)}},
            ],
        })
        yield Turn("panel", {"panelType": "cards",
                             "title": f"{theme} — {len(deck.cards)} cards"})

        balance_turns = self._run_balance(deck)
        async for turn in balance_turns:
            yield turn

        yield Turn("agent", {
            "text": f"Your {theme} deck is ready — {len(deck.cards)} "
                    f"cards, balanced. Ask me to adjust any card, "
                    f"rebalance, or change the theme."
        })
        yield Turn("context", {"deck": deck.model_dump()})

    async def _adjust(
        self, message: str, deck: Deck | None
    ) -> AsyncIterator[Turn]:
        """Apply user-requested changes to the existing deck's cards."""
        if deck is None:
            yield Turn("agent", {"text": "There's no deck yet. Tell me a "
                                         "theme and I'll build one."})
            return

        cards = [
            {"id": c.id, "name": c.content.name, "rarity": c.rarity,
             "cost": c.gameplay.cost, "attack": c.gameplay.attack,
             "defense": c.gameplay.defense}
            for c in deck.cards
        ]
        prompt = (
            f"The user wants to adjust their deck. Their request:\n"
            f"{message}\n\nThe deck's cards:\n{cards}\n\n"
            f"Decide the specific card changes. Reply with raw JSON: "
            f'{{"summary": str, "changes": [{{"card_id": str, '
            f'"stat": "cost|attack|defense", "value": int}}]}}'
        )
        result = await self._llm.generate_json(prompt)

        by_id = {c.id: c for c in deck.cards}
        for change in result.get("changes", []):
            card = by_id.get(change["card_id"])
            if card is not None:
                setattr(card.gameplay, change["stat"],
                        max(0, int(change["value"])))

        yield Turn("tools", {
            "title": "Applied card changes",
            "tools": [{"name": "edit_cards",
                       "result": {"changes": result.get("changes", [])}}],
        })
        yield Turn("panel", {"panelType": "cards", "title": "Updated deck"})
        yield Turn("agent", {"text": result.get("summary", "Done.")})
        yield Turn("context", {"deck": deck.model_dump()})

    async def _rebalance(self, deck: Deck | None) -> AsyncIterator[Turn]:
        """Re-run the balance loop on the existing deck."""
        if deck is None:
            yield Turn("agent", {"text": "There's no deck to rebalance "
                                         "yet."})
            return
        async for turn in self._run_balance(deck):
            yield turn
        yield Turn("agent", {"text": "Rebalanced. The metrics are back "
                                     "inside the target bands."})
        yield Turn("context", {"deck": deck.model_dump()})

    async def _answer(
        self, message: str, deck: Deck | None
    ) -> AsyncIterator[Turn]:
        """Answer a question without changing the deck."""
        context = ""
        if deck is not None:
            context = (
                f"\n\nThe user's current deck '{deck.name}' has "
                f"{len(deck.cards)} cards."
            )
        reply = await self._llm.generate_text(
            f"You are a trading-card-game design assistant. Answer the "
            f"user's question concisely.{context}\n\nQuestion: {message}"
        )
        yield Turn("agent", {"text": reply})

    # ── shared ───────────────────────────────────────────────

    async def _run_balance(self, deck: Deck) -> AsyncIterator[Turn]:
        """Run the GA + LLM balance loop, emitting a turn per round."""
        targets = BalanceTargets()
        async for rnd in self._balance.run(deck, targets=targets):
            yield Turn("tools", {
                "title": f"Balance round {rnd.round_number}",
                "tools": [
                    {"name": "genetic_algorithm",
                     "result": rnd.metrics.model_dump()},
                    {"name": "evaluate_balance",
                     "result": rnd.decision.model_dump()},
                ],
            })
        yield Turn("panel", {"panelType": "balance",
                             "title": "Balance result"})
