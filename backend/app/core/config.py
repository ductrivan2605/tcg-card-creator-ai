"""Application configuration, loaded from the environment."""
from __future__ import annotations

import os
from dotenv import load_dotenv

load_dotenv()


def _async_database_url(url: str) -> str:
    """Use the asyncpg driver when a plain Postgres URL is supplied."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Settings:
    """Runtime settings. All values come from environment variables."""

    def __init__(self) -> None:
        self.gemini_api_key: str = os.environ.get("GEMINI_API_KEY", "").strip()
        self.text_model: str = os.environ.get("TEXT_MODEL", "gemini-3.5-flash")
        self.image_model: str = os.environ.get("IMAGE_MODEL", "imagen-4.0-generate-001")
        self.image_provider: str = os.environ.get("IMAGE_PROVIDER", "imagen").strip().lower() 
        self.host: str = os.environ.get("HOST", "0.0.0.0")
        self.port: int = int(os.environ.get("PORT", "8000"))
        self.database_url: str = _async_database_url(
            os.environ.get(
                "DATABASE_URL",
                "sqlite+aiosqlite:///./tcg.db",
            )
        )

    @property
    def has_api_key(self) -> bool:
        return bool(self.gemini_api_key)


settings = Settings()
