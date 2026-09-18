from app.value_engine.power_budget import score_card_power


def test_score_card_power_uses_ability_and_synergy():
    card = {
        "rarity": "rare",
        "cost": 5,
        "attack": 4,
        "defense": 3,
        "health": 3,
        "type": "Creature",
        "element": "water",
        "faction": "deep",
        "ability": "Fly: attack over blockers.",
        "tags": ["Fly"],
    }
    rules = {
        "ability_values": {"Fly": 1.5},
        "synergy_bonuses": {"element:water": 0.5, "faction:deep": 1.0},
        "cost_to_power_ratio": {"rare": 2.5},
    }

    profile = score_card_power(card, rules)

    assert profile["stats_power"] == 8.8
    assert profile["ability_power"] == 1.5
    assert profile["synergy_bonus"] == 1.5
    assert profile["expected_power"] == 12.5
    assert profile["total_power"] == 11.8
    assert profile["budget_delta"] == -0.7
    assert profile["is_legal"] is True


def test_score_card_power_flags_illegal_type_for_ability_constraint():
    card = {
        "rarity": "common",
        "cost": 2,
        "attack": 2,
        "defense": 1,
        "health": 1,
        "type": "Spell",
        "ability": "Fly: attack over blockers.",
    }
    rules = {
        "ability_constraints": {
            "Fly": {"allowed_types": ["Creature"], "min_rarity": "rare"}
        }
    }

    profile = score_card_power(card, rules)

    assert profile["is_legal"] is False
    assert any("rarity below rare" in item for item in profile["constraint_violations"])
    assert any("not in allowed_types" in item for item in profile["constraint_violations"])


def test_score_card_power_reads_structured_ability_rules_on_card():
    card = {
        "rarity": "rare",
        "cost": 3,
        "attack": 3,
        "defense": 2,
        "health": 2,
        "type": "Creature",
        "content": {
            "type_line": "Creature",
            "ability_rules": [
                {
                    "keyword": "Fly",
                    "description": "May attack over grounded units.",
                    "allowed_types": ["Creature"],
                    "blocked_types": ["Terrain"],
                    "min_rarity": "rare",
                }
            ],
        },
        "ability": "Fly: attack over blockers.",
    }

    profile = score_card_power(card, {})

    assert profile["is_legal"] is True
    assert profile["constraint_violations"] == []