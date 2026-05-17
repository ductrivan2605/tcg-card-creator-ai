from __future__ import annotations

import numpy as np


def win_rate_std(win_rates: np.ndarray) -> float:
    return float(np.std(win_rates))


def shannon_entropy(probs: np.ndarray) -> float:
    safe_probs = probs[probs > 0]
    return float(-(safe_probs * np.log2(safe_probs)).sum())
