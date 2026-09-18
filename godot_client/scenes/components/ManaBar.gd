class_name ManaBar
extends PanelContainer
## Player/opponent status panel matching Figma's "opponent-status" /
## "player-status": avatar, name + deck/discard counts, HP bar, mana gems.

@export var player_id: String = "player"
@export var display_name: String = "Player"

@onready var _avatar: PanelContainer = %Avatar
@onready var _name_label: Label = %NameLabel
@onready var _deck_count_label: Label = %DeckCountLabel
@onready var _discard_count_label: Label = %DiscardCountLabel
@onready var _hp_label: Label = %HpLabel
@onready var _hp_fill: ColorRect = %HpFill
@onready var _mana_gems: ManaGemRow = %ManaGems


func _ready() -> void:
	_name_label.text = display_name.to_upper()

	var avatar_style := StyleBoxFlat.new()
	avatar_style.bg_color = Palette.CYAN if player_id == GameManager.PLAYER else Palette.GOLD
	avatar_style.set_corner_radius_all(20)
	avatar_style.border_color = Palette.BORDER
	avatar_style.set_border_width_all(2)
	_avatar.add_theme_stylebox_override("panel", avatar_style)

	EventBus.stats_changed.connect(_on_stats_changed)
	EventBus.board_changed.connect(_refresh_counts)
	EventBus.hand_changed.connect(func(_id): _refresh_counts())
	_refresh_counts()


func _on_stats_changed(id: String, hp: int, max_hp: int, mana: int, max_mana: int) -> void:
	if id != player_id:
		return
	set_stats(hp, max_hp, mana, max_mana)


func set_stats(hp: int, max_hp: int, mana: int, max_mana: int) -> void:
	_hp_label.text = "%d/%d" % [hp, max_hp]
	## Driven by anchor_right (a 0..1 fraction of the track's actual width)
	## rather than a pixel width, so it can never overshoot the track no
	## matter how wide the panel ends up being at layout time.
	var ratio := 0.0 if max_hp <= 0 else clampf(float(hp) / float(max_hp), 0.0, 1.0)
	create_tween().tween_property(_hp_fill, "anchor_right", ratio, 0.35).set_trans(Tween.TRANS_CUBIC)
	_mana_gems.set_gems(mana, max_mana)


func _refresh_counts() -> void:
	var state := GameManager.get_state(player_id)
	if state == null:
		return
	_deck_count_label.text = str(state.draw_pile.size())
	_discard_count_label.text = str(state.discard_pile.size())
