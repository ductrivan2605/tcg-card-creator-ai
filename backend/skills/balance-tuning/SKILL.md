# Balance Tuning

Guidance for reading balance metrics and deciding adjustments.

## What the metrics mean

- **win_rate_spread** — the gap between the strongest and weakest
  card's win rate. A large spread means some cards dominate and
  others never get played. Lower is better.
- **dominance** — the usage share of the single most-used card.
  Above ~0.45 means one card is carrying the deck.
- **avg_game_length** — turns per game. Around 8 is healthy. Much
  shorter means the deck is too aggressive; much longer means it
  stalls.

## How to decide adjustments

Change the fewest cards possible. For each problem card, prefer a
single stat change of one point.

- A card with a high cost-power ratio that dominates: reduce attack
  or defense by 1, or raise its cost by 1.
- A card that never gets played (dragging the spread down): lower
  its cost by 1, or raise a stat by 1.
- Do not change a card that is already inside the target bands.

Always give a short, concrete reason for each change, naming the
metric it is meant to move.

## Convergence

Report converged when the metrics are within the target bands.
When converged, make no adjustments.
