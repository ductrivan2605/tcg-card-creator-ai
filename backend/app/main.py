"""Entrypoint — runs the API server."""
from __future__ import annotations

from pathlib import Path

import uvicorn

from app.core.config import settings


def _write_port_file(port: int) -> None:
    """Write the active backend port so the frontend dev proxy can discover it."""
    port_file = Path(__file__).resolve().parents[2] / ".backend-port"
    port_file.write_text(str(port), encoding="utf-8")

if __name__ == "__main__":
    _write_port_file(settings.port)
    uvicorn.run(
        "app.api.server:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )
