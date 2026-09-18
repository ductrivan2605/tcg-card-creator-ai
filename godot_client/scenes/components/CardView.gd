class_name CardView
extends PanelContainer
## Visual representation of a single Card, matching the Figma mini-card
## design used on the battlefield and in the hand (frame battle-arena-default,
## nodes "card-*" / "hand-slot-*"): a name+cost header, an art rect, and a
## footer with ATK / element dot / DEF. display_mode only changes size —
## BOARD (84x120) matches battlefield-slot cards, HAND (110x160) matches
## the hand row, FULL (180x260) is an oversized stand-in for the deck
## viewer until it gets its own large card-tile design (a separate,
## more detailed Figma component — see godot_client/README.md).

signal clicked(card: Card)

enum DisplayMode { FULL, HAND, BOARD }

const SIZE_FULL := Vector2(180, 260)
const SIZE_HAND := Vector2(110, 160)
const SIZE_BOARD := Vector2(108, 150)

## Board cards that can't act this turn (just summoned, or already
## attacked) render dimmed so it's obvious at a glance.
const DIM_INACTIVE := Color(1, 1, 1, 0.5)

@onready var _name_label: Label = %NameLabel
@onready var _cost_ring: PanelContainer = %CostRing
@onready var _cost_label: Label = %CostLabel
@onready var _art_rect: ColorRect = %ArtRect
@onready var _art_texture: TextureRect = %ArtTexture
@onready var _attack_label: Label = %AttackLabel
@onready var _defense_label: Label = %DefenseLabel
@onready var _element_dot: ColorRect = %ElementDot
@onready var _footer: PanelContainer = %Footer

var card: Card = null
var display_mode: DisplayMode = DisplayMode.FULL
var _selected: bool = false
var _selected_style: StyleBoxFlat


func _ready() -> void:
	gui_input.connect(_on_gui_input)
	ArtLoader.texture_loaded.connect(_on_art_texture_loaded)
	_apply_display_mode()
	if card != null:
		_refresh()


func set_card(new_card: Card) -> void:
	card = new_card
	if is_node_ready():
		_refresh()


func set_display_mode(mode: DisplayMode) -> void:
	display_mode = mode
	if is_node_ready():
		_apply_display_mode()
		if card != null:
			_refresh()


func _apply_display_mode() -> void:
	var ring_size: float
	match display_mode:
		DisplayMode.BOARD:
			custom_minimum_size = SIZE_BOARD
			_name_label.add_theme_font_size_override("font_size", 8)
			ring_size = 14.0
			_cost_label.add_theme_font_size_override("font_size", 9)
			# On the board, BoardSlot owns clicks (right-click -> attack menu) —
			# get out of the way instead of swallowing them.
			mouse_filter = Control.MOUSE_FILTER_IGNORE
		DisplayMode.HAND:
			custom_minimum_size = SIZE_HAND
			_name_label.add_theme_font_size_override("font_size", 10)
			ring_size = 18.0
			_cost_label.add_theme_font_size_override("font_size", 11)
			mouse_filter = Control.MOUSE_FILTER_STOP
		DisplayMode.FULL:
			custom_minimum_size = SIZE_FULL
			_name_label.add_theme_font_size_override("font_size", 14)
			ring_size = 26.0
			_cost_label.add_theme_font_size_override("font_size", 14)
			mouse_filter = Control.MOUSE_FILTER_STOP

	_cost_ring.custom_minimum_size = Vector2(ring_size, ring_size)
	var ring_style := StyleBoxFlat.new()
	ring_style.bg_color = Palette.CYAN
	ring_style.set_corner_radius_all(int(ring_size / 2))
	_cost_ring.add_theme_stylebox_override("panel", ring_style)


func _refresh() -> void:
	_name_label.text = card.display_name
	_cost_label.text = str(card.cost)
	_attack_label.text = str(card.attack)
	_defense_label.text = str(card.health)  # shield = current health, ticks down with damage
	_element_dot.color = Palette.rarity_gem_color(card.rarity)
	_footer.visible = not card.is_spell()

	var texture := card.art_texture()
	_art_texture.texture = texture
	_art_texture.visible = texture != null
	_art_rect.color = Palette.BG_CARD.lerp(Palette.element_color(card.element), 0.4)

	modulate = resting_modulate()


func resting_modulate() -> Color:
	## The colour this card should sit at when no animation is running.
	## BattleArena's hit-flash tween returns here instead of hardcoding
	## white, so flashing a spent creature doesn't clear its dim.
	if card != null and display_mode == DisplayMode.BOARD \
			and (card.is_tapped or card.is_summoning_sick):
		return DIM_INACTIVE
	return Color.WHITE


func set_selected(selected: bool) -> void:
	## Used by BattleArena for the hand's click-to-select-then-PLAY-CARD
	## flow — a gold highlight, matching the "PLAY CARD" button's armed color.
	if _selected == selected:
		return
	_selected = selected
	if not selected:
		remove_theme_stylebox_override("panel")
		return
	if _selected_style == null:
		_selected_style = StyleBoxFlat.new()
		_selected_style.bg_color = Palette.BG_CARD
		_selected_style.border_color = Palette.GOLD
		_selected_style.set_border_width_all(2)
		_selected_style.set_corner_radius_all(8)
		_selected_style.shadow_color = Color(Palette.GOLD.r, Palette.GOLD.g, Palette.GOLD.b, 0.4)
		_selected_style.shadow_size = 8
	add_theme_stylebox_override("panel", _selected_style)


func refresh_health() -> void:
	if card != null:
		_defense_label.text = str(card.health)


func _on_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		clicked.emit(card)
		EventBus.card_selected.emit(card)


func _on_art_texture_loaded(source: String, tex: ImageTexture) -> void:
	if card != null and card.artwork == source:
		_art_texture.texture = tex
		_art_texture.visible = true

