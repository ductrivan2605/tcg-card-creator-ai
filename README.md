# TCG Balance Engine

A backend service that designs and balances trading-card decks. An agent
turns a theme into a deck, then a hybrid balance loop tunes it: a genetic
algorithm simulates deck performance, and an LLM reads the results and
decides what to change.

## How it works

```
theme
  │
  ▼  agent
generate rules ──▶ generate cards ──▶ balance loop ──▶ balanced deck
                                          │
                                          ▼
                          ┌──────────────────────────────┐
                          │  1. genetic algorithm simulates │  (pure code)
                          │  2. LLM reads metrics, decides   │  (Gemini)
                          │  3. apply the decided changes    │
                          │     repeat until converged       │
                          └──────────────────────────────┘
```

The genetic algorithm finds the numbers — win-rate spread, dominance,
game length. The LLM interprets those numbers and chooses specific
single-stat changes, with a reason for each. That division is the point:
fast deterministic search for the simulation, the language model for the
judgement call.

## Architecture

Three containers, orchestrated by Docker Compose:

```
browser ──▶ nginx ──▶ backend ──▶ postgres
            (8080)    (FastAPI)   (decks, cards, build runs)
              │
              └── serves the frontend, proxies /api/* to the backend
```

- **nginx** serves the deck-builder UI and reverse-proxies the API, so
  the browser talks to a single origin (no CORS). Server-Sent Events
  pass through unbuffered.
- **backend** is the FastAPI service: the agent, the balance loop, the
  LLM client.
- **postgres** stores every generated deck, its cards, and a record of
  each build run. Data survives restarts via a named volume.

## Running it

> [!IMPORTANT]
> **Prerequisites**: Before running the application, make sure you have **Docker** (with Docker Compose) and **Node.js/npm** installed on your machine.

The backend needs a Gemini API key.

```
export GEMINI_API_KEY=your-key
make up
```

If you are using Docker Compose, `make up` runs from `infra/`, so the
backend now reads `../.env` directly. Putting `GEMINI_API_KEY=...` in
the repo-root `.env` file is enough. 

> [!IMPORTANT]
> Either change the name  `user.env` TO `.env` and fill it with api keys or if you are on powershell/linux terminal use `cp user.env .env` instead 

The app is then at http://localhost:8080. The API is reachable through
nginx at http://localhost:8080/api/ (and directly on the backend
container for service-to-service calls).

For local development without Docker you need a Postgres instance
running, then:

```
make install
export GEMINI_API_KEY=your-key
export DATABASE_URL=postgresql+asyncpg://tcg:tcg@localhost:5432/tcg
make dev
```

## API

System
- `GET /health` — liveness check
- `GET /skills` — list the agent's skills

Chat with the agent (backs the orchestration tab)
- `POST /conversations` — start a conversation
- `GET /conversations/{id}` — load a conversation and its turns
- `POST /conversations/{id}/messages` — send a message; streams the
  agent's reply turns as SSE. The agent remembers the deck it built,
  so follow-ups like "make the legendary cheaper" work.

Projects (persist saved projects to the database)
- `GET /projects` — list saved projects
- `GET /projects/{id}` — load one project
- `POST /projects` — create a project
- `PUT /projects/{id}` — update a project
- `DELETE /projects/{id}` — delete a project

Decks
- `GET /build?theme=...&cards=20` — one-shot build, streamed
- `GET /decks` — list generated decks
- `GET /decks/{id}` — load one generated deck

A conversation turn matches the UI's turn vocabulary: `user`, `agent`,
`thinking`, `tools`, `panel`, `deliverable`.

## Layout

```
backend/
  app/
    core/      domain models and configuration
    db/        database engine, ORM models, repository
    llm/       the Gemini / Imagen client
    agent/     the orchestrator, the conversational agent, and tools
    balance/   the genetic algorithm and the balance loop
    skills/    the skill loader
    api/       the FastAPI server
  skills/      skill files (Markdown guidance for the LLM)
frontend/      the deck-builder UI
infra/         Docker Compose, nginx config
```

## Models

- Text (rules, cards, balance decisions): `gemini-2.5-flash`
- Artwork: `imagen-4.0-generate-001` or `pollinations` — requires a billed Google Cloud
  account for the `imagen` model ; a free API key use pollinations instead.
