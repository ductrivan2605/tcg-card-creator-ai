from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.schemas.card import CardBase, ValuedCard


@dataclass(frozen=True)
class RangeRule:
    attack: tuple[int, int]
    defence: tuple[int, int]
    cost: tuple[int, int]
    ability_magnitude: tuple[float, float]


RARITY_RULES: dict[str, RangeRule] = {
    'common': RangeRule((1, 4), (1, 4), (1, 2), (0.2, 0.6)),
    'uncommon': RangeRule((3, 6), (3, 6), (2, 3), (0.4, 0.8)),
    'rare': RangeRule((5, 8), (5, 8), (3, 5), (0.7, 1.2)),
    'legendary': RangeRule((7, 10), (7, 10), (5, 7), (1.1, 1.8)),
}

SPONSOR_APPROVED_FALLBACK = RARITY_RULES


class CardValueEngine:
    def __init__(self, seed: int = 42):
        self.seed = seed

    def assign_values(self, cards: list[CardBase]) -> list[ValuedCard]:
        rng = np.random.default_rng(self.seed)
        valued_cards: list[ValuedCard] = []

        for card in cards:
            rules = self._resolve_rules(card.rarity)
            attack = self._sample_int(rng, rules.attack)
            defence = self._sample_int(rng, rules.defence)
            cost = self._sample_int(rng, rules.cost)
            ability_magnitude = round(float(rng.uniform(*rules.ability_magnitude)), 2)
            valued_cards.append(
                ValuedCard(
                    **card.model_dump(),
                    attack=attack,
                    defence=defence,
                    cost=cost,
                    ability_magnitude=ability_magnitude,
                )
            )

        return valued_cards

    def _resolve_rules(self, rarity: str) -> RangeRule:
        rules = RARITY_RULES.get(rarity)
        if not rules or not self._valid_rule(rules):
            return SPONSOR_APPROVED_FALLBACK[rarity]
        return rules

    @staticmethod
    def _valid_rule(rule: RangeRule) -> bool:
        return all(low <= high for low, high in [rule.attack, rule.defence, rule.cost, rule.ability_magnitude])

    @staticmethod
    def _sample_int(rng: np.random.Generator, bounds: tuple[int, int]) -> int:
        low, high = bounds
        return int(rng.integers(low, high + 1))
