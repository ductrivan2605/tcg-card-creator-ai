from __future__ import annotations

import logging

from jsonschema import ValidationError, validate

from app.schemas.card import CardBase
from app.services.generation.prompt_builder import build_card_generation_prompt
from app.services.generation.provider import GenerationProvider

logger = logging.getLogger(__name__)

CARDS_SCHEMA = {
    'type': 'object',
    'required': ['cards'],
    'properties': {
        'cards': {
            'type': 'array',
            'minItems': 10,
            'maxItems': 10,
            'items': {
                'type': 'object',
                'required': [
                    'card_id',
                    'name',
                    'flavour_text',
                    'ability_name',
                    'ability_description',
                    'ability_type',
                    'rarity',
                    'theme_tags',
                ],
                'properties': {
                    'card_id': {'type': 'string'},
                    'name': {'type': 'string'},
                    'flavour_text': {'type': 'string'},
                    'ability_name': {'type': 'string'},
                    'ability_description': {'type': 'string'},
                    'ability_type': {'type': 'string'},
                    'rarity': {'enum': ['common', 'uncommon', 'rare', 'legendary']},
                    'theme_tags': {'type': 'array', 'items': {'type': 'string'}},
                },
            },
        }
    },
}


class CardGenerationService:
    def __init__(self, primary_provider: GenerationProvider, fallback_provider: GenerationProvider, retries: int = 3):
        self.primary_provider = primary_provider
        self.fallback_provider = fallback_provider
        self.retries = retries

    async def generate_cards(self, topic: str) -> tuple[list[CardBase], dict, str]:
        prompt = build_card_generation_prompt(topic.strip())
        return await self._generate_with_provider(self.primary_provider, prompt)

    async def _generate_with_provider(self, provider: GenerationProvider, prompt: str) -> tuple[list[CardBase], dict, str]:
        for attempt in range(1, self.retries + 1):
            payload = await provider.generate(prompt)
            try:
                validate(instance=payload, schema=CARDS_SCHEMA)
                cards = [CardBase.model_validate(item) for item in payload['cards']]
                return cards, payload, provider.name
            except (ValidationError, ValueError) as exc:
                logger.warning('Malformed payload from %s on attempt %d: %s', provider.name, attempt, exc)

        if provider is self.primary_provider:
            return await self._generate_with_provider(self.fallback_provider, prompt)

        raise ValueError('All generation providers failed schema validation')
