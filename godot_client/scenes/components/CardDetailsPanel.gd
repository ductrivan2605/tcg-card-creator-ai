class_name CardDetailsPanel
extends VBoxContainer
## The sidebar's CARD DETAILS tab, matching Figma's
## "selected-card-detailed-view": a bordered art preview, name + cost,
## type/rarity pills, then the ability and flavor blocks.

@onready var _art_frame: PanelContainer = %ArtFrame
@onready var _art_texture: TextureRect = %ArtTexture
@onready var _art_placeholder: Label = %ArtPlaceholder
@onready var _name_label: Label = %NameLabel
@onready var _cost_label: Label = %CostLabel
@onready var _type_pill: PanelContainer = %TypePill
@onready var _type_label: Label = %TypeLabel
@onready var _rarity_pill: PanelContainer = %RarityPill
@onready var _rarity_label: Label = %RarityLabel
@onready var _ability_title: Label = %AbilityTitle
@onready var _ability_body: Label = %AbilityBody
@onready var _flavor_body: Label = %FlavorBody
@onready var _content: VBoxContainer = %Content
@onready var _empty_label: Label = %EmptyLabel


var _current_card: Card = null


func _ready() -> void:
	clear()
	ArtLoader.texture_loaded.connect(_on_art_texture_loaded)


func _on_art_texture_loaded(source: String, tex: ImageTexture) -> void:
	if _current_card != null and _current_card.artwork == source:
		_art_texture.texture = tex
		_art_texture.visible = true
		_art_placeholder.visible = false


func clear() -> void:
	_current_card = null
	_content.visible = false
	_empty_label.visible = true


func show_card(card: Card) -> void:
	_current_card = card
	if card == null:
		clear()
		return
	_content.visible = true
	_empty_label.visible = false

	var texture := card.art_texture()
	_art_texture.texture = texture
	_art_texture.visible = texture != null
	_art_placeholder.visible = texture == null

	_name_label.text = card.display_name
	_cost_label.text = "Cost: %d" % card.cost

	_type_label.text = card.type_line
	_tint_pill(_type_pill, _type_label, Palette.CYAN)

	var rarity_color := Palette.rarity_gem_color(card.rarity)
	_rarity_label.text = "%s Rarity" % card.rarity.capitalize()
	_tint_pill(_rarity_pill, _rarity_label, rarity_color)

	if card.ability != "":
		_ability_title.text = "ABILITY: %s" % _ability_headline(card.ability)
		_ability_body.text = _ability_detail(card.ability)
		_ability_title.visible = true
		_ability_body.visible = true
	else:
		_ability_title.visible = false
		_ability_body.visible = false

	_flavor_body.text = card.flavor
	_flavor_body.get_parent().visible = card.flavor != ""


func _tint_pill(pill: PanelContainer, label: Label, color: Color) -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(color.r, color.g, color.b, 0.13)
	style.set_corner_radius_all(4)
	style.content_margin_left = 8
	style.content_margin_right = 8
	style.content_margin_top = 3
	style.content_margin_bottom = 3
	pill.add_theme_stylebox_override("panel", style)
	label.add_theme_color_override("font_color", color)


func _ability_headline(ability: String) -> String:
	## Backend abilities usually read "**Swarm**: rest of the text" or
	## "Swarm: rest of the text" — pull the keyword out for the title row
	## so it matches Figma's "ABILITY: CRYSTAL RESONANCE" treatment.
	var colon := ability.find(":")
	if colon == -1 or colon > 40:
		return "EFFECT"
	return ability.substr(0, colon).replace("*", "").strip_edges().to_upper()


func _ability_detail(ability: String) -> String:
	var colon := ability.find(":")
	if colon == -1 or colon > 40:
		return ability.replace("*", "")
	return ability.substr(colon + 1).replace("*", "").strip_edges()
