from __future__ import annotations

from typing import Protocol


class GenerationProvider(Protocol):
    name: str

    async def generate(self, prompt: str) -> dict:
        ...
