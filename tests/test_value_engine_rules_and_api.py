import asyncio

from app.value_engine.conflict_detector import check_rules


def test_conflict_detector_detects_out_of_bounds():
    rules = {
        "rarity_bounds": {
            "common": {"attack": [0, 10], "defense": [1, 4], "cost": [1, 2]},
            "rare": {"attack": [3, 6], "defense": [3, 6], "cost": [2, 3]},
            "epic": {"attack": [5, 8], "defense": [5, 8], "cost": [3, 5]},
            "legendary": {"attack": [7, 10], "defense": [7, 10], "cost": [5, 7]},
        }
    }
    ok, conflicts = check_rules(rules)
    assert not ok
    assert any("common.attack" in c or "common.attack" in c.replace(".", "") or "common" in c for c in conflicts)


def test_assign_values_endpoint_function(monkeypatch):
    # Import inside test to ensure monkeypatching applies to module namespace
    from app.api import server

    # stub out ve_generate_rules to avoid LLM call
    async def fake_generate_rules(llm, cards):
        return {"rarity_bounds": {"common": {"cost": [1, 2], "attack": [1, 3], "defense": [1, 3]}}}

    monkeypatch.setattr(server, "ve_generate_rules", fake_generate_rules)

    # Replace LLMClient to avoid key-check in constructor
    class DummyLLM:
        pass

    monkeypatch.setattr(server, "LLMClient", DummyLLM)

    # stub repo.save_card_values so it doesn't hit the DB
    async def fake_save(session, values, *, deck_id=None):
        return None

    monkeypatch.setattr(server.repo, "save_card_values", fake_save)

    body = server.AssignValuesIn(cards=[{"id": "c1", "name": "One", "rarity": "common", "type": "Creature"}])
    result = asyncio.run(server.assign_values(body, session=None))
    assert "rules" in result
    assert "card_values" in result
    assert isinstance(result["card_values"], list)
