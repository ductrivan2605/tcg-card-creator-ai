from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.schemas.card import ValuedCard
from app.services.simulation.metrics import shannon_entropy, win_rate_std


@dataclass
class SimulationSummary:
    win_rate_std: float
    usage_entropy: float
    iterations: int
    converged: bool


class SimulationEngine:
    def __init__(self, simulations_per_batch: int = 1000):
        self.simulations_per_batch = simulations_per_batch

    def run_batch(self, cards: list[ValuedCard], seed: int = 7) -> tuple[np.ndarray, np.ndarray]:
        rng = np.random.default_rng(seed)
        power = np.array([card.attack + card.defence + card.ability_magnitude - card.cost for card in cards], dtype=float)
        matchups = rng.integers(0, len(cards), size=(self.simulations_per_batch, 2))

        a_idx = matchups[:, 0]
        b_idx = matchups[:, 1]
        a_scores = power[a_idx] + rng.normal(0, 0.5, self.simulations_per_batch)
        b_scores = power[b_idx] + rng.normal(0, 0.5, self.simulations_per_batch)

        winners = np.where(a_scores >= b_scores, a_idx, b_idx)
        win_counts = np.bincount(winners, minlength=len(cards)).astype(float)
        win_rates = win_counts / self.simulations_per_batch

        usage_counts = np.bincount(matchups.flatten(), minlength=len(cards)).astype(float)
        usage_probs = usage_counts / usage_counts.sum()

        return win_rates, usage_probs


class BalanceOptimizer:
    def __init__(self, engine: SimulationEngine, max_iterations: int = 200, convergence_delta: float = 1e-3):
        self.engine = engine
        self.max_iterations = max_iterations
        self.convergence_delta = convergence_delta

    def evolve_population(self, cards: list[ValuedCard]) -> SimulationSummary:
        prev_std = None

        for iteration in range(1, self.max_iterations + 1):
            win_rates, usage_probs = self.engine.run_batch(cards, seed=iteration)
            std = win_rate_std(win_rates)
            entropy = shannon_entropy(usage_probs)

            if prev_std is not None and abs(prev_std - std) <= self.convergence_delta:
                return SimulationSummary(std, entropy, iteration, True)

            prev_std = std

        return SimulationSummary(std, entropy, self.max_iterations, False)
