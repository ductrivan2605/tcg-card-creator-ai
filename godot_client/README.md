# TCG Balance Client (Godot 4)

A 2D Godot 4 client for the TCG Balance Engine backend (`../backend`).

## Running

1. Start the backend (from `../backend`): `python -m app.main`, or via the repo's `Makefile`/Docker setup (`make up`). It listens on `http://localhost:8080/api` through the reverse proxy (or `http://localhost:8000` standalone).
2. Open this folder (`godot_client/`) as a project in Godot 4.3+.
3. Run the project (F5). The main scene is `scenes/main_menu/MainMenu.tscn`.
4. On the main menu, confirm the backend URL (`https://tcg-rmit.duckdns.org/api` by default — or `http://localhost:8080/api` if testing locally) and click **Connect**.

## Flow

- **Main Menu** — health-checks the backend, lists existing decks (`GET /decks`), and can kick off a themed build (`GET /build`, streamed via SSE) or load a deck (`GET /decks/{id}`).
- **Deck Viewer** — renders every card in the selected/built deck with `CardView`.
- **Battle Arena** — a 5-lane board. Drag cards from your hand onto an empty lane to play them (mana permitting); click one of your untapped creatures then click an enemy lane to attack (an empty enemy lane hits the opponent's face). A scripted opponent (`SimpleAI.gd`) takes the enemy's turns. The **Chat with Agent** panel opens a live conversation with the balance agent (`POST /conversations`, `POST /conversations/{id}/messages`, streamed via SSE).

## Architecture

- `scripts/autoload/EventBus.gd` — global signal bus; the only thing UI scenes and game logic both depend on.
- `scripts/autoload/ApiClient.gd` — the single place that talks HTTP to the backend. Plain REST calls go through `HTTPRequest`; the two `text/event-stream` endpoints (`/build`, `/conversations/{id}/messages`) are read with a hand-rolled `HTTPClient` poll loop in `_process()`, since `HTTPRequest` only surfaces a response once it's fully complete. Every result is published as an `EventBus` signal — nothing else in the project touches `HTTPRequest`/`HTTPClient` directly.
- `scripts/autoload/GameManager.gd` — authoritative battle state (HP, mana, hand, board, turn order). `GameManager.loaded_deck` is also the scene-handoff slot MainMenu/DeckViewer/BattleArena use to pass the selected deck along, since Godot scene changes don't carry arguments.
- `scripts/models/` — plain `RefCounted` data classes (`Card`, `Deck`, `TurnAction`) that parse the backend's v0.8 card JSON shape (see `backend/app/agent/tools.py::export_card_for_frontend`).
- `scripts/battle/` — `BoardSlot` (drop target + click target), `CardDragController` (extends `CardView`, adds hand drag-out), `SimpleAI` (scripted opponent turn logic).
- `scenes/components/` — reusable widgets: `CardView`, `ManaBar`, `ChatPanel`.

## Visual system

Ported from the web app's abyssal identity (`frontend/src/styles.css`, `battle.css`) — same palette, same carved-serif/mono type roles, same gold-opponent/cyan-player convention.

- `scripts/ui/Palette.gd` — the shared color constants (void/deep/panel, gold, cyan, rarity tiers). Reach for these instead of new hardcoded `Color("#...")` literals.
- `assets/themes/abyss_theme.tres` — the project's default GUI theme (wired via `project.godot`'s `[gui] theme/custom`). Defines four theme type variations any `Label` can opt into via `theme_type_variation`: `DisplayLabel`/`DisplayTitle` (Cinzel), `VoiceLabel` (Cormorant Garamond italic, for flavor text), `MonoLabel` (a system mono stack, for stats/data). Plain UI text uses a `SystemFont` sans stack (Segoe UI/Inter/Arial) rather than an embedded font.
- `assets/fonts/` — the two custom faces as `.woff2`, self-contained in the repo (no Google Fonts CDN dependency at runtime).
- `CardView` — rarity now drives a proper bezel (`StyleBoxFlat` border + soft glow) built in `_build_frame_style()`, not just a flat-colored border, plus a flavor-text line.
- `ManaBar` — mana renders as hex pips (`scripts/battle/HexPipRow.gd`, a custom-drawn `Control` matching the web app's clip-path hex), HP as a `TextureProgressBar` with a two-stop gradient texture (`assets/ui/hp_gradient_*.tres`) that also animates on change.
- `BoardSlot.set_selected()` swaps in a gold glow `StyleBoxFlat` for the attacker-selection state (previously a flat `modulate` tint).
- `BattleArena` flashes the attacker/defender `CardView` via `Tween` on `EventBus.creature_attacked`, and layers a shader backdrop (`scripts/battle/board_bg.gdshader`, applied through `BoardBackground.gd`) behind the board rows for the faint grid + vignette "sonar" look.

## Notes / known simplifications

- The enemy uses the same deck as the player (shuffled independently) since the backend doesn't expose a second deck source; swap `GameManager.start_match(deck, deck)` in `BattleArena.gd` for two different decks once you have one.
- `SimpleAI` is intentionally simple (play biggest-first, attack the lowest-health blocker or face). It's isolated in one file so it's easy to replace with a stronger policy.
- Card artwork is a flat rarity-tinted placeholder (`ArtRect` in `CardView.tscn`) — wire up `card.artwork`'s URL/path once the backend serves real art.
- `MainMenu`/`DeckViewer`/`ChatPanel` haven't picked up dedicated panel-card backgrounds yet (they inherit the shared theme's fonts/colors, but their containers are still plain `VBoxContainer`s) — a natural next pass if you want the ledger/manuscript look from the design pitch there too.
