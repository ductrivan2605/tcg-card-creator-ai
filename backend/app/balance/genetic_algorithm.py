"""Genetic algorithm and multi-deck match simulator.

Simulates how a candidate deck performs against a benchmark pool of
meta archetypes (Aggro, Midrange, Control) following Godot game rules:
- Starting mana: 3
- Mana ramp: +1 max mana every 2 rounds (capped at 10)
- Creature lane combat (atk vs def, retaliation, excess/unblocked face damage)
- First-class Spell card resolution (damage, removal, tempo)
"""
from __future__ import annotations

import random
from typing import Mapping

from app.core.models import BalanceMetrics, Card


class _SimCard:
    """Lightweight mutable card representation for fast deterministic simulation."""
    def __init__(self, card: Card):
        self.id = card.id
        self.cost = card.gameplay.cost
        self.attack = card.gameplay.attack
        self.defense = card.gameplay.defense
        self.health = max(1, card.gameplay.health if card.gameplay.health > 0 else card.gameplay.defense)
        self.is_spell = card.is_spell()
        self.power = card.power()


def _simulate_single_match(
    deck_a: list[Card],
    deck_b: list[Card],
    rng: random.Random,
    max_turns: int = 14,
) -> tuple[int, int, dict[str, int]]:
    """Simulate a match between deck_a (player 1) and deck_b (player 2).

    Returns:
      (winner, turns_taken, card_play_counts)
      winner: 1 if deck_a wins, 2 if deck_b wins, 0 if draw.
    """
    pile_a = [_SimCard(c) for c in deck_a]
    pile_b = [_SimCard(c) for c in deck_b]
    rng.shuffle(pile_a)
    rng.shuffle(pile_b)

    hp_a = 20
    hp_b = 20
    mana_a = 3
    mana_b = 3
    max_mana_a = 3
    max_mana_b = 3

    hand_a = [pile_a.pop() for _ in range(min(4, len(pile_a)))]
    hand_b = [pile_b.pop() for _ in range(min(4, len(pile_b)))]

    board_a: list[_SimCard | None] = [None] * 5
    board_b: list[_SimCard | None] = [None] * 5

    play_counts: dict[str, int] = {}

    for turn in range(1, max_turns + 1):
        # ── Turn A (Player 1) ──────────────────────────
        if turn > 1 and turn % 2 == 1:
            max_mana_a = min(10, max_mana_a + 1)
        mana_a = max_mana_a
        if pile_a and len(hand_a) < 7:
            hand_a.append(pile_a.pop())

        # Play cards from hand
        hand_a.sort(key=lambda c: c.cost, reverse=True)
        remaining_hand_a: list[_SimCard] = []
        for card in hand_a:
            if card.cost <= mana_a:
                mana_a -= card.cost
                play_counts[card.id] = play_counts.get(card.id, 0) + 1
                if card.is_spell:
                    # Spell resolution: deal damage or impact board
                    dmg = max(1, card.power // 2)
                    # Target an enemy creature or face
                    hit_creature = False
                    for idx in range(5):
                        if board_b[idx] is not None:
                            board_b[idx].health -= dmg
                            if board_b[idx].health <= 0:
                                board_b[idx] = None
                            hit_creature = True
                            break
                    if not hit_creature:
                        hp_b -= dmg
                else:
                    # Creature: find open board slot
                    placed = False
                    for idx in range(5):
                        if board_a[idx] is None:
                            board_a[idx] = card
                            placed = True
                            break
                    if not placed:
                        # Board is full, keep in hand
                        mana_a += card.cost
                        remaining_hand_a.append(card)
            else:
                remaining_hand_a.append(card)
        hand_a = remaining_hand_a

        # Combat A -> B
        for slot in range(5):
            attacker = board_a[slot]
            if attacker is not None and attacker.attack > 0:
                defender = board_b[slot]
                if defender is None:
                    # Empty lane hits face
                    hp_b -= attacker.attack
                else:
                    # Lane combat
                    defender.health -= attacker.attack
                    attacker.health -= defender.attack
                    if defender.health <= 0:
                        board_b[slot] = None
                    if attacker.health <= 0:
                        board_a[slot] = None

        if hp_b <= 0:
            return 1, turn, play_counts

        # ── Turn B (Opponent / Meta Archetype) ──────────
        if turn > 1 and turn % 2 == 1:
            max_mana_b = min(10, max_mana_b + 1)
        mana_b = max_mana_b
        if pile_b and len(hand_b) < 7:
            hand_b.append(pile_b.pop())

        hand_b.sort(key=lambda c: c.cost, reverse=True)
        remaining_hand_b: list[_SimCard] = []
        for card in hand_b:
            if card.cost <= mana_b:
                mana_b -= card.cost
                if card.is_spell:
                    dmg = max(1, card.power // 2)
                    hit_creature = False
                    for idx in range(5):
                        if board_a[idx] is not None:
                            board_a[idx].health -= dmg
                            if board_a[idx].health <= 0:
                                board_a[idx] = None
                            hit_creature = True
                            break
                    if not hit_creature:
                        hp_a -= dmg
                else:
                    placed = False
                    for idx in range(5):
                        if board_b[idx] is None:
                            board_b[idx] = card
                            placed = True
                            break
                    if not placed:
                        mana_b += card.cost
                        remaining_hand_b.append(card)
            else:
                remaining_hand_b.append(card)
        hand_b = remaining_hand_b

        # Combat B -> A
        for slot in range(5):
            attacker = board_b[slot]
            if attacker is not None and attacker.attack > 0:
                defender = board_a[slot]
                if defender is None:
                    hp_a -= attacker.attack
                else:
                    defender.health -= attacker.attack
                    attacker.health -= defender.attack
                    if defender.health <= 0:
                        board_a[slot] = None
                    if attacker.health <= 0:
                        board_b[slot] = None

        if hp_a <= 0:
            return 2, turn, play_counts

    # Draw resolution at max turns based on remaining HP
    if hp_a > hp_b:
        return 1, max_turns, play_counts
    elif hp_b > hp_a:
        return 2, max_turns, play_counts
    return 0, max_turns, play_counts


def measure(
    cards: list[Card],
    generation: int,
    meta_pool: Mapping[str, list[Card]] | None = None,
    seed: int = 42,
) -> BalanceMetrics:
    """Simulate a deck across benchmark meta archetypes and produce balance metrics."""
    if not cards:
        raise ValueError("Cannot measure an empty deck.")

    if meta_pool is None:
        from app.balance.meta_decks import get_meta_archetypes
        meta_pool = get_meta_archetypes()

    rng = random.Random(seed)
    matchup_win_rates: list[float] = []
    total_turns: list[int] = []
    all_play_counts: dict[str, int] = {}

    games_per_matchup = 6

    for archetype_name, opp_cards in meta_pool.items():
        wins = 0
        for _ in range(games_per_matchup):
            winner, turns, play_counts = _simulate_single_match(cards, opp_cards, rng)
            if winner == 1:
                wins += 1
            total_turns.append(turns)
            for cid, cnt in play_counts.items():
                all_play_counts[cid] = all_play_counts.get(cid, 0) + cnt
        matchup_win_rates.append(wins / games_per_matchup)

    mean_wr = sum(matchup_win_rates) / len(matchup_win_rates)
    spread = max(matchup_win_rates) - min(matchup_win_rates)
    avg_turns = sum(total_turns) / len(total_turns) if total_turns else 8.0

    total_plays = sum(all_play_counts.values())
    max_plays = max(all_play_counts.values()) if all_play_counts else 0
    dominance = (max_plays / total_plays) if total_plays > 0 else 0.25

    return BalanceMetrics(
        win_rate_spread=round(spread, 4),
        mean_win_rate=round(mean_wr, 4),
        avg_game_length=round(avg_turns, 2),
        dominance=round(dominance, 4),
        generation=generation,
    )


def _fitness(cards: list[Card]) -> float:
    """Score a candidate deck against the meta pool. Lower is better."""
    metrics = measure(cards, generation=0)
    return (
        metrics.win_rate_spread
        + abs(metrics.avg_game_length - 8.0) / 8.0
        + max(0.0, metrics.dominance - 0.45)
    )


def _mutate(card: Card, rate: float, rng: random.Random) -> Card:
    """Return a copy of the card with stats possibly nudged by +/-1."""
    g = card.gameplay.model_copy()
    stats = ("cost",) if card.is_spell() else ("cost", "attack", "defense")
    for stat in stats:
        if rng.random() < rate:
            nudge = rng.choice((-1, 1))
            current = getattr(g, stat)
            setattr(g, stat, max(0, current + nudge))
    return card.model_copy(update={"gameplay": g})


def _crossover(a: Card, b: Card, rng: random.Random) -> Card:
    """Breed two cards: swap stats."""
    g = a.gameplay.model_copy()
    if a.is_spell() or b.is_spell():
        # Keep cost
        if rng.random() < 0.5:
            g.cost = b.gameplay.cost
        return a.model_copy(update={"gameplay": g})

    stats = ("cost", "attack", "defense")
    split = rng.randint(0, len(stats))
    for index, stat in enumerate(stats):
        source = a if index < split else b
        setattr(g, stat, getattr(source.gameplay, stat))
    return a.model_copy(update={"gameplay": g})


def optimize(
    cards: list[Card],
    *,
    generations: int = 50,
    mutation_rate: float = 0.1,
    seed: int = 0,
) -> BalanceMetrics:
    """Run the genetic algorithm against meta archetypes and return the final deck metrics."""
    rng = random.Random(seed)
    population: list[list[Card]] = [list(cards)]

    while len(population) < 8:
        population.append([_mutate(c, mutation_rate, rng) for c in cards])

    for generation in range(1, generations + 1):
        population.sort(key=_fitness)
        survivors = population[: len(population) // 2]
        children: list[list[Card]] = []
        while len(survivors) + len(children) < len(population):
            pa = rng.choice(survivors)
            pb = rng.choice(survivors)
            child = [
                _mutate(_crossover(a, b, rng), mutation_rate, rng)
                for a, b in zip(pa, pb)
            ]
            children.append(child)
        population = survivors + children

    population.sort(key=_fitness)
    return measure(population[0], generation=generations)
