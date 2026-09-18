extends PanelContainer
## The battle arena, matching Figma's battle-arena-default frame: a single
## row of 4 lanes per side, a status panel + mana gems for each player, a
## click-to-select hand (select a card, then press PLAY CARD — no drag and
## drop), and a sidebar with Battle Log / Card Details tabs. Board slots and
## hand/opponent-hand cards are spawned in code so per-instance data
## (owner, slot index) can be set on each one.

const BoardSlotScene := preload("res://scenes/components/BoardSlot.tscn")
const CardViewScene := preload("res://scenes/components/CardView.tscn")
const ManaBarScene := preload("res://scenes/components/ManaBar.tscn")
const SimpleAIScript := preload("res://scripts/battle/SimpleAI.gd")

## How far a hand card sits below the top of the hand row when unselected;
## selecting it clears this and the card "pops" up out of the fan.
const HAND_LIFT := 22

@onready var _title_label: Label = %TitleLabel
@onready var _subtitle_label: Label = %SubtitleLabel
@onready var _phase_label: Label = %PhaseLabel

@onready var _opponent_bar_slot: Control = %OpponentBarSlot
@onready var _player_bar_slot: Control = %PlayerBarSlot
@onready var _opponent_hand_row: HBoxContainer = %OpponentHandRow
@onready var _opponent_hand_label: Label = %OpponentHandLabel
@onready var _hand_label: Label = %HandLabel
@onready var _state_notice: PanelContainer = %StateNotice
@onready var _state_notice_label: Label = %StateNoticeLabel

@onready var _enemy_board_row: HBoxContainer = %EnemyBoardRow
@onready var _player_board_row: HBoxContainer = %PlayerBoardRow
@onready var _hand_row: HBoxContainer = %HandRow

@onready var _play_card_button: Button = %PlayCardButton
@onready var _end_turn_button: Button = %EndTurnButton
@onready var _surrender_button: Button = %SurrenderButton

@onready var _tab_log_button: Button = %TabLogButton
@onready var _tab_details_button: Button = %TabDetailsButton
@onready var _log_scroll: Control = %LogScroll
@onready var _details_scroll: Control = %DetailsScroll
@onready var _log_label: RichTextLabel = %BattleLog
@onready var _details_label: CardDetailsPanel = %CardDetails
@onready var _effect_notification: EffectNotification = %EffectNotification

@onready var _result_overlay: PanelContainer = %ResultOverlay
@onready var _result_card: PanelContainer = %ResultCard
@onready var _result_label: Label = %ResultLabel
@onready var _result_reason: Label = %ResultReason
@onready var _result_button: Button = %ResultButton

@onready var _surrender_overlay: PanelContainer = %SurrenderOverlay
@onready var _surrender_yes_button: Button = %SurrenderYesButton
@onready var _surrender_no_button: Button = %SurrenderNoButton

var _enemy_slots: Array[BoardSlot] = []
var _player_slots: Array[BoardSlot] = []
var _selected_attacker_slot: int = -1
var _selected_hand_card: Card = null
var _selected_hand_view: CardView = null
var _ai := SimpleAIScript.new()
var _player_bar: ManaBar
var _enemy_bar: ManaBar

var _context_menu: PopupMenu
var _context_menu_slot: int = -1

var _spell_overlay: PanelContainer
var _spell_card_container: Control
var _spell_title_label: Label
var _spell_card_view: CardView
var _spell_desc_label: Label
var _spell_skip_label: Label
var _spell_dismiss_requested: bool = false
var _is_casting_spell: bool = false

## Set by _on_creature_attacked and consumed by the next _refresh_board(),
## since board_changed rebuilds slot CardViews right after — flashing the
## pre-rebuild node would just animate something about to be freed.
var _pending_flash: Dictionary = {}
var _pending_play_animation: Dictionary = {}
var _effect_notification_queue: Array[Dictionary] = []
var _effect_notification_queue_running: bool = false


func _ready() -> void:
	_play_card_button.pressed.connect(_on_play_card_pressed)
	_end_turn_button.pressed.connect(func(): GameManager.end_turn(GameManager.PLAYER))
	_result_button.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/main_menu/MainMenu.tscn"))
	_surrender_button.pressed.connect(func(): _surrender_overlay.visible = true)
	_surrender_yes_button.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/main_menu/MainMenu.tscn"))
	_surrender_no_button.pressed.connect(func(): _surrender_overlay.visible = false)
	_tab_log_button.pressed.connect(func(): _show_tab(true))
	_tab_details_button.pressed.connect(func(): _show_tab(false))
	_result_overlay.visible = false
	_surrender_overlay.visible = false
	_show_tab(true)
	_update_play_card_button()

	_context_menu = PopupMenu.new()
	_context_menu.add_item("Attack", 0)
	_context_menu.add_item("Use Skill", 1)
	_context_menu.id_pressed.connect(_on_context_menu_id_pressed)
	add_child(_context_menu)
	_style_context_menu()

	EventBus.match_started.connect(_on_match_started)
	EventBus.turn_started.connect(_on_turn_started)
	EventBus.phase_changed.connect(_on_phase_changed)
	EventBus.board_changed.connect(_refresh_board)
	EventBus.hand_changed.connect(_on_hand_changed)
	EventBus.card_drawn.connect(_on_card_drawn)
	EventBus.match_ended.connect(_on_match_ended)
	EventBus.card_played.connect(_on_card_played)
	EventBus.creature_attacked.connect(_on_creature_attacked)
	EventBus.face_damaged.connect(_on_face_damaged)
	EventBus.effect_triggered.connect(_on_effect_triggered)
	EventBus.spell_cast.connect(_on_spell_cast)
	EventBus.spell_scene_requested.connect(_on_spell_scene_requested)
	EventBus.shield_broken.connect(_on_shield_broken)
	EventBus.stat_buffed.connect(_on_stat_buffed)

	_build_bars()
	_build_board_rows()
	_build_spell_overlay()


	var deck: Deck = GameManager.loaded_deck
	if deck == null or deck.cards.is_empty():
		_title_label.text = "Battle Arena"
		_subtitle_label.text = "WAITING"
		_phase_label.text = "NO DECK LOADED"
		_hand_label.text = "No deck loaded"
		_opponent_hand_label.text = "AI Hand (0 cards)"
		_set_bar_placeholder(_player_bar)
		_set_bar_placeholder(_enemy_bar)
		_end_turn_button.disabled = true
		_surrender_button.disabled = true
		return

	_title_label.text = "Player vs AI"
	GameManager.start_match(deck, deck)


func _exit_tree() -> void:
	_effect_notification_queue.clear()
	_effect_notification_queue_running = false


func _build_bars() -> void:
	_player_bar = ManaBarScene.instantiate()
	_player_bar.player_id = GameManager.PLAYER
	_player_bar.display_name = "You"
	_player_bar_slot.add_child(_player_bar)
	_style_status_bar(_player_bar, Palette.CYAN)

	_enemy_bar = ManaBarScene.instantiate()
	_enemy_bar.player_id = GameManager.ENEMY
	_enemy_bar.display_name = "AI Opponent"
	_opponent_bar_slot.add_child(_enemy_bar)
	_style_status_bar(_enemy_bar, Color("#e58a9a"))


func _style_status_bar(bar: ManaBar, accent: Color) -> void:
	var border := accent
	border.a = 0.4
	var style := _panel_style(Palette.BG_MENU_TOPBAR, border, 10)
	bar.add_theme_stylebox_override("panel", style)
	var avatar := bar.get_node_or_null("%Avatar") as Control
	if avatar != null:
		avatar.visible = false
	var hp_fill := bar.get_node_or_null("%HpFill") as ColorRect
	if hp_fill != null:
		hp_fill.color = accent
	var hp_label := bar.get_node_or_null("%HpLabel") as Label
	if hp_label != null:
		hp_label.add_theme_color_override("font_color", accent)


func _set_bar_placeholder(bar: ManaBar) -> void:
	if bar == null:
		return
	var hp_label := bar.get_node_or_null("%HpLabel") as Label
	if hp_label != null:
		hp_label.text = "—/—"
	var hp_fill := bar.get_node_or_null("%HpFill") as ColorRect
	if hp_fill != null:
		hp_fill.anchor_right = 0.0
	for node_name in ["%DeckCountLabel", "%DiscardCountLabel"]:
		var count_label := bar.get_node_or_null(node_name) as Label
		if count_label != null:
			count_label.text = "—"


func _build_board_rows() -> void:
	for i in range(GameManager.BOARD_SIZE):
		_spawn_slot(GameManager.ENEMY, i, _enemy_board_row)
		_spawn_slot(GameManager.PLAYER, i, _player_board_row)


func _spawn_slot(owner_id: String, slot_index: int, row_container: HBoxContainer) -> void:
	var slot: BoardSlot = BoardSlotScene.instantiate()
	slot.owner_id = owner_id
	slot.slot_index = slot_index
	row_container.add_child(slot)

	if owner_id == GameManager.PLAYER:
		slot.slot_right_clicked.connect(_on_player_slot_right_clicked)
		slot.slot_clicked.connect(_on_player_slot_clicked)
		_player_slots.append(slot)
	else:
		slot.slot_clicked.connect(_on_enemy_slot_clicked)
		_enemy_slots.append(slot)


# ── reactive UI updates ────────────────────────────────────────

func _refresh_board() -> void:
	var player_state = GameManager.get_state(GameManager.PLAYER)
	var enemy_state = GameManager.get_state(GameManager.ENEMY)
	for i in range(GameManager.BOARD_SIZE):
		_player_slots[i].show_card(player_state.board[i])
		_enemy_slots[i].show_card(enemy_state.board[i])

	if not _pending_play_animation.is_empty():
		var play_anim := _pending_play_animation
		_pending_play_animation = {}
		var slots := _slots_for(play_anim.get("player_id", ""))
		var idx: int = play_anim.get("slot_index", -1)
		if idx >= 0 and idx < slots.size():
			var cv: CardView = slots[idx].get_card_view()
			if cv != null:
				_animate_card_entrance(cv, play_anim.get("player_id", "") == GameManager.PLAYER)

	if not _pending_flash.is_empty():
		_apply_pending_flash()


func _on_hand_changed(player_id: String) -> void:
	if player_id == GameManager.PLAYER:
		_rebuild_hand()
	else:
		_rebuild_opponent_hand()
	_update_hand_labels()


func _update_hand_labels() -> void:
	var player_state = GameManager.get_state(GameManager.PLAYER)
	var enemy_state = GameManager.get_state(GameManager.ENEMY)
	if player_state != null:
		_hand_label.text = "Your Hand (%d cards)" % player_state.hand.size()
	if enemy_state != null:
		_opponent_hand_label.text = "AI Hand (%d cards)" % enemy_state.hand.size()


func _rebuild_hand() -> void:
	for child in _hand_row.get_children():
		child.queue_free()
	_selected_hand_card = null
	_selected_hand_view = null
	_update_play_card_button()

	## Cards overlap like Figma's fanned hand (negative separation). Each
	## card sits in a MarginContainer whose top margin is the "resting"
	## offset — clearing that margin lifts the selected card out of the fan.
	## HBoxContainer owns child positions, so a wrapper margin is the only
	## container-safe way to raise one card.
	var state = GameManager.get_state(GameManager.PLAYER)
	for card in state.hand:
		var slot := MarginContainer.new()
		slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		slot.add_theme_constant_override("margin_top", HAND_LIFT)
		_hand_row.add_child(slot)

		var view: CardView = CardViewScene.instantiate()
		slot.add_child(view)
		view.set_display_mode(CardView.DisplayMode.HAND)
		view.set_card(card)
		view.clicked.connect(_on_hand_card_clicked.bind(view))


func _rebuild_opponent_hand() -> void:
	## The opponent's hand is hidden — just a stack of face-down cards
	## matching Figma's "opponent-hand" / "face-down-card" nodes.
	for child in _opponent_hand_row.get_children():
		child.queue_free()
	var state = GameManager.get_state(GameManager.ENEMY)
	for i in range(state.hand.size()):
		var back := PanelContainer.new()
		back.custom_minimum_size = Vector2(48, 72)
		var style := StyleBoxFlat.new()
		style.bg_color = Color(Palette.PURPLE.r, Palette.PURPLE.g, Palette.PURPLE.b, 0.3)
		style.border_color = Color(Palette.PURPLE.r, Palette.PURPLE.g, Palette.PURPLE.b, 0.5)
		style.set_border_width_all(1)
		style.set_corner_radius_all(6)
		back.add_theme_stylebox_override("panel", style)
		var center := CenterContainer.new()
		var pattern := PanelContainer.new()
		pattern.custom_minimum_size = Vector2(18, 18)
		var pattern_style := _panel_style(
			Color(Palette.PURPLE.r, Palette.PURPLE.g, Palette.PURPLE.b, 0.15),
			Color.TRANSPARENT,
			9,
			0
		)
		pattern.add_theme_stylebox_override("panel", pattern_style)
		center.add_child(pattern)
		back.add_child(center)
		_opponent_hand_row.add_child(back)


# ── hand: click-to-select then PLAY CARD ──────────────────────────

func _on_hand_card_clicked(card: Card, view: CardView) -> void:
	if GameManager.current_turn != GameManager.PLAYER:
		return
	if _selected_hand_view == view:
		_clear_hand_selection()
		return
	_clear_attack_selection()
	_clear_hand_selection()
	_selected_hand_card = card
	_selected_hand_view = view
	view.set_selected(true)
	_set_hand_card_lifted(view, true)
	_inspect_card(card)
	_update_play_card_button()

	var state = GameManager.get_state(GameManager.PLAYER)
	if state.mana < card.cost:
		_append_log("Not enough mana for %s (needs %d, have %d)." % [
			card.display_name, card.cost, state.mana,
		])
		_show_state_notice(
			"Not enough mana (%d/%d)" % [state.mana, card.cost],
			Color("#e58a9a")
		)
		return
	else:
		_hide_state_notice()

	_highlight_valid_play_targets()


func _clear_hand_selection() -> void:
	if _selected_hand_view != null and is_instance_valid(_selected_hand_view):
		_selected_hand_view.set_selected(false)
		_set_hand_card_lifted(_selected_hand_view, false)
	_selected_hand_card = null
	_selected_hand_view = null
	_clear_slot_highlights()
	_update_play_card_button()


func _clear_slot_highlights() -> void:
	for slot in _player_slots:
		slot.set_targetable(false)
	for slot in _enemy_slots:
		slot.set_targetable(false)


func _highlight_valid_play_targets() -> void:
	_clear_slot_highlights()
	if _selected_hand_card == null:
		return

	var state = GameManager.get_state(GameManager.PLAYER)
	if state.mana < _selected_hand_card.cost:
		return

	var target_scope := _selected_hand_card.get_targeted_scope()

	if _selected_hand_card.is_spell():
		if target_scope == "enemy_creature":
			var enemy_state = GameManager.get_state(GameManager.ENEMY)
			var any_enemy := false
			for i in range(GameManager.BOARD_SIZE):
				if enemy_state != null and enemy_state.board[i] != null:
					_enemy_slots[i].set_targetable(true, Palette.RED)
					any_enemy = true
			if any_enemy:
				_append_log("Click an enemy creature to target with %s." % _selected_hand_card.display_name)
		elif target_scope == "friendly_creature":
			var any_ally := false
			for i in range(GameManager.BOARD_SIZE):
				if state.board[i] != null:
					_player_slots[i].set_targetable(true, Palette.GREEN)
					any_ally = true
			if any_ally:
				_append_log("Click an allied creature to heal/buff with %s." % _selected_hand_card.display_name)
		else:
			_append_log("Press PLAY CARD to cast %s." % _selected_hand_card.display_name)
	else:
		# Creature card: highlight all empty player slots for placement
		var any_empty := false
		for i in range(GameManager.BOARD_SIZE):
			if state.board[i] == null:
				_player_slots[i].set_targetable(true, Palette.CYAN)
				any_empty = true
		if any_empty:
			_append_log("Click an empty lane to summon %s, or press PLAY CARD." % _selected_hand_card.display_name)


func _set_hand_card_lifted(view: CardView, lifted: bool) -> void:
	var slot := view.get_parent()
	if slot is MarginContainer:
		slot.add_theme_constant_override("margin_top", 0 if lifted else HAND_LIFT)


func _update_play_card_button() -> void:
	var can_play := _selected_hand_card != null and GameManager.can_play_card(GameManager.PLAYER, _selected_hand_card)
	_play_card_button.disabled = not can_play

	var style := StyleBoxFlat.new()
	style.set_corner_radius_all(8)
	if can_play:
		style.bg_color = Palette.GOLD
		style.border_color = Palette.GOLD
		style.set_border_width_all(1)
		_play_card_button.add_theme_color_override("font_color", Palette.BG_DARK)
		_play_card_button.add_theme_color_override("font_disabled_color", Palette.BG_DARK)
	else:
		style.bg_color = Palette.BG_ARENA
		style.border_color = Palette.BORDER
		style.set_border_width_all(1)
		_play_card_button.add_theme_color_override("font_color", Palette.TEXT_DIM)
		_play_card_button.add_theme_color_override("font_disabled_color", Palette.TEXT_DIM)
	_play_card_button.add_theme_stylebox_override("normal", style)
	_play_card_button.add_theme_stylebox_override("disabled", style)
	_play_card_button.add_theme_stylebox_override("hover", style)


func _on_play_card_pressed() -> void:
	if _selected_hand_card == null or _is_casting_spell:
		return
	var card_to_play = _selected_hand_card
	_clear_hand_selection()
	if card_to_play.is_spell():
		await _play_spell_scene(GameManager.PLAYER, card_to_play)
	GameManager.play_card(GameManager.PLAYER, card_to_play)


func _on_card_played(player_id: String, card: Card, slot_index: int) -> void:
	var actor := "You play" if player_id == GameManager.PLAYER else "AI plays"
	_append_log("%s %s (%d mana) to slot %d." % [
		actor, card.display_name, card.cost, slot_index + 1,
	])
	_pending_play_animation = {
		"player_id": player_id,
		"slot_index": slot_index
	}


# ── attack targeting ─────────────────────────────────────────────
# Right-click your own creature to open a menu (Attack / Use Skill).
# Choosing Attack arms _selected_attacker_slot and glows every enemy lane
# ("* Click a glowing target slot to resolve *"); the next left-click on
# an enemy lane resolves the attack. Use Skill is UI-only for now — card
# abilities are free-form LLM text with no execution engine yet, so it
# just surfaces the ability text rather than doing something mechanical.

func _on_player_slot_right_clicked(_owner_id: String, slot_index: int, at_position: Vector2) -> void:
	if GameManager.current_turn != GameManager.PLAYER:
		return
	var state = GameManager.get_state(GameManager.PLAYER)
	var creature: Card = state.board[slot_index]
	if creature == null:
		return
	if not GameManager.can_creature_attack(creature):
		if creature.is_summoning_sick:
			_append_log("%s was just summoned — it can act next turn." % creature.display_name)
		else:
			_append_log("%s already acted this turn." % creature.display_name)
		return
	_context_menu_slot = slot_index
	_context_menu.position = Vector2i(at_position)
	_context_menu.popup()


func _on_context_menu_id_pressed(id: int) -> void:
	var slot_index := _context_menu_slot
	_context_menu_slot = -1
	if slot_index == -1:
		return

	var state = GameManager.get_state(GameManager.PLAYER)
	var creature: Card = state.board[slot_index]
	if creature == null:
		return

	if id == 0:
		_selected_attacker_slot = slot_index
		_player_slots[slot_index].set_selected(true)
		var any_target := false
		for slot in _enemy_slots:
			var valid := GameManager.can_attack_slot(GameManager.PLAYER, slot.slot_index)
			slot.set_targetable(valid)
			any_target = any_target or valid
		if any_target:
			_append_log("Attacker selected — click a glowing lane to resolve.")
			_show_state_notice(
				"Select a target for %s's attack" % creature.display_name,
				Palette.CYAN
			)
		else:
			_append_log("No valid target.")
			_show_state_notice("No valid targets for this creature.", Color("#e58a9a"))
	else:
		_inspect_card(creature)
		var ability_text := creature.ability if creature.ability != "" else "(no active skill)"
		_append_log("%s's skill — %s" % [creature.display_name, ability_text])


func _clear_attack_selection() -> void:
	if _selected_attacker_slot != -1 and _selected_attacker_slot < _player_slots.size():
		_player_slots[_selected_attacker_slot].set_selected(false)
	_selected_attacker_slot = -1
	for slot in _enemy_slots:
		slot.set_targetable(false)
	if GameManager.current_turn == GameManager.PLAYER:
		_hide_state_notice()


func _on_player_slot_clicked(_owner_id: String, slot_index: int) -> void:
	var state = GameManager.get_state(GameManager.PLAYER)
	if state == null:
		return

	# 1. If a hand card is selected and it's a Creature: click an empty slot to summon!
	if _selected_hand_card != null and not _selected_hand_card.is_spell():
		if slot_index >= 0 and slot_index < GameManager.BOARD_SIZE and state.board[slot_index] == null:
			var card_to_play: Card = _selected_hand_card
			_clear_hand_selection()
			GameManager.play_card(GameManager.PLAYER, card_to_play, slot_index)
			return

	# 2. If a hand card targets an allied creature (heal, buff, shield)
	if _selected_hand_card != null and _selected_hand_card.get_targeted_scope() == "friendly_creature":
		if slot_index >= 0 and slot_index < GameManager.BOARD_SIZE and state.board[slot_index] != null:
			if _is_casting_spell:
				return
			var card_to_play: Card = _selected_hand_card
			_clear_hand_selection()
			if card_to_play.is_spell():
				await _play_spell_scene(GameManager.PLAYER, card_to_play)
			GameManager.play_card(GameManager.PLAYER, card_to_play, -1, slot_index)
			return

	# 3. Left-click your own board card just inspects it
	var card: Card = state.board[slot_index]
	if card != null:
		_inspect_card(card)


func _on_enemy_slot_clicked(owner_id: String, slot_index: int) -> void:
	var enemy_state = GameManager.get_state(GameManager.ENEMY)

	# 1. If a hand card targets an enemy creature (damage, destroy, debuff, bounce)
	if _selected_hand_card != null and _selected_hand_card.get_targeted_scope() == "enemy_creature":
		if slot_index >= 0 and slot_index < GameManager.BOARD_SIZE and enemy_state != null and enemy_state.board[slot_index] != null:
			if _is_casting_spell:
				return
			var card_to_play: Card = _selected_hand_card
			_clear_hand_selection()
			if card_to_play.is_spell():
				await _play_spell_scene(GameManager.PLAYER, card_to_play)
			GameManager.play_card(GameManager.PLAYER, card_to_play, -1, slot_index)
			return

	# 2. With an attacker armed, left-click on enemy lane resolves attack
	if _selected_attacker_slot != -1:
		if GameManager.current_turn != GameManager.PLAYER:
			return
		if not GameManager.can_attack_slot(GameManager.PLAYER, slot_index):
			_append_log("Blocked — clear their creatures before hitting face.")
			_show_state_notice("Invalid target — Taunt and board rules still apply.", Color("#e58a9a"))
			return
		var attacker_slot := _selected_attacker_slot
		_clear_attack_selection()
		GameManager.attack(GameManager.PLAYER, attacker_slot, slot_index)
		return

	# 3. With no attacker armed and no target spell, clicking an enemy lane inspects it
	if enemy_state != null and enemy_state.board[slot_index] != null:
		_inspect_card(enemy_state.board[slot_index])


func _on_creature_attacked(attacker_slot: int, defender_slot: int, attacker_owner: String) -> void:
	var target := "lane %d" % defender_slot if defender_slot != -1 else "face"
	_append_log("%s: lane %d attacks %s" % [attacker_owner, attacker_slot, target])

	var atk_slots := _slots_for(attacker_owner)
	if attacker_slot >= 0 and attacker_slot < atk_slots.size():
		var atk_view: CardView = atk_slots[attacker_slot].get_card_view()
		if atk_view != null:
			_animate_lunge(atk_view, attacker_owner == GameManager.PLAYER)

	_pending_flash = {
		"attacker_owner": attacker_owner,
		"attacker_slot": attacker_slot,
		"defender_owner": GameManager.opponent_of(attacker_owner),
		"defender_slot": defender_slot,
	}


func _on_face_damaged(player_id: String, amount: int) -> void:
	var who := "You take" if player_id == GameManager.PLAYER else "Opponent takes"
	_append_log("%s %d damage." % [who, amount])


func _slots_for(owner_id: String) -> Array[BoardSlot]:
	return _player_slots if owner_id == GameManager.PLAYER else _enemy_slots


func _apply_pending_flash() -> void:
	var flash := _pending_flash
	_pending_flash = {}

	var attacker_slots := _slots_for(flash.attacker_owner)
	var attacker_index: int = flash.attacker_slot
	if attacker_index >= 0 and attacker_index < attacker_slots.size():
		_flash_card_view(attacker_slots[attacker_index].get_card_view(), false)

	var defender_index: int = flash.defender_slot
	if defender_index != -1:
		var defender_slots := _slots_for(flash.defender_owner)
		if defender_index < defender_slots.size():
			_flash_card_view(defender_slots[defender_index].get_card_view(), true)


func _animate_card_entrance(view: CardView, is_player: bool) -> void:
	if view == null:
		return
	view.pivot_offset = view.custom_minimum_size / 2
	view.scale = Vector2(0.2, 0.2)
	view.modulate = Color(1.8, 1.8, 1.8, 0.2)
	var orig_y := view.position.y
	view.position.y = orig_y + (30.0 if is_player else -30.0)

	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(view, "scale", Vector2.ONE, 0.26).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(view, "position:y", orig_y, 0.24).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(view, "modulate", view.resting_modulate(), 0.25)


func _animate_lunge(view: CardView, is_player: bool) -> void:
	if view == null:
		return
	view.pivot_offset = view.custom_minimum_size / 2
	var lunge_dist := -22.0 if is_player else 22.0
	var orig_y := view.position.y
	var tween := create_tween()
	tween.tween_property(view, "position:y", orig_y + lunge_dist, 0.1).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(view, "position:y", orig_y, 0.16).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func _flash_card_view(view: CardView, is_hit: bool) -> void:
	if view == null:
		return
	view.pivot_offset = view.custom_minimum_size / 2
	var flash_color := Palette.RED if is_hit else Palette.GOLD
	var orig_x := view.position.x

	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(view, "modulate", flash_color, 0.08)
	tween.tween_property(view, "scale", Vector2(1.15, 1.15), 0.08)
	if is_hit:
		tween.chain().tween_property(view, "position:x", orig_x - 5.0, 0.04)
		tween.chain().tween_property(view, "position:x", orig_x + 5.0, 0.04)
		tween.chain().tween_property(view, "position:x", orig_x, 0.04)
	tween.tween_property(view, "modulate", view.resting_modulate(), 0.25)
	tween.tween_property(view, "scale", Vector2.ONE, 0.25)


# ── turn flow ────────────────────────────────────────────────────

func _on_phase_changed(player_id: String, phase: int) -> void:
	var phase_name := "SETUP" if phase == GameManager.Phase.SETUP else "COMBAT"
	_subtitle_label.text = "BATTLE ARENA // %s" % phase_name
	_phase_label.text = "TURN %d · %s" % [GameManager.turn_number, phase_name]


func _on_turn_started(player_id: String, turn_number: int) -> void:
	_clear_attack_selection()
	_clear_hand_selection()
	var is_player_turn := player_id == GameManager.PLAYER
	_end_turn_button.disabled = not is_player_turn
	_surrender_button.disabled = false
	_update_play_card_button()
	_append_log("--- Turn %d: %s ---" % [turn_number, player_id])

	if player_id == GameManager.ENEMY:
		_show_state_notice("AI is evaluating moves...", Palette.PURPLE_LIGHT)
		await get_tree().create_timer(0.6).timeout
		if GameManager.match_active:
			await _ai.take_turn(GameManager.ENEMY)
	else:
		_hide_state_notice()


func _on_match_started() -> void:
	_title_label.text = "Player vs AI"
	_append_log("Match started. You go first.")


func _on_effect_triggered(source_card: Card, effect_name: String, target_info: String, magnitude: int) -> void:
	_append_log("[Effect] %s triggered %s: %s" % [source_card.display_name, effect_name.to_upper(), target_info])
	_effect_notification_queue.append({
		"source_card": source_card,
		"effect_name": effect_name,
		"target_info": target_info,
		"magnitude": magnitude,
	})
	if not _effect_notification_queue_running:
		call_deferred("_process_effect_notification_queue")


func _process_effect_notification_queue() -> void:
	if _effect_notification_queue_running:
		return
	_effect_notification_queue_running = true

	while not _effect_notification_queue.is_empty() and is_inside_tree():
		while _is_casting_spell and is_inside_tree():
			await get_tree().process_frame
		if not is_inside_tree():
			break

		var payload: Dictionary = _effect_notification_queue.pop_front()
		await _effect_notification.play_effect(
			payload.get("source_card") as Card,
			str(payload.get("effect_name", "")),
			str(payload.get("target_info", "")),
			int(payload.get("magnitude", 0))
		)

	_effect_notification_queue_running = false


func _on_spell_cast(player_id: String, spell_card: Card) -> void:
	_append_log("[Spell] %s cast %s (Cost %d)" % [player_id, spell_card.display_name, spell_card.cost])


func _on_card_drawn(player_id: String, card: Card) -> void:
	if player_id == GameManager.PLAYER:
		_append_log("You drew %s." % card.display_name)
	else:
		_append_log("AI drew a card.")


func _on_spell_scene_requested(player_id: String, card: Card) -> void:
	await _play_spell_scene(player_id, card)


func _build_spell_overlay() -> void:
	_spell_overlay = PanelContainer.new()
	_spell_overlay.name = "SpellSpotlightOverlay"
	_spell_overlay.visible = false
	_spell_overlay.z_index = 95
	_spell_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	_spell_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)

	var scrim_style := StyleBoxFlat.new()
	scrim_style.bg_color = Color(0.04, 0.05, 0.08, 0.78)
	_spell_overlay.add_theme_stylebox_override("panel", scrim_style)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_spell_overlay.add_child(center)

	var box := VBoxContainer.new()
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_theme_constant_override("separation", 14)
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.add_child(box)

	_spell_title_label = Label.new()
	_spell_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_spell_title_label.theme_type_variation = &"GeistTitle"
	_spell_title_label.add_theme_font_size_override("font_size", 14)
	box.add_child(_spell_title_label)

	_spell_card_container = Control.new()
	_spell_card_container.custom_minimum_size = Vector2(180, 260)
	_spell_card_container.mouse_filter = Control.MOUSE_FILTER_IGNORE

	_spell_card_view = CardViewScene.instantiate()
	_spell_card_view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_spell_card_view.custom_minimum_size = Vector2(180, 260)
	_spell_card_container.add_child(_spell_card_view)
	box.add_child(_spell_card_container)

	var desc_panel := PanelContainer.new()
	var desc_style := _panel_style(Palette.BG_MENU_TOPBAR, Palette.BORDER, 8)
	desc_style.content_margin_left = 16
	desc_style.content_margin_right = 16
	desc_style.content_margin_top = 8
	desc_style.content_margin_bottom = 8
	desc_panel.add_theme_stylebox_override("panel", desc_style)
	desc_panel.custom_minimum_size = Vector2(260, 0)

	_spell_desc_label = Label.new()
	_spell_desc_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_spell_desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_spell_desc_label.theme_type_variation = &"GeistBody"
	_spell_desc_label.add_theme_font_size_override("font_size", 12)
	_spell_desc_label.add_theme_color_override("font_color", Palette.TEXT_PRIMARY)
	desc_panel.add_child(_spell_desc_label)
	box.add_child(desc_panel)

	_spell_skip_label = Label.new()
	_spell_skip_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_spell_skip_label.theme_type_variation = &"GeistBody"
	_spell_skip_label.add_theme_font_size_override("font_size", 10)
	_spell_skip_label.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	_spell_skip_label.text = "(Click anywhere or press Space to continue)"
	box.add_child(_spell_skip_label)

	_spell_overlay.gui_input.connect(_on_spell_overlay_gui_input)

	add_child(_spell_overlay)


func _on_spell_overlay_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		_spell_dismiss_requested = true


func _unhandled_input(event: InputEvent) -> void:
	if _is_casting_spell and event.is_pressed():
		_spell_dismiss_requested = true


func _play_spell_scene(player_id: String, card: Card) -> void:
	if card == null or _spell_overlay == null:
		EventBus.spell_scene_finished.emit()
		return

	_is_casting_spell = true
	_spell_dismiss_requested = false
	var is_player := player_id == GameManager.PLAYER
	var accent := Palette.CYAN if is_player else Palette.PURPLE_LIGHT
	var title_text := "✦ YOU ARE CASTING ✦" if is_player else "✦ AI OPPONENT CASTS ✦"

	_spell_title_label.text = title_text
	_spell_title_label.add_theme_color_override("font_color", accent)
	_spell_card_view.set_display_mode(CardView.DisplayMode.FULL)
	_spell_card_view.set_card(card)
	_spell_desc_label.text = card.ability if not card.ability.is_empty() else "(Spell Card)"

	_spell_overlay.visible = true
	_spell_overlay.modulate = Color(1, 1, 1, 0)
	_spell_card_container.pivot_offset = Vector2(90, 130)
	_spell_card_container.scale = Vector2(0.5, 0.5)

	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(_spell_overlay, "modulate", Color(1, 1, 1, 1), 0.22)
	tween.tween_property(_spell_card_container, "scale", Vector2(1.15, 1.15), 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	await tween.finished

	var settle_tween := create_tween()
	settle_tween.tween_property(_spell_card_container, "scale", Vector2.ONE, 0.08)
	await settle_tween.finished

	# Generous read delay (2.2 seconds) with instant skip on click or keypress
	var elapsed := 0.0
	var read_delay := 2.2
	while elapsed < read_delay and not _spell_dismiss_requested:
		await get_tree().process_frame
		elapsed += get_process_delta_time()

	var exit_tween := create_tween()
	exit_tween.set_parallel(true)
	exit_tween.tween_property(_spell_overlay, "modulate", Color(1, 1, 1, 0), 0.18).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	exit_tween.tween_property(_spell_card_container, "scale", Vector2(1.2, 1.2), 0.18).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	await exit_tween.finished

	_spell_overlay.visible = false
	_is_casting_spell = false
	EventBus.spell_scene_finished.emit()


func _on_shield_broken(player_id: String, slot_index: int, card: Card) -> void:
	_append_log("[Shield] %s's %s absorbed incoming damage and broke its barrier!" % [player_id, card.display_name])


func _on_stat_buffed(player_id: String, slot_index: int, card: Card, attack_delta: int, health_delta: int) -> void:
	_append_log("[Buff] %s was buffed! (Now %d ATK / %d HP)" % [card.display_name, card.attack, card.health])


func _on_match_ended(winner: String) -> void:
	_result_overlay.visible = true
	var player_won := winner == GameManager.PLAYER
	var accent := Palette.GEM_LEGENDARY if player_won else Color("#e58a9a")
	_result_label.text = "You win!" if player_won else "You lose."
	_result_reason.text = (
		"AI Opponent's HP reached 0." if player_won
		else "Your HP reached 0."
	)
	_result_label.add_theme_color_override("font_color", accent)
	var result_style := _panel_style(Palette.BG_MENU_TOPBAR, accent, 12)
	result_style.shadow_color = Color(accent.r, accent.g, accent.b, 0.22)
	result_style.shadow_size = 22
	result_style.content_margin_left = 40
	result_style.content_margin_top = 32
	result_style.content_margin_right = 40
	result_style.content_margin_bottom = 28
	_result_card.add_theme_stylebox_override("panel", result_style)

	_end_turn_button.disabled = true
	_play_card_button.disabled = true
	_surrender_button.disabled = true


# ── sidebar: Battle Log / Card Details tabs ───────────────────────

func _show_tab(show_log: bool) -> void:
	_log_scroll.visible = show_log
	_details_scroll.visible = not show_log
	_style_tab(_tab_log_button, show_log)
	_style_tab(_tab_details_button, not show_log)


func _style_tab(button: Button, active: bool) -> void:
	button.add_theme_color_override("font_color", Palette.CYAN if active else Palette.TEXT_DIM)
	var style := StyleBoxFlat.new()
	style.bg_color = Color.TRANSPARENT
	if active:
		style.border_width_bottom = 2
		style.border_color = Palette.CYAN
	button.add_theme_stylebox_override("normal", style)
	button.add_theme_stylebox_override("hover", style)
	button.add_theme_stylebox_override("pressed", style)


func _show_card_details(card: Card) -> void:
	_details_label.show_card(card)


func _inspect_card(card: Card) -> void:
	## Show the card AND flip the sidebar to the details tab, so clicking a
	## card always surfaces what you just clicked.
	_show_card_details(card)
	_show_tab(false)


func _append_log(text: String) -> void:
	_log_label.append_text(text.xml_escape() + "\n")


func _show_state_notice(text: String, accent: Color) -> void:
	_state_notice.visible = true
	_state_notice_label.text = text
	_state_notice_label.add_theme_color_override("font_color", accent)
	var background := accent
	background.a = 0.12
	var border := accent
	border.a = 0.45
	_state_notice.add_theme_stylebox_override("panel", _panel_style(background, border, 6))


func _hide_state_notice() -> void:
	_state_notice.visible = false


func _style_context_menu() -> void:
	_context_menu.add_theme_color_override("font_color", Palette.TEXT_PRIMARY)
	_context_menu.add_theme_color_override("font_hover_color", Palette.TEXT_WHITE)
	_context_menu.add_theme_stylebox_override(
		"panel", _panel_style(Palette.BG_MENU_PANEL, Palette.BORDER_MENU, 8)
	)
	var hover := _panel_style(
		Color(Palette.PURPLE.r, Palette.PURPLE.g, Palette.PURPLE.b, 0.2),
		Color.TRANSPARENT,
		4,
		0
	)
	_context_menu.add_theme_stylebox_override("hover", hover)


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
