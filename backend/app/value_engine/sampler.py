"""Numerical attribute sampler for the Value Engine."""
from __future__ import annotations

import numpy as np
from typing import List, Dict

from app.value_engine.conflict_detector import HARD_BOUNDS
from app.value_engine.power_budget import score_card_power


def _rarity_for_card(card: dict) -> str:
    return card.get("rarity", "common")


def sample_attributes(cards: List[dict], rules: Dict, seed: int | None = None) -> List[dict]:
    """Sample numeric attributes for each card using the provided rules.

    Returns a new list of card dicts with an added `attributes` key:
      {attack, defense, cost, ability_magnitude}
    """
    if seed is not None:
        np.random.seed(seed)

    rb = rules.get("rarity_bounds") or HARD_BOUNDS
    out: List[dict] = []
    for c in cards:
        r = _rarity_for_card(c)
        bounds = rb.get(r, rb.get("common"))
        cost_min, cost_max = bounds.get("cost", [1, 2])
        atk_min, atk_max = bounds.get("attack", [1, 4])
        def_min, def_max = bounds.get("defense", [1, 4])

        cost = int(np.random.randint(cost_min, cost_max + 1))
        attack = int(np.random.randint(atk_min, atk_max + 1))
        defense = int(np.random.randint(def_min, def_max + 1))

        # health mirrors defense for Creatures by convention
        health = defense if c.get("type", "Creature") == "Creature" else int(c.get("health", 0) or 0)

        # ability magnitude cap: ≤ cost * 3
        ability_magnitude = int(np.random.randint(1, cost * 3 + 1))
        ability_magnitude = min(ability_magnitude, cost * 3)

        new = dict(c)
        new["attributes"] = {
            "cost": cost,
            "attack": attack,
            "defense": defense,
            "health": health,
            "ability_magnitude": ability_magnitude,
            "power_profile": score_card_power(c, rules),
        }
        out.append(new)
    return out
