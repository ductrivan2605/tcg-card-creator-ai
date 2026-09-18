"""Generate rules (LLM-backed) for the Value Engine."""
from __future__ import annotations

from typing import Any

from app.llm.client import LLMClient


async def generate_rules(llm: LLMClient, cards: list[dict]) -> dict:
    """Ask the LLM to produce a rules dict from a batch of cards.

    The function returns the raw dict the model produced. The caller
    should pass the output to `normalise_rules` before sampling.
    """
    # Build a short JSON-friendly description of the cards to send to the model
    sample = []
    for c in cards[:8]:
        sample.append({
            "name": c.get("name"),
            "type": c.get("type"),
            "rarity": c.get("rarity"),
            "tags": c.get("tags", []),
        })

    prompt = (
        "You receive a sample of cards and must return a JSON rules object\n"
        "that guides numeric attribute assignment for the full deck.\n"
        "Input sample (first up to 8 cards):\n"
        f"{sample}\n\n"
        "Return ONLY a JSON object with keys such as:\n"
        "  - cost_to_power_ratio: {common: float, rare: float, epic: float, legendary: float}\n"
        "  - rarity_bounds: {common: {attack: [min,max], defense: [min,max], cost: [min,max]}, ...}\n"
        "  - ability_type_modifier: {AttackBoost: 1, HealBoost: 0, ...}  (optional)\n"
        "  - ability_values: {Fly: 1.5, Lifesteal: 2.0, Draw: 2.5, ...}  (optional)\n"
        "  - ability_constraints: {Fly: {allowed_types: [Creature], min_rarity: rare, ...}}  (optional)\n"
        "  - synergy_bonuses: {element:water: 0.5, faction:deep: 1.0, ...}  (optional)\n"
        "Do not include any markdown or explanation. Keep keys simple and numeric where possible."
    )

    raw = await llm.generate_json(prompt)
    return raw
