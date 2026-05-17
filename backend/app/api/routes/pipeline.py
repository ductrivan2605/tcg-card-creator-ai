from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.schemas.card import GenerationRequest, PipelineResponse
from app.services.generation.provider import GenerationProvider
from app.services.generation.service import CardGenerationService
from app.services.pipeline_service import PipelineService
from app.services.simulation.service import BalanceOptimizer, SimulationEngine
from app.services.values.service import CardValueEngine

router = APIRouter(prefix='/pipeline', tags=['pipeline'])


class StaticGenerationProvider:
    name = 'static'

    async def generate(self, prompt: str) -> dict:
        cards = []
        for idx in range(1, 11):
            cards.append(
                {
                    'card_id': f'card-{idx}',
                    'name': f'{prompt[:20]} {idx}',
                    'flavour_text': f'Flavour {idx}',
                    'ability_name': f'Ability {idx}',
                    'ability_description': f'Description {idx}',
                    'ability_type': 'passive',
                    'rarity': ['common', 'uncommon', 'rare', 'legendary'][idx % 4],
                    'theme_tags': ['generated'],
                }
            )
        return {'cards': cards}


def get_pipeline_service() -> PipelineService:
    provider: GenerationProvider = StaticGenerationProvider()
    generation = CardGenerationService(provider, provider, retries=3)
    values = CardValueEngine(seed=42)
    simulation = SimulationEngine()
    optimizer = BalanceOptimizer(simulation)
    return PipelineService(generation, values, simulation, optimizer)


@router.post('/run', response_model=PipelineResponse)
async def run_pipeline(
    request: GenerationRequest,
    db: AsyncSession = Depends(get_db),
    service: PipelineService = Depends(get_pipeline_service),
) -> PipelineResponse:
    return await service.run(request.topic, db)
