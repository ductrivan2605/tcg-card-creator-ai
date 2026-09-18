"""Simple conflict detection for LLM-generated rules."""
from __future__ import annotations

from typing import Tuple, List

# Hard bounds per rarity (from project spec)
HARD_BOUNDS = {
    "common": {"attack": [1, 4], "defense": [1, 4], "cost": [1, 2]},
    "rare": {"attack": [3, 6], "defense": [3, 6], "cost": [2, 3]},
    "epic": {"attack": [5, 8], "defense": [5, 8], "cost": [3, 5]},
    "legendary": {"attack": [7, 10], "defense": [7, 10], "cost": [5, 7]},
}


def _check_range(name: str, low: int, high: int, hard_low: int, hard_high: int) -> bool:
    return low >= hard_low and high <= hard_high


def check_rules(rules: dict) -> Tuple[bool, List[str]]:
    """Return (ok, conflicts). Conflicts are human-readable strings."""
    conflicts: List[str] = []
    rb = rules.get("rarity_bounds", {})
    for rarity, hard in HARD_BOUNDS.items():
        r = rb.get(rarity)
        if r is None:
            conflicts.append(f"Missing bounds for rarity '{rarity}'")
            continue
        for stat in ("attack", "defense", "cost"):
            vals = r.get(stat)
            if not vals or len(vals) < 2:
                conflicts.append(f"Rarity {rarity} missing {stat} bounds")
                continue
            low, high = int(vals[0]), int(vals[1])
            hard_low, hard_high = hard[stat]
            if not _check_range(stat, low, high, hard_low, hard_high):
                conflicts.append(
                    f"{rarity}.{stat} range {low}-{high} exceeds allowed {hard_low}-{hard_high}"
                )
    return (len(conflicts) == 0, conflicts)
