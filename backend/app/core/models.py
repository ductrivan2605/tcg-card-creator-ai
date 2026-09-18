"""Domain models for the TCG Balance Engine.

These are the data structures the whole backend works with. They match
the schema the frontend loads (see card-io.js / data.js / templates.js).
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class Gameplay(BaseModel):
    cost: int = Field(ge=0, le=10)
    attack: int = Field(ge=0, le=12)
    defense: int = Field(ge=0, le=12)
    health: int = Field(ge=0, le=20)
    element: str
    faction: str


class Content(BaseModel):
    name: str
    ability: str = ""
    flavor: str = ""
    type_line: str = "Creature"
    artwork: str = ""
    ability_rules: list["AbilityRule"] = Field(default_factory=list)


class Card(BaseModel):
    """One trading card."""
    id: str
    rarity: str = "common"
    tags: list[str] = Field(default_factory=list)
    gameplay: Gameplay
    content: Content

    def is_spell(self) -> bool:
        return getattr(self.content, "type_line", "").strip().lower() == "spell"

    def power(self) -> int:
        if self.is_spell():
            rarity_mult = {"common": 1.0, "rare": 1.15, "epic": 1.3, "legendary": 1.5}.get(
                str(self.rarity).strip().lower(), 1.0
            )
            # Spells convert mana into immediate impact: ~2.4x stats per mana
            effective = max(2.0, self.gameplay.cost * 2.4 * rarity_mult)
            return int(round(effective))
        return self.gameplay.attack + self.gameplay.defense

    def cost_power_ratio(self) -> float:
        return self.power() / max(1, self.gameplay.cost)


class StatRange(BaseModel):
    min: int
    max: int


class AbilityConstraint(BaseModel):
    allowed_types: list[str] = Field(default_factory=list)
    blocked_types: list[str] = Field(default_factory=list)
    min_rarity: str | None = None
    max_rarity: str | None = None


class AbilityRule(BaseModel):
    keyword: str
    description: str = ""
    allowed_types: list[str] = Field(default_factory=list)
    blocked_types: list[str] = Field(default_factory=list)
    min_rarity: str | None = None
    max_rarity: str | None = None


class Rules(BaseModel):
    """The rule schema for a deck — produced from a theme."""
    elements: list[str]
    factions: list[str]
    keywords: list[str]
    card_types: list[str] = Field(default_factory=lambda: ["Creature", "Spell"])
    stat_ranges: dict[str, StatRange] = Field(default_factory=dict)
    ability_values: dict[str, float] = Field(default_factory=dict)
    ability_constraints: dict[str, AbilityConstraint] = Field(default_factory=dict)
    synergy_bonuses: dict[str, float] = Field(default_factory=dict)


class Deck(BaseModel):
    """A full deck: identity, rules, and the cards."""
    id: str
    name: str
    theme: str
    rules: Rules
    cards: list[Card] = Field(default_factory=list)


class BalanceMetrics(BaseModel):
    """The numeric report the genetic algorithm produces for a deck."""
    win_rate_spread: float      # gap between strongest and weakest win rate
    mean_win_rate: float
    avg_game_length: float      # turns
    dominance: float            # usage share of the single most-used card
    generation: int             # which GA generation produced this

    def is_balanced(self, targets: "BalanceTargets") -> bool:
        return (
            self.win_rate_spread <= targets.max_win_rate_spread
            and self.dominance <= targets.max_dominance
            and abs(self.avg_game_length - targets.target_game_length)
            <= targets.game_length_tolerance
        )


class BalanceTargets(BaseModel):
    """The bands a deck must fall within to count as balanced."""
    max_win_rate_spread: float = 0.15
    max_dominance: float = 0.45
    target_game_length: float = 8.0
    game_length_tolerance: float = 1.5


class CardAdjustment(BaseModel):
    """One balancing change the LLM decides to make to one card."""
    card_id: str
    stat: str                   # "cost" | "attack" | "defense"
    delta: int                  # e.g. -1 or +1
    reason: str                 # the LLM's justification


class BalanceDecision(BaseModel):
    """The LLM's verdict for one round of the balance loop."""
    converged: bool
    summary: str
    adjustments: list[CardAdjustment] = Field(default_factory=list)
