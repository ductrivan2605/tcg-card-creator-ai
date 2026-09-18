class_name BoardSlot
extends PanelContainer
## One lane on the battle board (frame battle-arena-default's
## "battlefield-slot": bg black@25%, border #2a2e5b, radius 8). Cards are
## placed via the hand's "PLAY CARD" flow, not drag-and-drop — this slot
## just displays whatever's on it and reports clicks/right-clicks so
## BattleArena can drive attack targeting.

signal slot_clicked(owner_id: String, slot_index: int)
signal slot_right_clicked(owner_id: String, slot_index: int, at_position: Vector2)

const CardViewScene := preload("res://scenes/components/CardView.tscn")

@export var owner_id: String = GameManager.PLAYER
@export var slot_index: int = 0

var _card_view: CardView = null
var _selected: bool = false
var _targetable: bool = false

var _style_normal: StyleBoxFlat
var _style_selected: StyleBoxFlat
var _style_targetable: StyleBoxFlat


func _ready() -> void:
	gui_input.connect(_on_gui_input)
	custom_minimum_size = CardView.SIZE_BOARD

	_style_normal = StyleBoxFlat.new()
	_style_normal.bg_color = Color(0, 0, 0, 0.25)
	_style_normal.border_color = Palette.BORDER
	_style_normal.set_border_width_all(1)
	_style_normal.set_corner_radius_all(8)

	_style_selected = StyleBoxFlat.new()
	_style_selected.bg_color = Color(Palette.GOLD.r, Palette.GOLD.g, Palette.GOLD.b, 0.1)
	_style_selected.border_color = Palette.GOLD
	_style_selected.set_border_width_all(2)
	_style_selected.set_corner_radius_all(8)
	_style_selected.shadow_color = Color(Palette.GOLD.r, Palette.GOLD.g, Palette.GOLD.b, 0.45)
	_style_selected.shadow_size = 8

	_style_targetable = StyleBoxFlat.new()
	_style_targetable.bg_color = Color(Palette.CYAN.r, Palette.CYAN.g, Palette.CYAN.b, 0.12)
	_style_targetable.border_color = Palette.CYAN
	_style_targetable.set_border_width_all(2)
	_style_targetable.set_corner_radius_all(8)
	_style_targetable.shadow_color = Color(Palette.CYAN.r, Palette.CYAN.g, Palette.CYAN.b, 0.5)
	_style_targetable.shadow_size = 8

	_apply_style()


func show_card(card: Card) -> void:
	clear()
	if card == null:
		return
	_card_view = CardViewScene.instantiate()
	add_child(_card_view)
	_card_view.set_display_mode(CardView.DisplayMode.BOARD)
	_card_view.set_card(card)


func clear() -> void:
	if _card_view != null:
		_card_view.queue_free()
		_card_view = null


func get_card_view() -> CardView:
	return _card_view


func set_selected(selected: bool) -> void:
	_selected = selected
	_apply_style()


func set_targetable(targetable: bool, color: Color = Palette.CYAN) -> void:
	_targetable = targetable
	if targetable:
		_style_targetable.border_color = color
		_style_targetable.bg_color = Color(color.r, color.g, color.b, 0.15)
		_style_targetable.shadow_color = Color(color.r, color.g, color.b, 0.5)
	_apply_style()


func _apply_style() -> void:
	var style := _style_normal
	if _selected:
		style = _style_selected
	elif _targetable:
		style = _style_targetable
	add_theme_stylebox_override("panel", style)


func _on_gui_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton and event.pressed):
		return
	if event.button_index == MOUSE_BUTTON_LEFT:
		slot_clicked.emit(owner_id, slot_index)
	elif event.button_index == MOUSE_BUTTON_RIGHT:
		slot_right_clicked.emit(owner_id, slot_index, get_global_mouse_position())
