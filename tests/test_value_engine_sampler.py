from app.value_engine.sampler import sample_attributes


def make_card(name, rarity="common", type_="Creature"):
    return {"name": name, "rarity": rarity, "type": type_}


def test_sampler_deterministic_with_seed():
    cards = [make_card("A"), make_card("B", rarity="rare")]
    out1 = sample_attributes(cards, {"rarity_bounds": {}}, seed=123)
    out2 = sample_attributes(cards, {"rarity_bounds": {}}, seed=123)
    assert out1 == out2


def test_sampler_values_within_bounds():
    # Provide explicit bounds to check sampling range
    rules = {
        "rarity_bounds": {
            "common": {"cost": [1, 2], "attack": [1, 3], "defense": [1, 3]},
            "rare": {"cost": [2, 3], "attack": [3, 5], "defense": [3, 5]},
        }
    }
    cards = [make_card("C", "common"), make_card("D", "rare")]
    out = sample_attributes(cards, rules, seed=7)
    # common
    c0 = out[0]["attributes"]
    assert 1 <= c0["cost"] <= 2
    assert 1 <= c0["attack"] <= 3
    assert 1 <= c0["defense"] <= 3
    # rare
    c1 = out[1]["attributes"]
    assert 2 <= c1["cost"] <= 3
    assert 3 <= c1["attack"] <= 5
    assert 3 <= c1["defense"] <= 5
