import unittest

from app.services.generation.service import CardGenerationService


class FailingProvider:
    name = 'failing'

    def __init__(self):
        self.calls = 0

    async def generate(self, prompt: str):
        self.calls += 1
        return {'invalid': []}


class SuccessProvider:
    name = 'success'

    async def generate(self, prompt: str):
        cards = []
        for idx in range(10):
            cards.append(
                {
                    'card_id': str(idx),
                    'name': f'Card {idx}',
                    'flavour_text': 'text',
                    'ability_name': 'ability',
                    'ability_description': 'desc',
                    'ability_type': 'passive',
                    'rarity': 'common',
                    'theme_tags': ['t'],
                }
            )
        return {'cards': cards}


class GenerationServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_retries_and_fallback_provider(self):
        failing = FailingProvider()
        success = SuccessProvider()
        service = CardGenerationService(failing, success, retries=3)

        cards, payload, provider = await service.generate_cards('topic')

        self.assertEqual(10, len(cards))
        self.assertEqual('success', provider)
        self.assertIn('cards', payload)
        self.assertEqual(3, failing.calls)


if __name__ == '__main__':
    unittest.main()
