class_name Palette
extends RefCounted
## Colors pulled directly from the Figma file ("Elemental TCG") via the
## Figma REST API — see godot_client/README.md for the frame IDs. Two font
## families are used across the design: Geist/Geist Mono (battle arena,
## card design) and Archivo/JetBrains Mono (main menu, view deck).

# ── surfaces ─────────────────────────────────────────────────────
const BG_ARENA := Color("#16213e")     # battle arena canvas
const BG_PANEL := Color("#1a1a2e")     # top bar, sidebar, action bar
const BG_CARD := Color("#222546")      # mini card body (battlefield/hand)
const BG_DARK := Color("#10101e")      # cost-ring text, deep accents
const BG_MENU := Color("#12142a")      # main-menu canvas
const BG_MENU_PANEL := Color("#16162e") # main-menu strip / view-deck canvas
const BG_MENU_TOPBAR := Color("#0f0f24")

const BORDER := Color("#2a2e5b")       # near-universal hairline border
const BORDER_MENU := Color("#1c1c3a")
const BORDER_ARENA_FRAME := Color(1.0, 0.722, 0.0, 0.2)  # #ffb800 @ 20%

# ── text ─────────────────────────────────────────────────────────
const TEXT_PRIMARY := Color("#f1f1f6")
const TEXT_WHITE := Color("#ffffff")
const TEXT_MUTED := Color("#a4a9c6")
const TEXT_DIM := Color("#62678d")
const TEXT_MENU_MUTED := Color("#8f9bb3")

# ── accents ──────────────────────────────────────────────────────
const CYAN := Color("#00d4ff")         # cost ring, mana gems, active/phase
const RED := Color("#ff4a4a")          # ATK (mini card), HP bar fill
const GREEN := Color("#00ff66")        # DEF (mini card)
const GOLD := Color("#ffb800")         # primary CTA (Play Card armed, arena frame)
const MONEY_GOLD := Color("#f4ca43")
const PURPLE := Color("#8b5cf6")       # "AI OPINION" label, eyebrow text
const PURPLE_LIGHT := Color("#aa88f8") # AI opinion body text
const LEVEL_GREEN := Color("#00e676")

# ── rarity (view-deck card tiles + text) ──────────────────────────
const RARITY_LEGENDARY := Color("#ffd700")
const RARITY_RARE := Color("#c084fc")
const RARITY_UNCOMMON := Color("#3b82f6")
const RARITY_COMMON := Color("#5f6b8a")

# ── mini-card "rarity-gem" dot ────────────────────────────────────
# The small dot between the ATK/HP badges on a battlefield/hand card.
# Figma names this node "rarity-gem" and uses its own 5-step scale,
# separate from the view-deck tile border colors above.
const GEM_COMMON := Color("#a4a9c6")
const GEM_UNCOMMON := Color("#00ff66")
const GEM_RARE := Color("#00d4ff")
const GEM_EPIC := Color("#7b2fbe")
const GEM_LEGENDARY := Color("#ffb800")

# ── element (view-deck letter badge F/S/A/N) ──────────────────────
const ELEMENT_FIRE := Color("#ffb300")
const ELEMENT_SHADOW := Color("#c084fc")
const ELEMENT_ARCANE := Color("#00d4ff")
const ELEMENT_NATURE := Color("#00ff66")
const ELEMENT_NEUTRAL := Color("#a4a9c6")
const ELEMENT_VOID := Color("#7b2fbe")


static func rarity_color(rarity: String) -> Color:
	match rarity.strip_edges().to_lower():
		"legendary":
			return RARITY_LEGENDARY
		"rare":
			return RARITY_RARE
		"uncommon":
			return RARITY_UNCOMMON
		_:
			return RARITY_COMMON


static func rarity_gem_color(rarity: String) -> Color:
	## The mini-card dot. Uses Figma's "rarity-gem" scale, which is a
	## different set of hues from the view-deck tile borders.
	match rarity.strip_edges().to_lower():
		"legendary":
			return GEM_LEGENDARY
		"epic", "mythic":
			return GEM_EPIC
		"rare":
			return GEM_RARE
		"uncommon":
			return GEM_UNCOMMON
		_:
			return GEM_COMMON


static func element_color(element: String) -> Color:
	match element.strip_edges().to_lower():
		"fire":
			return ELEMENT_FIRE
		"shadow", "dark":
			return ELEMENT_SHADOW
		"arcane", "water":
			return ELEMENT_ARCANE
		"nature", "earth":
			return ELEMENT_NATURE
		"void":
			return ELEMENT_VOID
		_:
			return ELEMENT_NEUTRAL
