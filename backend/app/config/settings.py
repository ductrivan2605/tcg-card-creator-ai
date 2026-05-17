from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    database_url: str = Field(
        default='postgresql+asyncpg://postgres:postgres@localhost:5432/tcg',
        alias='DATABASE_URL',
    )
    generation_retries: int = Field(default=3, alias='GENERATION_RETRIES')
    simulations_per_batch: int = Field(default=1000, alias='SIMULATIONS_PER_BATCH')
    optimization_max_iterations: int = Field(default=200, alias='OPTIMIZATION_MAX_ITERATIONS')


settings = Settings()
