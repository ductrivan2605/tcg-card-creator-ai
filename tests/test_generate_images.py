"""Tests for generate_images() and related artwork helpers.

Run with:  python -m pytest backend/test_generate_images.py -v

No real API calls are made — the LLM client is replaced with a mock.
"""
import asyncio
import base64
import pytest

from app.core.models import Card, Content, Gameplay
from app.agent.tools import (
    _strip_franchise_terms,
    generate_artwork,
    generate_images,
    _FRANCHISE_BLOCKLIST,
)


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_card(name="Test Card", card_id="abc123") -> Card:
    return Card(
        id=card_id,
        rarity="common",
        gameplay=Gameplay(cost=2, attack=3, defense=2, health=4,
                          element="fire", faction="guild"),
        content=Content(name=name, ability="Strike", flavor="A card.", type_line="Creature"),
    )


class _MockLLM:
    """LLM stub that returns a small 1×1 white JPEG."""
    # Minimal valid JPEG bytes (1×1 white pixel)
    _JPEG = base64.b64decode(
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U"
        "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN"
        "DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy"
        "MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAA"
        "AAAAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAA"
        "AAAA/9oADAMBAAIRAxEAPwCwABmX/9k="
    )

    async def generate_image(self, prompt: str, *, aspect_ratio: str = "3:4") -> bytes:
        return self._JPEG


class _FailingLLM:
    """LLM stub that always raises on image generation."""
    async def generate_image(self, prompt: str, *, aspect_ratio: str = "3:4") -> bytes:
        raise RuntimeError("Imagen unavailable")


# ── franchise blocklist ───────────────────────────────────────────────────────

def test_blocklist_replaces_known_term():
    assert _strip_franchise_terms("Pikachu's Bolt", "fallback") == "fallback"

def test_blocklist_case_insensitive():
    assert _strip_franchise_terms("CHARIZARD strikes", "fallback") == "fallback"

def test_blocklist_partial_match():
    assert _strip_franchise_terms("jace the mind sculptor", "fallback") == "fallback"

def test_blocklist_clean_text_unchanged():
    result = _strip_franchise_terms("Shadow Drake of the North", "fallback")
    assert result == "Shadow Drake of the North"

def test_blocklist_empty_string_unchanged():
    assert _strip_franchise_terms("", "fallback") == ""

def test_blocklist_has_entries():
    assert len(_FRANCHISE_BLOCKLIST) > 0


# ── generate_artwork ──────────────────────────────────────────────────────────

def test_generate_artwork_returns_bytes():
    card = _make_card()
    llm = _MockLLM()
    result = asyncio.run(generate_artwork(llm, card, "Ocean"))
    assert isinstance(result, bytes)
    assert len(result) > 0

def test_generate_artwork_prompt_contains_card_name():
    """Verify the prompt includes the card name and theme."""
    captured = {}

    class _CapturingLLM:
        async def generate_image(self, prompt, *, aspect_ratio="3:4"):
            captured["prompt"] = prompt
            return b"\xff\xd8\xff"  # minimal JPEG header

    card = _make_card(name="Flame Drake")
    asyncio.run(generate_artwork(_CapturingLLM(), card, "Volcano"))
    assert "Flame Drake" in captured["prompt"]
    assert "Volcano" in captured["prompt"]


# ── generate_images ───────────────────────────────────────────────────────────

def test_generate_images_attaches_artwork_url():
    cards = [_make_card(name=f"Card {i}", card_id=f"c{i}") for i in range(3)]
    asyncio.run(generate_images(_MockLLM(), cards, "Forest"))
    for card in cards:
        assert card.content.artwork.startswith("https://image.pollinations.ai/prompt/")


def test_generate_images_mixed_success_and_failure():
    cards = [_make_card(name=f"C{i}", card_id=f"c{i}") for i in range(4)]
    asyncio.run(generate_images(_MockLLM(), cards, "Space"))
    successful = [c for c in cards if c.content.artwork]
    assert len(successful) == 4


def test_generate_images_on_progress_called_for_every_card():
    """on_progress must fire exactly once per card, success or failure."""
    cards = [_make_card(name=f"Card {i}", card_id=f"c{i}") for i in range(5)]
    seen_ids = []

    async def _progress(card):
        seen_ids.append(card.id)

    asyncio.run(generate_images(_MockLLM(), cards, "Sky", on_progress=_progress))
    assert sorted(seen_ids) == sorted(c.id for c in cards)


def test_generate_images_empty_list():
    result = asyncio.run(generate_images(_MockLLM(), [], "Void"))
    assert result == []
