"""Validation helpers for external/modelled JSON payloads.

Wraps the Pydantic models in small helpers that produce clear
error messages when the LLM returns invalid shapes.
"""
from __future__ import annotations

from typing import Any, Iterable, List

from app.core.models import (
    BalanceDecision,
    Card,
    CardAdjustment,
    Deck,
    Rules,
)


def validate_balance_decision(raw: Any) -> BalanceDecision:
    try:
        return BalanceDecision.model_validate(raw)
    except Exception as exc:  # pydantic errors
        raise ValueError(f"Invalid BalanceDecision shape: {exc}") from exc


def validate_rules(raw: Any) -> Rules:
    try:
        return Rules.model_validate(raw)
    except Exception as exc:
        raise ValueError(f"Invalid Rules shape: {exc}") from exc


def validate_card(raw: Any) -> Card:
    try:
        return Card.model_validate(raw)
    except Exception as exc:
        raise ValueError(f"Invalid Card shape: {exc}") from exc


def validate_cards(raw_list: Iterable[Any]) -> List[Card]:
    cards: List[Card] = []
    for idx, raw in enumerate(raw_list):
        try:
            cards.append(validate_card(raw))
        except ValueError as exc:
            raise ValueError(f"Card at index {idx} is invalid: {exc}") from exc
    return cards


def validate_adjustments(raw_list: Iterable[Any]) -> List[CardAdjustment]:
    out: List[CardAdjustment] = []
    for idx, raw in enumerate(raw_list):
        try:
            out.append(CardAdjustment.model_validate(raw))
        except Exception as exc:
            raise ValueError(f"Adjustment at index {idx} is invalid: {exc}") from exc
    return out

