extends Control
## Browses the deck GameManager.loaded_deck was set to (from MainMenu's
## deck list or a fresh /build), rendering every card with CardView.

const CardViewScene := preload("res://scenes/components/CardView.tscn")
const DRAWER_WIDTH := 320.0
const HOVER_RISE := 8.0
const HOVER_DURATION := 0.14
const DRAWER_OPEN_DURATION := 0.22
const DRAWER_CLOSE_DURATION := 0.18

@onready var _title_label: Label = %TitleLabel
@onready var _stats_label: Label = %StatsLabel
@onready var _theme_label: Label = %ThemeLabel
@onready var _showing_label: Label = %ShowingLabel
@onready var _grid: GridContainer = %CardGrid
@onready var _scroll_container: ScrollContainer = %ScrollContainer
@onready var _empty_panel: PanelContainer = %EmptyPanel
@onready var _empty_guidance: Label = %EmptyGuidance
@onready var _back_button: Button = %BackButton
@onready var _battle_button: Button = %BattleButton
@onready var _background: ColorRect = %Background
@onready var _header_panel: PanelContainer = %HeaderPanel
@onready var _summary_panel: PanelContainer = %SummaryPanel
@onready var _status_badge: PanelContainer = %StatusBadge
@onready var _status_dot: Panel = %StatusDot
@onready var _status_label: Label = %StatusLabel
@onready var _eyebrow_label: Label = %EyebrowLabel
@onready var _summary_label: Label = %SummaryLabel
@onready var _theme_caption: Label = %ThemeCaption
@onready var _drawer_layer: Control = %DrawerLayer
@onready var _drawer_scrim: ColorRect = %DrawerScrim
@onready var _details_drawer: PanelContainer = %DetailsDrawer
@onready var _drawer_title: Label = %DrawerTitle
@onready var _drawer_close_button: Button = %DrawerCloseButton
@onready var _card_details: CardDetailsPanel = %CardDetails

var _selected_view: CardView = null
var _hovered_views: Dictionary = {}
var _card_tweens: Dictionary = {}
var _drawer_tween: Tween = null


func _ready() -> void:
	_back_button.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/main_menu/MainMenu.tscn"))
	_battle_button.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/battle_arena/BattleArena.tscn"))
	_drawer_close_button.pressed.connect(_close_drawer)
	_drawer_scrim.gui_input.connect(_on_drawer_scrim_input)
	_apply_visual_style()

	var deck: Deck = GameManager.loaded_deck
	if deck == null:
		_title_label.text = "No deck loaded"
		_stats_label.text = "Go back and select or build a deck first."
		_theme_label.text = "—"
		_showing_label.text = "Showing 0 cards"
		_status_badge.visible = false
		_battle_button.disabled = true
		_show_empty_state("Go back and select or build a deck first.")
		return

	_title_label.text = deck.deck_name
	_theme_label.text = deck.theme
	_showing_label.text = "Showing %d cards" % deck.card_count()
	_status_badge.visible = deck.card_count() > 0
	_battle_button.disabled = deck.card_count() == 0

	if deck.card_count() == 0:
		_stats_label.text = "0 cards"
		_show_empty_state("This deck does not contain any cards.")
		return

	_stats_label.text = "%d cards — average cost %.1f" % [deck.card_count(), deck.average_cost()]
	_scroll_container.visible = true
	_empty_panel.visible = false

	for card in deck.cards:
		_add_card_view(card)


func _add_card_view(card: Card) -> void:
	var slot := Control.new()
	slot.custom_minimum_size = CardView.SIZE_FULL
	slot.clip_contents = false
	slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_grid.add_child(slot)

	var view: CardView = CardViewScene.instantiate()
	view.set_display_mode(CardView.DisplayMode.FULL)
	view.set_card(card)
	slot.add_child(view)
	view.position = Vector2.ZERO
	view.size = CardView.SIZE_FULL

	# Keep the pointer target fixed in the grid while the visual card rises.
	# This prevents edge-hover oscillation and guarantees neighbouring slots
	# never participate in the animation.
	var hit_target := Control.new()
	hit_target.size = CardView.SIZE_FULL
	hit_target.mouse_filter = Control.MOUSE_FILTER_STOP
	hit_target.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	hit_target.z_index = 3
	slot.add_child(hit_target)
	hit_target.mouse_entered.connect(_on_card_mouse_entered.bind(view))
	hit_target.mouse_exited.connect(_on_card_mouse_exited.bind(view))
	hit_target.gui_input.connect(_on_card_hit_input.bind(card, view))


func _show_empty_state(guidance: String) -> void:
	_scroll_container.visible = false
	_empty_panel.visible = true
	_empty_guidance.text = guidance


func _on_card_mouse_entered(view: CardView) -> void:
	_hovered_views[view] = true
	_animate_card_hover(view, true)


func _on_card_mouse_exited(view: CardView) -> void:
	_hovered_views.erase(view)
	_animate_card_hover(view, false)


func _on_card_hit_input(event: InputEvent, card: Card, view: CardView) -> void:
	if event is InputEventMouseButton and event.pressed \
			and event.button_index == MOUSE_BUTTON_LEFT:
		view.clicked.emit(card)
		EventBus.card_selected.emit(card)
		_on_card_clicked(card, view)


func _animate_card_hover(view: CardView, hovered: bool) -> void:
	var previous: Tween = _card_tweens.get(view)
	if previous != null and previous.is_valid():
		previous.kill()

	view.z_index = 2 if hovered else (1 if view == _selected_view else 0)
	_apply_card_visual_state(view)

	var tween := create_tween()
	tween.set_trans(Tween.TRANS_QUAD)
	tween.set_ease(Tween.EASE_OUT)
	tween.tween_property(
		view,
		"position:y",
		-HOVER_RISE if hovered else 0.0,
		HOVER_DURATION
	)
	_card_tweens[view] = tween


func _apply_card_visual_state(view: CardView) -> void:
	var hovered: bool = _hovered_views.get(view, false)
	var selected := view == _selected_view

	if hovered or selected:
		var accent := Palette.CYAN.lerp(Palette.PURPLE, 0.3 if hovered else 0.5)
		var style := _panel_style(Palette.BG_CARD, accent, 8, 2)
		style.shadow_color = Color(accent.r, accent.g, accent.b, 0.28 if hovered else 0.2)
		style.shadow_size = 12 if hovered else 8
		style.shadow_offset = Vector2(0, 4)
		view.add_theme_stylebox_override("panel", style)
	else:
		view.remove_theme_stylebox_override("panel")

	var art_texture := view.get_node_or_null("%ArtTexture") as TextureRect
	var art_rect := view.get_node_or_null("%ArtRect") as ColorRect
	var art_modulate := Color(1.08, 1.08, 1.12, 1.0) if hovered else Color.WHITE
	if art_texture != null:
		art_texture.self_modulate = art_modulate
	if art_rect != null:
		art_rect.self_modulate = art_modulate


func _on_card_clicked(card: Card, view: CardView) -> void:
	var previous := _selected_view
	_selected_view = view
	if previous != null and previous != view:
		previous.z_index = 2 if _hovered_views.get(previous, false) else 0
		_apply_card_visual_state(previous)
	_settle_selected_card_for_drawer(view)
	_card_details.show_card(card)

	if not _drawer_layer.visible:
		_open_drawer()


func _settle_selected_card_for_drawer(view: CardView) -> void:
	_hovered_views.erase(view)
	var active_tween: Tween = _card_tweens.get(view)
	if active_tween != null and active_tween.is_valid():
		active_tween.kill()
	_card_tweens.erase(view)
	view.position.y = 0.0
	view.z_index = 1
	_apply_card_visual_state(view)


func _open_drawer() -> void:
	_kill_drawer_tween()
	_drawer_layer.visible = true

	var open_x := size.x - DRAWER_WIDTH
	_details_drawer.position.x = size.x
	_details_drawer.modulate.a = 0.0
	_drawer_scrim.modulate.a = 0.0

	_drawer_tween = create_tween()
	_drawer_tween.set_parallel(true)
	_drawer_tween.set_trans(Tween.TRANS_QUAD)
	_drawer_tween.set_ease(Tween.EASE_OUT)
	_drawer_tween.tween_property(
		_details_drawer, "position:x", open_x, DRAWER_OPEN_DURATION
	)
	_drawer_tween.tween_property(
		_details_drawer, "modulate:a", 1.0, DRAWER_OPEN_DURATION
	)
	_drawer_tween.tween_property(
		_drawer_scrim, "modulate:a", 1.0, DRAWER_OPEN_DURATION
	)


func _close_drawer() -> void:
	if not _drawer_layer.visible:
		return
	_kill_drawer_tween()

	_drawer_tween = create_tween()
	_drawer_tween.set_parallel(true)
	_drawer_tween.set_trans(Tween.TRANS_QUAD)
	_drawer_tween.set_ease(Tween.EASE_IN)
	_drawer_tween.tween_property(
		_details_drawer, "position:x", size.x, DRAWER_CLOSE_DURATION
	)
	_drawer_tween.tween_property(
		_details_drawer, "modulate:a", 0.0, DRAWER_CLOSE_DURATION
	)
	_drawer_tween.tween_property(
		_drawer_scrim, "modulate:a", 0.0, DRAWER_CLOSE_DURATION
	)
	_drawer_tween.chain().tween_callback(_finish_drawer_close)


func _finish_drawer_close() -> void:
	_drawer_layer.visible = false
	_card_details.clear()
	if _selected_view != null:
		var previous := _selected_view
		_selected_view = null
		var active_tween: Tween = _card_tweens.get(previous)
		if active_tween != null and active_tween.is_valid():
			active_tween.kill()
		_card_tweens.erase(previous)
		previous.position.y = 0.0
		previous.z_index = 0
		_apply_card_visual_state(previous)


func _kill_drawer_tween() -> void:
	if _drawer_tween != null and _drawer_tween.is_valid():
		_drawer_tween.kill()


func _on_drawer_scrim_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed \
			and event.button_index == MOUSE_BUTTON_LEFT:
		_close_drawer()


func _apply_visual_style() -> void:
	_background.color = Palette.BG_MENU
	_header_panel.add_theme_stylebox_override(
		"panel", _panel_style(Palette.BG_MENU_TOPBAR, Palette.BORDER_MENU, 8)
	)
	_summary_panel.add_theme_stylebox_override(
		"panel", _panel_style(Palette.BG_MENU_PANEL, Palette.BORDER_MENU, 8)
	)

	var status_background := Palette.LEVEL_GREEN
	status_background.a = 0.08
	var status_border := Palette.LEVEL_GREEN
	status_border.a = 0.4
	_status_badge.add_theme_stylebox_override(
		"panel", _panel_style(status_background, status_border, 6)
	)
	_status_dot.add_theme_stylebox_override(
		"panel", _panel_style(Palette.LEVEL_GREEN, Palette.LEVEL_GREEN, 3, 0)
	)
	_status_label.add_theme_color_override("font_color", Palette.LEVEL_GREEN)
	_eyebrow_label.add_theme_color_override("font_color", Palette.PURPLE)
	_summary_label.add_theme_color_override("font_color", Palette.PURPLE)
	_theme_caption.add_theme_color_override("font_color", Palette.TEXT_DIM)
	_theme_label.add_theme_color_override("font_color", Palette.CYAN)
	_showing_label.add_theme_color_override("font_color", Palette.TEXT_DIM)
	_drawer_title.add_theme_color_override("font_color", Palette.CYAN)

	var empty_background := Palette.BG_MENU_TOPBAR
	empty_background.a = 0.3
	_empty_panel.add_theme_stylebox_override(
		"panel", _panel_style(empty_background, Palette.BORDER_MENU, 12)
	)
	var scrim_color := Palette.BG_DARK
	scrim_color.a = 0.55
	_drawer_scrim.color = scrim_color
	var drawer_border := Palette.CYAN
	drawer_border.a = 0.5
	_details_drawer.add_theme_stylebox_override(
		"panel", _panel_style(Palette.BG_MENU, drawer_border, 0)
	)

	_apply_back_button_style()
	_apply_battle_button_style()
	_apply_drawer_close_button_style()


func _apply_back_button_style() -> void:
	_back_button.add_theme_color_override("font_color", Palette.TEXT_MENU_MUTED)
	_back_button.add_theme_color_override("font_hover_color", Palette.TEXT_PRIMARY)
	_back_button.add_theme_color_override("font_pressed_color", Palette.TEXT_PRIMARY)
	_back_button.add_theme_color_override("icon_normal_color", Palette.TEXT_MENU_MUTED)
	_back_button.add_theme_color_override("icon_hover_color", Palette.TEXT_PRIMARY)
	_back_button.add_theme_color_override("icon_pressed_color", Palette.TEXT_PRIMARY)
	_back_button.add_theme_stylebox_override(
		"normal", _button_style(Palette.BG_MENU_PANEL, Palette.BORDER_MENU)
	)
	_back_button.add_theme_stylebox_override(
		"hover", _button_style(Palette.BG_CARD, Palette.BORDER)
	)
	_back_button.add_theme_stylebox_override(
		"pressed", _button_style(Palette.BG_DARK, Palette.BORDER)
	)


func _apply_battle_button_style() -> void:
	_battle_button.add_theme_color_override("font_color", Palette.BG_DARK)
	_battle_button.add_theme_color_override("font_hover_color", Palette.BG_DARK)
	_battle_button.add_theme_color_override("font_pressed_color", Palette.BG_DARK)
	_battle_button.add_theme_color_override("font_disabled_color", Palette.TEXT_DIM)
	_battle_button.add_theme_color_override("icon_normal_color", Palette.BG_DARK)
	_battle_button.add_theme_color_override("icon_hover_color", Palette.BG_DARK)
	_battle_button.add_theme_color_override("icon_pressed_color", Palette.BG_DARK)
	_battle_button.add_theme_color_override("icon_disabled_color", Palette.TEXT_DIM)
	_battle_button.add_theme_stylebox_override(
		"normal", _button_style(Palette.GOLD, Palette.GOLD, 8, 14)
	)
	_battle_button.add_theme_stylebox_override(
		"hover", _button_style(Palette.MONEY_GOLD, Palette.MONEY_GOLD, 8, 14)
	)
	_battle_button.add_theme_stylebox_override(
		"pressed", _button_style(Palette.GOLD.darkened(0.15), Palette.GOLD, 8, 14)
	)
	_battle_button.add_theme_stylebox_override(
		"disabled", _button_style(Palette.BG_CARD, Palette.BORDER, 8, 14)
	)


func _apply_drawer_close_button_style() -> void:
	_drawer_close_button.add_theme_color_override("font_color", Palette.TEXT_MENU_MUTED)
	_drawer_close_button.add_theme_color_override("font_hover_color", Palette.TEXT_PRIMARY)
	_drawer_close_button.add_theme_color_override("font_pressed_color", Palette.TEXT_PRIMARY)
	_drawer_close_button.add_theme_stylebox_override(
		"normal", _button_style(Palette.BG_CARD, Palette.BORDER, 6, 6)
	)
	_drawer_close_button.add_theme_stylebox_override(
		"hover", _button_style(Palette.BG_MENU_PANEL, Palette.CYAN, 6, 6)
	)
	_drawer_close_button.add_theme_stylebox_override(
		"pressed", _button_style(Palette.BG_DARK, Palette.CYAN, 6, 6)
	)


func _panel_style(
	background_color: Color,
	border_color: Color,
	corner_radius: int,
	border_width: int = 1
) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background_color
	style.border_color = border_color
	style.set_border_width_all(border_width)
	style.set_corner_radius_all(corner_radius)
	return style


func _button_style(
	background_color: Color,
	border_color: Color,
	corner_radius: int = 8,
	horizontal_padding: int = 10
) -> StyleBoxFlat:
	var style := _panel_style(background_color, border_color, corner_radius)
	style.content_margin_left = horizontal_padding
	style.content_margin_right = horizontal_padding
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style
