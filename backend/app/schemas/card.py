from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CardBase(BaseModel):
    card_id: str
    name: str
    flavour_text: str
    ability_name: str
    ability_description: str
    ability_type: str
    rarity: Literal['common', 'uncommon', 'rare', 'legendary']
    theme_tags: list[str] = Field(default_factory=list)


class ValuedCard(CardBase):
    attack: int
    defence: int
    cost: int
    ability_magnitude: float


class GenerationRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=200)


class PipelineResponse(BaseModel):
    session_id: str
    cards: list[ValuedCard]
    win_rate_std: float
    usage_entropy: float
    iterations: int
    converged: bool
