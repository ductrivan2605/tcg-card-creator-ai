"""Skill loader — reads the agent's skill files.

A skill is a Markdown file under backend/skills/<name>/SKILL.md. It is
written guidance that gets injected into a model prompt as the system
instruction, so the model follows it.
"""
from __future__ import annotations

from pathlib import Path

_SKILLS_DIR = Path(__file__).resolve().parents[2] / "skills"


def load_skill(name: str) -> str:
    """Return the text of a skill, or an empty string if it does not exist."""
    path = _SKILLS_DIR / name / "SKILL.md"
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")


def available_skills() -> list[str]:
    """List the names of all skills that have a SKILL.md file."""
    if not _SKILLS_DIR.is_dir():
        return []
    return sorted(
        d.name for d in _SKILLS_DIR.iterdir()
        if (d / "SKILL.md").is_file()
    )
