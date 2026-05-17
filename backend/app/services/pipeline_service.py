from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Card, CardValue, Session, SimulationResult
from app.schemas.card import PipelineResponse
from app.services.generation.service import CardGenerationService
from app.services.simulation.service import BalanceOptimizer, SimulationEngine
from app.services.values.service import CardValueEngine


class PipelineService:
    def __init__(
        self,
        generation_service: CardGenerationService,
        value_engine: CardValueEngine,
        simulation_engine: SimulationEngine,
        optimizer: BalanceOptimizer,
    ):
        self.generation_service = generation_service
        self.value_engine = value_engine
        self.simulation_engine = simulation_engine
        self.optimizer = optimizer

    async def run(self, topic: str, db: AsyncSession) -> PipelineResponse:
        session = Session(topic=topic, status='generation')
        db.add(session)
        await db.commit()
        await db.refresh(session)

        cards, payload, provider_name = await self.generation_service.generate_cards(topic)
        db.add_all(
            [
                Card(
                    session_id=session.id,
                    card_id=card.card_id,
                    name=card.name,
                    flavour_text=card.flavour_text,
                    ability_name=card.ability_name,
                    ability_description=card.ability_description,
                    ability_type=card.ability_type,
                    rarity=card.rarity,
                    theme_tags=card.theme_tags,
                    raw_provider_payload={'provider': provider_name, 'payload': payload},
                )
                for card in cards
            ]
        )
        session.status = 'values'
        await db.commit()

        valued_cards = self.value_engine.assign_values(cards)
        db_cards = (
            await db.execute(select(Card).where(Card.session_id == session.id).order_by(Card.created_at.asc()))
        ).scalars().all()
        for db_card, valued_card in zip(db_cards, valued_cards):
            db.add(
                CardValue(
                    card_id=db_card.id,
                    attack=valued_card.attack,
                    defence=valued_card.defence,
                    cost=valued_card.cost,
                    ability_magnitude=valued_card.ability_magnitude,
                    generated_from_rules={'rarity': valued_card.rarity},
                )
            )

        session.status = 'simulation'
        await db.commit()

        summary = self.optimizer.evolve_population(valued_cards)
        db.add(
            SimulationResult(
                session_id=session.id,
                iteration=summary.iterations,
                win_rate_std=summary.win_rate_std,
                usage_entropy=summary.usage_entropy,
                converged=summary.converged,
            )
        )
        session.status = 'complete'
        await db.commit()

        return PipelineResponse(
            session_id=str(session.id),
            cards=valued_cards,
            win_rate_std=summary.win_rate_std,
            usage_entropy=summary.usage_entropy,
            iterations=summary.iterations,
            converged=summary.converged,
        )
