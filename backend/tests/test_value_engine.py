import unittest

from app.schemas.card import CardBase
from app.services.values.service import CardValueEngine, RARITY_RULES


class ValueEngineTests(unittest.TestCase):
    def test_generated_values_stay_in_rarity_bounds(self):
        cards = [
            CardBase(
                card_id='1',
                name='A',
                flavour_text='f',
                ability_name='ab',
                ability_description='d',
                ability_type='passive',
                rarity='legendary',
                theme_tags=['x'],
            )
        ]
        engine = CardValueEngine(seed=1)

        valued = engine.assign_values(cards)[0]
        rules = RARITY_RULES['legendary']

        self.assertTrue(rules.attack[0] <= valued.attack <= rules.attack[1])
        self.assertTrue(rules.defence[0] <= valued.defence <= rules.defence[1])
        self.assertTrue(rules.cost[0] <= valued.cost <= rules.cost[1])


if __name__ == '__main__':
    unittest.main()
