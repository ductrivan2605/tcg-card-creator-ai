"""Tests for 60-card deck generation, spell valuation, and multi-deck meta balance engine."""
import pytest
from app.core.models import Card, Content, Gameplay, Rules, StatRange
from app.balance.meta_decks import (
    get_abyssal_depths_60,
    get_solar_pantheon_60,
    get_primeval_dominion_60,
    get_meta_archetypes,
)
from app.balance.genetic_algorithm import measure, optimize


def test_spell_card_power_and_ratio():
    """Verify spell cards receive quantified power and healthy cost-power ratio."""
    spell = Card(
        id="sp1",
        rarity="rare",
        tags=["Burn"],
        gameplay=Gameplay(cost=3, attack=0, defense=0, health=0, element="fire", faction="olympian"),
        content=Content(name="Fireball", type_line="Spell", ability="Deal 4 damage."),
    )
    assert spell.is_spell() is True
    # Rare 3-cost spell: 3 * 2.4 * 1.15 = ~8.28 -> round to 8
    assert spell.power() > 0
    assert spell.cost_power_ratio() >= 2.0


def test_60_card_prebaked_decks_structure():
    """Verify the 3 prebaked decks contain 60 cards with multiple elements and spells."""
    decks = [
        get_abyssal_depths_60(),
        get_solar_pantheon_60(),
        get_primeval_dominion_60(),
    ]

    for d in decks:
        assert len(d.cards) == 60, f"{d.name} should have 60 cards, found {len(d.cards)}"
        
        # Check elements
        elements = {c.gameplay.element for c in d.cards}
        assert len(elements) >= 2, f"{d.name} should have multiple elements, found {elements}"
        
        # Check card type presence (40 creatures, 20 spells, 0 terrains)
        spells = [c for c in d.cards if c.is_spell()]
        creatures = [c for c in d.cards if not c.is_spell() and c.content.type_line == "Creature"]
        terrains = [c for c in d.cards if c.content.type_line == "Terrain"]
        
        assert len(spells) == 20, f"{d.name} should have 20 spells, found {len(spells)}"
        assert len(creatures) == 40, f"{d.name} should have 40 creatures, found {len(creatures)}"
        assert len(terrains) == 0, f"{d.name} should have no terrains, found {len(terrains)}"


def test_multi_deck_meta_balance_simulation():
    """Verify measure() tests against meta archetypes (aggro, midrange, control)."""
    deck = get_abyssal_depths_60()
    meta_pool = get_meta_archetypes()
    
    assert "aggro" in meta_pool
    assert "midrange" in meta_pool
    assert "control" in meta_pool
    
    metrics = measure(deck.cards, generation=1, meta_pool=meta_pool, seed=42)
    
    assert 0.0 <= metrics.mean_win_rate <= 1.0
    assert 0.0 <= metrics.win_rate_spread <= 1.0
    assert metrics.avg_game_length > 0.0
    assert 0.0 <= metrics.dominance <= 1.0
