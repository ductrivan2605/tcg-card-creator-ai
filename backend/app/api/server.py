"""FastAPI application — the HTTP surface of the backend."""
from __future__ import annotations

import json
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.conversation import ConversationalAgent
from app.agent.orchestrator import DeckBuildingAgent
from app.agent.tools import (
    export_card_for_frontend,
    export_cards_file_for_frontend,
    export_rules_for_frontend,
)
from app.balance.meta_decks import (
    get_abyssal_depths_60,
    get_solar_pantheon_60,
    get_primeval_dominion_60,
)
from app.core.config import settings
from app.core.models import Card, Deck, Rules
from app.db import repository as repo
from app.db.database import SessionFactory, get_session, init_models
from app.llm.client import LLMClient
from app.skills.loader import available_skills
from app.value_engine import (
    generate_rules as ve_generate_rules,
    normalise_rules as ve_normalise_rules,
    check_rules as ve_check_rules,
    sample_attributes as ve_sample_attributes,
)

app = FastAPI(title="TCG Balance Engine", version="1.0.0")


def _frontend_deck_payload(deck: Deck) -> dict:
    """Return the deck metadata shape consumed by the frontend project state."""
    return {
        "id": deck.id,
        "name": deck.name,
        "locale": "en",
        "rules": export_rules_for_frontend(deck.rules),
    }


@app.on_event("startup")
async def on_startup() -> None:
    """Create database tables on boot."""
    await init_models()


# ── system ───────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "has_api_key": settings.has_api_key}


@app.get("/skills")
async def skills() -> dict:
    return {"skills": available_skills()}


# ── decks ────────────────────────────────────────────────────

PREBAKED_DECKS = {
    "abyssal_depths_60": get_abyssal_depths_60,
    "solar_pantheon_60": get_solar_pantheon_60,
    "primeval_dominion_60": get_primeval_dominion_60,
}


def _check_godot_compatible(cards: list) -> bool:
    if not cards or len(cards) < 10:
        return False
    creature_count = 0
    for c in cards:
        ctype = c.get("type") or (c.get("content", {}).get("typeLine") if isinstance(c.get("content"), dict) else "")
        if ctype not in ("Creature", "Spell"):
            return False
        if ctype == "Creature":
            gp = c.get("gameplay") if isinstance(c.get("gameplay"), dict) else {}
            hp = c.get("health") or gp.get("health", 0)
            if hp <= 0:
                return False
            creature_count += 1
    return creature_count >= 3


@app.get("/decks")
async def decks(session: AsyncSession = Depends(get_session)) -> dict:
    project_rows = await repo.list_projects(session)
    deck_list = []
    for p in project_rows:
        if not p.cards:
            continue
        if p.name == "Untitled project" and p.topic in ("Deep Sea Creatures", "Greek Mythology"):
            continue
        if p.id in PREBAKED_DECKS or p.topic in PREBAKED_DECKS:
            continue
        deck_list.append({
            "id": p.id,
            "name": p.name,
            "theme": p.topic or (p.deck.get("theme") if isinstance(p.deck, dict) else ""),
            "is_prebaked": False,
            "godot_compatible": _check_godot_compatible(p.cards),
            "created_at": p.created_at.isoformat(),
        })

    return {"decks": deck_list}


@app.get("/decks/{deck_id}")
async def deck_detail(
    deck_id: str, session: AsyncSession = Depends(get_session)
) -> dict:
    proj = await repo.get_project(session, deck_id)
    if proj is not None:
        return {
            "id": proj.id,
            "name": proj.name,
            "theme": proj.topic or (proj.deck.get("theme") if isinstance(proj.deck, dict) else ""),
            "rules": proj.deck.get("rules", {}) if isinstance(proj.deck, dict) else {},
            "balance_history": [],
            "cards": proj.cards or [],
        }

    row = await repo.get_deck(session, deck_id)
    if row is not None:
        cards = sorted(row.cards, key=lambda c: c.position)
        return {
            "id": row.id, "name": row.name, "theme": row.theme,
            "rules": row.rules, "balance_history": row.balance_history,
            "cards": [c.payload for c in cards],
        }

    if deck_id in PREBAKED_DECKS:
        d = PREBAKED_DECKS[deck_id]()
        return {
            "id": d.id,
            "name": d.name,
            "theme": d.theme,
            "rules": d.rules.model_dump(),
            "balance_history": [],
            "cards": [export_card_for_frontend(c) for c in d.cards],
        }

    raise HTTPException(status_code=404, detail="Deck not found")


# ── projects ─────────────────────────────────────────────────
# These mirror the frontend's Projects manager so saving a project
# persists to the database instead of the browser's localStorage.

class ProjectIn(BaseModel):
    id: Optional[str] = None
    name: str = "Untitled project"
    topic: str = ""
    deck: dict = Field(default_factory=dict)
    cards: list = Field(default_factory=list)


class ProjectPatch(BaseModel):
    name: Optional[str] = None
    topic: Optional[str] = None
    deck: Optional[dict] = None
    cards: Optional[list] = None


def _project_json(row) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "topic": row.topic,
        "deck": row.deck,
        "cards": row.cards,
        "createdAt": row.created_at.isoformat(),
        "updatedAt": row.updated_at.isoformat(),
    }


@app.get("/projects")
async def projects(session: AsyncSession = Depends(get_session)) -> dict:
    rows = await repo.list_projects(session)
    return {"projects": [_project_json(r) for r in rows]}


@app.get("/projects/{project_id}")
async def project_detail(
    project_id: str, session: AsyncSession = Depends(get_session)
) -> dict:
    row = await repo.get_project(session, project_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_json(row)


@app.post("/projects")
async def project_create(
    body: ProjectIn, session: AsyncSession = Depends(get_session)
) -> dict:
    row = await repo.create_project(
        session,
        name=body.name,
        topic=body.topic,
        deck=body.deck,
        cards=body.cards,
        project_id=body.id,
    )
    return _project_json(row)


@app.put("/projects/{project_id}")
async def project_update(
    project_id: str,
    body: ProjectPatch,
    session: AsyncSession = Depends(get_session),
) -> dict:
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    row = await repo.update_project(session, project_id, fields)
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_json(row)


@app.delete("/projects/{project_id}")
async def project_delete(
    project_id: str, session: AsyncSession = Depends(get_session)
) -> dict:
    removed = await repo.delete_project(session, project_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"deleted": project_id}


# ── conversations / chat ─────────────────────────────────────
# This backs the orchestration tab: a real chat with the agent.

class MessageIn(BaseModel):
    message: str = Field(min_length=1)


@app.post("/conversations")
async def conversation_create(
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Start a new chat conversation."""
    row = await repo.create_conversation(session)
    return {"id": row.id, "title": row.title}


@app.get("/conversations/{conversation_id}")
async def conversation_detail(
    conversation_id: str, session: AsyncSession = Depends(get_session)
) -> dict:
    """Load a conversation and all its turns."""
    row = await repo.get_conversation(session, conversation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "id": row.id,
        "title": row.title,
        "turns": [
            {"kind": m.kind, **m.payload} for m in row.messages
        ],
    }


@app.post("/conversations/{conversation_id}/messages")
async def conversation_send(
    conversation_id: str,
    body: MessageIn,
) -> StreamingResponse:
    """Send a message to the agent; stream the reply turns as SSE.

    Each event is one turn: {kind, ...}. The user's message and every
    reply turn are persisted, and the agent's memory (the deck so far)
    is saved to the conversation context.
    """

    async def event_stream():
        async with SessionFactory() as session:
            conversation = await repo.get_conversation(session, conversation_id)
            if conversation is None:
                err = {"kind": "error", "message": "Conversation not found"}
                yield f"data: {json.dumps(err)}\n\n"
                return

            # persist + echo the user's turn
            user_turn = {"kind": "user", "text": body.message}
            await repo.append_message(
                session, conversation, kind="user",
                payload={"text": body.message},
            )
            yield f"data: {json.dumps(user_turn)}\n\n"

            context = dict(conversation.context or {})
            try:
                agent = ConversationalAgent(LLMClient())
                async for turn in agent.respond(body.message, context):
                    event = turn.as_event()
                    if turn.kind == "context":
                        # not a UI turn — update the agent's memory
                        context.update(turn.data)
                        continue
                    await repo.append_message(
                        session, conversation,
                        kind=turn.kind, payload=turn.data,
                    )
                    yield f"data: {json.dumps(event)}\n\n"

                await repo.set_conversation_context(
                    session, conversation, context
                )
            except Exception as exc:
                err = {"kind": "error", "message": str(exc)}
                yield f"data: {json.dumps(err)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── one-shot build (no conversation) ─────────────────────────

@app.get("/build")
async def build(
    theme: str = Query(..., min_length=1),
    cards: int = Query(60, ge=4, le=100),
    art: bool = Query(True),
) -> StreamingResponse:
    """Build a balanced deck for a theme in one shot, streaming progress."""

    async def event_stream():
        async with SessionFactory() as session:
            run = await repo.create_build_run(session, theme)
            final_deck: Deck | None = None
            history: list[dict] = []
            try:
                agent = DeckBuildingAgent(LLMClient())
                async for event in agent.build(theme, card_count=cards, generate_art=art):
                    data = event.data
                    if event.type == "balance":
                        history.append(event.data)
                    elif event.type == "rules":
                        rules = Rules.model_validate(event.data)
                        data = {"rules": export_rules_for_frontend(rules)}
                    elif event.type == "cards":
                        cards_file = export_cards_file_for_frontend(
                            run.id,
                            [
                                Card.model_validate(card)
                                for card in event.data.get("cards", [])
                            ],
                        )
                        data = {"cards_file": cards_file, "cards": cards_file["cards"]}
                    if event.type == "done":
                        final_deck = Deck.model_validate(event.data["deck"])
                        cards_file = export_cards_file_for_frontend(
                            final_deck.id,
                            final_deck.cards,
                        )
                        data = {
                            "deck": _frontend_deck_payload(final_deck),
                            "cards_file": cards_file,
                            "cards": cards_file["cards"],
                        }
                    payload = {"type": event.type,
                               "message": event.message,
                               "data": data}
                    yield f"data: {json.dumps(payload)}\n\n"

                deck_id = None
                if final_deck is not None:
                    await repo.save_deck(session, final_deck, history)
                    deck_id = final_deck.id
                await repo.finish_build_run(session, run, deck_id=deck_id)
            except Exception as exc:
                await repo.finish_build_run(
                    session, run, deck_id=None, error=str(exc)
                )
                err = {"type": "error", "message": str(exc), "data": {}}
                yield f"data: {json.dumps(err)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── value engine / assign-values ─────────────────────────────────────────
class AssignValuesIn(BaseModel):
    cards: list = Field(default_factory=list)


@app.post("/assign-values")
async def assign_values(
    body: AssignValuesIn, session: AsyncSession = Depends(get_session)
) -> dict:
    """Generate LLM rules from cards, normalise, check, and sample attributes.

    Accepts a JSON body `{cards: [...]}` and returns `{rules, conflicts, card_values}`.
    """
    cards = body.cards
    if not cards:
        raise HTTPException(status_code=400, detail="cards list is required")

    llm = LLMClient()
    # 1. generate rules from the card examples
    raw_rules = await ve_generate_rules(llm, cards)

    # 2. normalise into per-rarity bounds
    rules = ve_normalise_rules(raw_rules)

    # 3. conflict detection
    ok, conflicts = ve_check_rules(rules)

    # 4. sample attributes (seed for deterministic tests can be added)
    card_values = ve_sample_attributes(cards, rules, seed=42)

    # 5. persist sampled values (deck_id not available in this endpoint)
    try:
        await repo.save_card_values(session, [
            {
                "card_id": c.get("id") or c.get("name"),
                **c.get("attributes", {}),
            }
            for c in card_values
        ], deck_id=None)
    except Exception:
        # persistence should not block returning results; log in future
        pass

    return {"rules": rules, "conflicts": conflicts, "card_values": card_values}
