class_name EffectNotification
extends PanelContainer
## Read-only presentation for one resolved card effect. Queue ownership stays
## with the hosting screen so this component remains reusable.

const ENTER_DURATION := 0.2
const HOLD_DURATION := 2.2
const EXIT_DURATION := 0.4

const DAMAGE_COLOR := Color("#ef6362")
const HEAL_COLOR := Color("#4ccf85")
const BUFF_COLOR := Color("#a975fc")
const DRAW_COLOR := Color("#00d4ff")
const SHIELD_COLOR := Color("#f4c846")
const UNKNOWN_COLOR := Color("#8b5cf6")

@onready var _accent_bar: ColorRect = %AccentBar
@onready var _thumbnail: PanelContainer = %Thumbnail
@onready var _art_texture: TextureRect = %ArtTexture
@onready var _art_fallback: Label = %ArtFallback
@onready var _trigger_label: Label = %TriggerLabel
@onready var _source_label: Label = %SourceLabel
@onready var _target_label: Label = %TargetLabel
@onready var _effect_pill: PanelContainer = %EffectPill
@onready var _effect_pill_label: Label = %EffectPillLabel

var _source_card: Card = null
var _animation_tween: Tween = null
var _playback_generation: int = 0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	visible = false
	modulate = Color(1, 1, 1, 0)
	ArtLoader.texture_loaded.connect(_on_art_texture_loaded)


func _exit_tree() -> void:
	_playback_generation += 1
	if _animation_tween != null and _animation_tween.is_valid():
		_animation_tween.kill()
	_animation_tween = null
	_source_card = null


func play_effect(source_card: Card, effect_name: String, target_info: String, magnitude: int) -> void:
	## Displays exactly the supplied payload; gameplay state is never changed.
	_playback_generation += 1
	var generation := _playback_generation
	if _animation_tween != null and _animation_tween.is_valid():
		_animation_tween.kill()

	_apply_payload(source_card, effect_name, target_info, magnitude)
	visible = true
	await get_tree().process_frame
	if not is_inside_tree() or generation != _playback_generation:
		return

	var rest_y := position.y
	pivot_offset = size / 2.0
	position.y = rest_y - 18.0
	scale = Vector2(0.96, 0.96)
	modulate = Color(1, 1, 1, 0)

	_animation_tween = create_tween()
	_animation_tween.set_parallel(true)
	_animation_tween.tween_property(self, "position:y", rest_y, ENTER_DURATION) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	_animation_tween.tween_property(self, "scale", Vector2.ONE, ENTER_DURATION) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	_animation_tween.tween_property(self, "modulate", Color.WHITE, ENTER_DURATION) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await _animation_tween.finished
	if not is_inside_tree() or generation != _playback_generation:
		return

	await get_tree().create_timer(HOLD_DURATION).timeout
	if not is_inside_tree() or generation != _playback_generation:
		return

	_animation_tween = create_tween()
	_animation_tween.set_parallel(true)
	_animation_tween.tween_property(self, "position:y", rest_y - 8.0, EXIT_DURATION) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	_animation_tween.tween_property(self, "scale", Vector2(0.98, 0.98), EXIT_DURATION) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	_animation_tween.tween_property(self, "modulate", Color(1, 1, 1, 0), EXIT_DURATION) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	await _animation_tween.finished
	if not is_inside_tree() or generation != _playback_generation:
		return

	_animation_tween = null
	visible = false
	position.y = rest_y
	scale = Vector2.ONE
	modulate = Color.WHITE
	_source_card = null


func _apply_payload(source_card: Card, effect_name: String, target_info: String, magnitude: int) -> void:
	_source_card = source_card
	var category := _category_for(effect_name)
	var accent := _color_for(category)
	var display_effect := effect_name.strip_edges().replace("_", " ").to_upper()
	if display_effect.is_empty():
		display_effect = "UNKNOWN EFFECT"

	_trigger_label.text = "EFFECT TRIGGERED"
	_source_label.text = source_card.display_name if source_card != null else "Unknown Source"
	_target_label.text = _format_description(display_effect, target_info, magnitude)
	_effect_pill_label.text = category
	_apply_accent(accent)
	_apply_artwork(source_card)


func _apply_artwork(source_card: Card) -> void:
	var texture: ImageTexture = null
	if source_card != null:
		texture = source_card.art_texture()
	_art_texture.texture = texture
	_art_texture.visible = texture != null
	_art_fallback.visible = texture == null


func _on_art_texture_loaded(source: String, texture: ImageTexture) -> void:
	if _source_card != null and _source_card.artwork == source:
		_art_texture.texture = texture
		_art_texture.visible = true
		_art_fallback.visible = false


func _apply_accent(accent: Color) -> void:
	_accent_bar.color = accent
	_trigger_label.add_theme_color_override(
		"font_color", Color(accent.r, accent.g, accent.b, 0.75)
	)
	_art_fallback.add_theme_color_override(
		"font_color", Color(accent.r, accent.g, accent.b, 0.35)
	)
	_effect_pill_label.add_theme_color_override(
		"font_color", Color(accent.r, accent.g, accent.b, 0.9)
	)

	var notification_style := get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	notification_style.shadow_color = Color(accent.r, accent.g, accent.b, 0.12)
	notification_style.shadow_size = 16
	add_theme_stylebox_override("panel", notification_style)

	var thumbnail_style := StyleBoxFlat.new()
	thumbnail_style.bg_color = Color("#1a1c38")
	thumbnail_style.border_color = Color(accent.r, accent.g, accent.b, 0.3)
	thumbnail_style.set_border_width_all(1)
	thumbnail_style.set_corner_radius_all(4)
	_thumbnail.add_theme_stylebox_override("panel", thumbnail_style)

	var pill_style := StyleBoxFlat.new()
	pill_style.bg_color = Color(accent.r, accent.g, accent.b, 0.15)
	pill_style.border_color = Color(accent.r, accent.g, accent.b, 0.3)
	pill_style.set_border_width_all(1)
	pill_style.set_corner_radius_all(4)
	pill_style.content_margin_left = 8
	pill_style.content_margin_right = 8
	pill_style.content_margin_top = 3
	pill_style.content_margin_bottom = 3
	_effect_pill.add_theme_stylebox_override("panel", pill_style)


func _format_description(effect_display: String, target_info: String, magnitude: int) -> String:
	var parts: Array[String] = [effect_display]
	var clean_target := target_info.strip_edges()
	if not clean_target.is_empty():
		parts.append(clean_target)
	if magnitude != 0 and not _contains_magnitude(clean_target, magnitude):
		parts.append(str(magnitude))
	return " · ".join(parts)


func _contains_magnitude(text: String, magnitude: int) -> bool:
	if text.is_empty():
		return false
	var pattern := "(^|[^0-9])[-+]?%d([^0-9]|$)" % abs(magnitude)
	var regex := RegEx.new()
	if regex.compile(pattern) != OK:
		return false
	return regex.search(text) != null


func _category_for(effect_name: String) -> String:
	var normalized := effect_name.strip_edges().to_lower()
	if normalized.begins_with("damage_") or normalized.begins_with("destroy_"):
		return "DAMAGE"
	if normalized.begins_with("heal_"):
		return "HEAL"
	if normalized.begins_with("buff_") or normalized.begins_with("debuff_"):
		return "BUFF"
	if normalized.begins_with("draw_"):
		return "DRAW"
	if normalized.begins_with("shield_") or normalized == "grant_shield":
		return "SHIELD"
	return "UNKNOWN"


func _color_for(category: String) -> Color:
	match category:
		"DAMAGE":
			return DAMAGE_COLOR
		"HEAL":
			return HEAL_COLOR
		"BUFF":
			return BUFF_COLOR
		"DRAW":
			return DRAW_COLOR
		"SHIELD":
			return SHIELD_COLOR
		_:
			return UNKNOWN_COLOR
