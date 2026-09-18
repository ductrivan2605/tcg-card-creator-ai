"""Ability power budgeting helpers for the Value Engine."""
from __future__ import annotations

from typing import Any, Mapping

DEFAULT_STAT_WEIGHTS = {
    "attack": 1.0,
    "defense": 0.8,
    "health": 0.8,
}

RARITY_ORDER = ["common", "rare", "epic", "legendary"]


def _canonical(text: str) -> str:
    return " ".join(str(text).replace("**", "").replace("_", " ").replace("-", " ").split()).strip()


def _rarity_index(rarity: str) -> int:
    rarity = str(rarity).strip().lower()
    try:
        return RARITY_ORDER.index(rarity)
    except ValueError:
        return 0


def _first_ability_name(card: Mapping[str, Any]) -> str:
    ability = str(card.get("ability", "") or "")
    if ":" in ability:
        return _canonical(ability.split(":", 1)[0])
    return _canonical(ability)


def _card_ability_rules(card: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    content = card.get("content", {}) if isinstance(card.get("content"), Mapping) else {}
    rules = content.get("ability_rules") or card.get("ability_rules") or []
    return [rule for rule in rules if isinstance(rule, Mapping)]


def _ability_names(card: Mapping[str, Any]) -> list[str]:
    names: list[str] = []
    first = _first_ability_name(card)
    if first:
        names.append(first)
    for rule in _card_ability_rules(card):
        keyword = _canonical(rule.get("keyword") or rule.get("name") or "")
        if keyword:
            names.append(keyword)
    for tag in card.get("tags", []) or []:
        value = _canonical(tag)
        if value:
            names.append(value)
    seen: set[str] = set()
    deduped: list[str] = []
    for name in names:
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(name)
    return deduped


def _lookup(table: Mapping[str, Any], key: str) -> float:
    direct = table.get(key)
    if direct is not None:
        return float(direct)
    lower_key = key.lower()
    for candidate, value in table.items():
        if str(candidate).lower() == lower_key:
            return float(value)
    return 0.0


def ability_power(card: Mapping[str, Any], ability_values: Mapping[str, Any] | None = None) -> float:
    """Score the named abilities on a card using a power-budget table."""
    table = dict(ability_values or {})
    total = 0.0
    for name in _ability_names(card):
        total += _lookup(table, name)
    return round(total, 2)


def synergy_bonus(card: Mapping[str, Any], synergy_bonuses: Mapping[str, Any] | None = None) -> float:
    """Score context-sensitive bonuses such as element or faction synergy."""
    bonuses = synergy_bonuses or {}
    if not bonuses:
        return 0.0

    element = _canonical(card.get("element") or card.get("gameplay", {}).get("element") or "")
    faction = _canonical(card.get("faction") or card.get("gameplay", {}).get("faction") or "")
    type_line = _canonical(card.get("type") or card.get("type_line") or card.get("content", {}).get("type_line") or "")
    rarity = _canonical(card.get("rarity") or "")
    names = {name.lower() for name in _ability_names(card)}

    total = 0.0
    for raw_key, raw_value in bonuses.items():
        key = _canonical(raw_key)
        value = float(raw_value)
        if ":" in key:
            prefix, target = key.split(":", 1)
            prefix = prefix.lower()
            target = target.lower()
            if prefix == "element" and element.lower() == target:
                total += value
            elif prefix == "faction" and faction.lower() == target:
                total += value
            elif prefix == "type" and type_line.lower() == target:
                total += value
            elif prefix == "rarity" and rarity.lower() == target:
                total += value
            elif prefix == "keyword" and target in names:
                total += value
        elif key.lower() in names or key.lower() in {element.lower(), faction.lower(), type_line.lower(), rarity.lower()}:
            total += value

    return round(total, 2)


def rarity_power_budget(cost: int, rarity: str, cost_to_power_ratio: Mapping[str, Any] | None = None) -> float:
    ratios = cost_to_power_ratio or {"common": 2.0, "rare": 2.5, "epic": 2.5, "legendary": 2.0}
    rarity_key = str(rarity).strip().lower()
    ratio = float(ratios.get(rarity_key, ratios.get("common", 2.0)))
    return round(max(0, int(cost)) * ratio, 2)


def ability_legality(card: Mapping[str, Any], ability_constraints: Mapping[str, Any] | None = None) -> tuple[bool, list[str]]:
    """Check whether a card violates any explicit ability constraints."""
    constraints = ability_constraints or {}

    rarity = _canonical(card.get("rarity") or "").lower()
    type_line = _canonical(card.get("type") or card.get("type_line") or card.get("content", {}).get("type_line") or "")
    names = _ability_names(card)
    violations: list[str] = []

    for rule in _card_ability_rules(card):
        keyword = _canonical(rule.get("keyword") or rule.get("name") or "")
        if not keyword:
            continue
        min_rarity = rule.get("min_rarity")
        max_rarity = rule.get("max_rarity")
        allowed_types = {str(item).strip().lower() for item in rule.get("allowed_types", []) or []}
        blocked_types = {str(item).strip().lower() for item in rule.get("blocked_types", []) or []}

        if min_rarity and _rarity_index(rarity) < _rarity_index(str(min_rarity)):
            violations.append(f"{keyword}: rarity below {min_rarity}")
        if max_rarity and _rarity_index(rarity) > _rarity_index(str(max_rarity)):
            violations.append(f"{keyword}: rarity above {max_rarity}")
        if allowed_types and type_line.lower() not in allowed_types:
            violations.append(f"{keyword}: type {type_line} not in allowed_types")
        if blocked_types and type_line.lower() in blocked_types:
            violations.append(f"{keyword}: type {type_line} is blocked")

    for ability_name in names:
        constraint = constraints.get(ability_name) or constraints.get(ability_name.lower())
        if not isinstance(constraint, Mapping):
            continue

        min_rarity = constraint.get("min_rarity")
        max_rarity = constraint.get("max_rarity")
        allowed_types = {str(item).strip().lower() for item in constraint.get("allowed_types", []) or []}
        blocked_types = {str(item).strip().lower() for item in constraint.get("blocked_types", []) or []}

        if min_rarity and _rarity_index(rarity) < _rarity_index(str(min_rarity)):
            violations.append(f"{ability_name}: rarity below {min_rarity}")
        if max_rarity and _rarity_index(rarity) > _rarity_index(str(max_rarity)):
            violations.append(f"{ability_name}: rarity above {max_rarity}")
        if allowed_types and type_line.lower() not in allowed_types:
            violations.append(f"{ability_name}: type {type_line} not in allowed_types")
        if blocked_types and type_line.lower() in blocked_types:
            violations.append(f"{ability_name}: type {type_line} is blocked")

    return len(violations) == 0, violations


def score_card_power(card: Mapping[str, Any], rules: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """Compute the power budget profile for a card."""
    rules = rules or {}
    gameplay = card.get("gameplay", {}) if isinstance(card.get("gameplay"), Mapping) else {}
    attack = int(card.get("attack", gameplay.get("attack", 0)) or 0)
    defense = int(card.get("defense", gameplay.get("defense", 0)) or 0)
    health = int(card.get("health", gameplay.get("health", defense)) or defense)
    cost = int(card.get("cost", gameplay.get("cost", 0)) or 0)

    stats_power = round(
        attack * DEFAULT_STAT_WEIGHTS["attack"]
        + defense * DEFAULT_STAT_WEIGHTS["defense"]
        + health * DEFAULT_STAT_WEIGHTS["health"],
        2,
    )
    ability_points = ability_power(card, rules.get("ability_values"))
    synergy_points = synergy_bonus(card, rules.get("synergy_bonuses"))
    total_power = round(stats_power + ability_points + synergy_points, 2)
    budget = rarity_power_budget(cost, card.get("rarity", "common"), rules.get("cost_to_power_ratio"))
    legal, violations = ability_legality(card, rules.get("ability_constraints"))

    return {
        "stats_power": stats_power,
        "ability_power": ability_points,
        "synergy_bonus": synergy_points,
        "total_power": total_power,
        "expected_power": budget,
        "budget_delta": round(total_power - budget, 2),
        "is_legal": legal,
        "constraint_violations": violations,
    }