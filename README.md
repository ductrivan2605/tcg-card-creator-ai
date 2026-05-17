# tcg-card-creator-ai

## Structure

- `backend/app/api` for routes and websocket event modules
- `backend/app/services` for generation, values, simulation, balancing and orchestration
- `backend/app/models` and `backend/app/database` for SQLAlchemy persistence
- `frontend/src/components` for modular UI building blocks

## Key Constraints Enforced

- LLM generation is schema-validated and retry/fallback based
- Numerical card balancing is deterministic Python (`CardValueEngine`)
- Simulation metrics are vectorised NumPy computations
- Pipeline state is persisted after each stage (`sessions`, `cards`, `card_values`, `simulation_results`)
