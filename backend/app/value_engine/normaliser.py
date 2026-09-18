"""Normalise raw LLM rules into a per-rarity structure the sampler can use."""
from __future__ import annotations

from typing import Dict, Any

DEFAULT_BOUNDS = {
    "common": {"cost": [1, 2], "attack": [1, 4], "defense": [1, 4]},
    "rare": {"cost": [2, 3], "attack": [3, 6], "defense": [3, 6]},
    "epic": {"cost": [3, 5], "attack": [5, 8], "defense": [5, 8]},
    "legendary": {"cost": [5, 7], "attack": [7, 10], "defense": [7, 10]},
}

DEFAULT_ABILITY_VALUES = {
    "Fly": 1.5,
    "Lifesteal": 2.0,
    "Draw": 2.5,
    "AreaDamage": 3.0,
    "Area Damage": 3.0,
}

DEFAULT_SYNERGY_BONUSES = {
    "element:water": 0.5,
    "element:void": 0.5,
    "faction:deep": 1.0,
    "type:Creature": 0.5,
}


def normalise_rules(raw: dict) -> dict:
    """Convert a raw LLM rule dict into nested per-rarity bounds.

    The returned shape:
    {
      "rarity_bounds": {"common": {"cost": [min,max], ...}, ...},
      "ability_type_modifier": {"SomeKeyword": 1, ...},
      "cost_to_power_ratio": {"common": 2.0, ...}
    }
    """
    out: Dict[str, Any] = {}

    # rarity_bounds: prefer explicit key, otherwise attempt to extract
    if "rarity_bounds" in raw:
        out["rarity_bounds"] = raw["rarity_bounds"]
    else:
        # look for keys like attack_bounds_common or flat map
        found = False
        rb = {}
        for r in ("common", "rare", "epic", "legendary"):
            if r in raw.get("rarity_bounds", {}):
                found = True
                rb[r] = raw["rarity_bounds"][r]
        if not found:
            rb = DEFAULT_BOUNDS.copy()
        out["rarity_bounds"] = rb

    # ability modifiers
    out["ability_type_modifier"] = raw.get("ability_type_modifier", {})

    # explicit power budget tables and legality constraints
    out["ability_values"] = raw.get("ability_values", DEFAULT_ABILITY_VALUES.copy())
    out["ability_constraints"] = raw.get("ability_constraints", {})
    out["synergy_bonuses"] = raw.get("synergy_bonuses", DEFAULT_SYNERGY_BONUSES.copy())

    # cost_to_power_ratio
    out["cost_to_power_ratio"] = raw.get("cost_to_power_ratio", {"common": 2.0, "rare": 2.5, "epic": 2.5, "legendary": 2.0})

    return out
