class_name Card
extends RefCounted
## One trading card, parsed from the backend's v0.8 card JSON shape
## (see backend/app/agent/tools.py::export_card_for_frontend).

var id: String = ""
var rarity: String = "common"
var tags: Array = []

# gameplay
var cost: int = 0
var attack: int = 0
var defense: int = 0
var health: int = 0
var max_health: int = 0
var element: String = ""
var faction: String = ""

# content
var display_name: String = ""
var ability: String = ""
var flavor: String = ""
var type_line: String = "Creature"
var artwork: String = ""

# structured gameplay abilities
var keywords: Array[String] = []
var effects: Array[Dictionary] = []

var raw: Dictionary = {} 

## Runtime-only battle state (not part of the backend payload).
var instance_id: String = ""
var is_tapped: bool = false
var has_shield: bool = false
var is_stunned: bool = false

## Summoning sickness: a creature played this turn can't attack until the
## start of its controller's next turn — i.e. the opponent gets a turn to
## respond first. Cleared by GameManager._begin_turn().
var is_summoning_sick: bool = false

## Decoded lazily from `artwork` and cached so repeated CardView rebuilds
## (BoardSlot recreates its CardView on every refresh) don't re-decode the
## same base64 image over and over.
var _art_texture: ImageTexture = null
var _art_texture_attempted: bool = false


static func from_dict(data: Dictionary) -> Card:
	var card := Card.new()
	card.raw = data
	card.id = str(data.get("id", ""))
	card.rarity = str(data.get("rarity", "common"))
	card.tags = data.get("tags", [])

	var gameplay: Dictionary = data.get("gameplay", {})
	card.cost = int(gameplay.get("cost", data.get("cost", 0)))
	card.attack = int(gameplay.get("attack", data.get("attack", 0)))
	card.defense = int(gameplay.get("defense", data.get("defense", 0)))
	card.health = int(gameplay.get("health", data.get("health", 0)))
	card.max_health = card.health
	card.element = str(gameplay.get("element", data.get("element", "")))
	card.faction = str(gameplay.get("faction", data.get("faction", "")))

	var content: Dictionary = data.get("content", {})
	card.display_name = str(content.get("name", data.get("name", "Unknown")))
	card.ability = str(content.get("ability", data.get("ability", "")))
	var raw_type = content.get("typeLine", content.get("type_line", data.get("type_line", data.get("type", "Creature"))))
	card.type_line = str(raw_type)
	var raw_art = content.get("artwork", data.get("artwork", ""))
	card.artwork = str(raw_art)

	# Parse keywords
	var raw_kw = data.get("keywords", gameplay.get("keywords", []))
	if raw_kw is Array:
		for k in raw_kw:
			card.keywords.append(str(k))
	for t in card.tags:
		var st := str(t)
		if not card.keywords.has(st):
			card.keywords.append(st)

	## Keyword detection from ability text runs unconditionally. It used to
	## live inside _quantify_ability_text(), which only ran when the payload
	## carried no structured effects — so a card that shipped effects but
	## said "Taunt:" in its text silently lost Taunt.
	card._parse_keywords_from_text()

	# Parse effects
	var raw_eff = data.get("effects", gameplay.get("effects", []))
	if raw_eff is Array and not raw_eff.is_empty():
		for e in raw_eff:
			if e is Dictionary:
				card.effects.append(e)
	else:
		## Legacy/offline fallback only. The API is the source of truth —
		## backend/app/agent/tools.py::_extract_and_quantify_effects fills
		## `effects` for anything fetched over HTTP, and this mirrors its
		## vocabulary for local JSON that never went through the API.
		card._quantify_ability_text()

	if card.has_shield_keyword():
		card.has_shield = true

	card.instance_id = card.id + "_" + str(randi())
	return card


func _parse_keywords_from_text() -> void:
	if ability.is_empty():
		return
	var lower := ability.to_lower()
	_add_keyword_if(lower, "\\b(taunt|guard|lure)\\b", "Taunt")
	_add_keyword_if(lower, "\\b(rush|charge|swift|haste)\\b", "Rush")
	_add_keyword_if(lower, "\\b(shield|barrier|ward|divine shield)\\b", "Shield")
	_add_keyword_if(lower, "\\b(deathrattle|on death|when destroyed|when dies|spawns?\\b[^.]*?\\bon death)\\b", "Deathrattle")
	_add_keyword_if(lower, "\\b(battlecry|on play|when played)\\b", "Battlecry")
	_add_keyword_if(lower, "\\b(solid|immune to stun|cannot be stunned)\\b", "Solid")


func _add_keyword_if(lower: String, pattern: String, keyword: String) -> void:
	var re := RegEx.new()
	if re.compile(pattern) != OK:
		return
	if re.search(lower) != null and not keywords.has(keyword):
		keywords.append(keyword)


static func _match(lower: String, pattern: String) -> RegExMatch:
	var re := RegEx.new()
	if re.compile(pattern) != OK:
		return null
	return re.search(lower)


func _detect_trigger(lower: String) -> String:
	## "until end of turn" states how long an effect lasts, not when it
	## fires — stripping it stops abilities like "all creatures lose 2
	## attack until end of turn" being mis-filed as on_turn_end.
	var scrubbed := lower
	var duration := _match(lower, "\\buntil\\s+(?:the\\s+)?end\\s+of\\s+(?:your\\s+)?turn\\b")
	if duration != null:
		scrubbed = lower.replace(duration.get_string(0), " ")

	if _match(scrubbed, "\\b(?:on|upon)\\s+enemy\\s+death|when\\s+(?:destroying|an\\s+enemy\\s+dies)\\b") != null:
		return "on_enemy_death"
	if has_keyword("Deathrattle") or _match(scrubbed, "\\b(?:on death|when destroyed|when dies|deathrattle)\\b") != null:
		return "on_death"
	if _match(scrubbed, "\\b(?:when\\s+)?(?:block(?:s|ing|ed)?|attacked|taking damage|damaged)|(?:to|burns?|poisons?)\\s+(?:melee\\s+)?attackers?\\b") != null:
		return "on_defend"
	if _match(scrubbed, "\\b(attacks|on attack|when attacking|strikes)\\b") != null:
		return "on_attack"
	if _match(scrubbed, "\\b(?:start of (?:your |each )?turn|each turn|every turn)\\b") != null:
		return "on_turn_start"
	if _match(scrubbed, "\\bend of (?:your )?turn\\b") != null:
		return "on_turn_end"
	return "on_play"


func _detect_condition(lower: String) -> String:
	var m := _match(lower, "\\bif\\s+(?:the\\s+)?opponent\\s+has\\s+(\\d+)\\+?\\s+cards?\\s+in\\s+hand\\b")
	if m != null:
		return "enemy_hand_at_least:%s" % m.get_string(1)
	m = _match(lower, "\\bif\\s+you\\s+have\\s+(\\d+)\\+?\\s+cards?\\s+in\\s+hand\\b")
	if m != null:
		return "friendly_hand_at_least:%s" % m.get_string(1)
	m = _match(lower, "\\bif\\s+(?:the\\s+)?opponent\\s+(?:controls|has)\\s+(\\d+)\\+?\\s+(?:creatures?|minions?)\\b")
	if m != null:
		return "enemy_board_at_least:%s" % m.get_string(1)
	m = _match(lower, "\\bif\\s+you\\s+(?:control|have)\\s+(\\d+)\\+?\\s+(?:creatures?|minions?)\\b")
	if m != null:
		return "friendly_board_at_least:%s" % m.get_string(1)
	return ""


func _detect_friendly_target(lower: String) -> String:
	if _match(lower, "\\b(all|other|your)\\b[^.]*\\b(creatures?|minions?|units?|allies)\\b") != null:
		return "all_friendly"
	return "friendly_creature"


func _quantify_ability_text() -> void:
	if ability.is_empty():
		return
	var lower := ability.to_lower()
	var trigger := "on_play" if is_spell() else _detect_trigger(lower)
	var condition := _detect_condition(lower)
	var friendly_target := _detect_friendly_target(lower)

	# 1. Removal / Direct Damage / Board Control
	var m_destroy_all := _match(lower, "\\b(?:destroy|banish|obliterate|wipe)\\b[^.]*\\ball\\b")
	var m_destroy := _match(lower, "\\b(?:destroy|banish|annihilate)\\b")
	var m_bounce := _match(lower, "\\breturn\\b[^.]*\\bto\\b[^.]*\\bhand\\b")
	var m_split := _match(lower, "(?:deals?|inflicts?|causes?)\\s+(\\d+)\\s+damage\\s+split")
	var m_dmg_face := _match(lower, "(?:deals?|inflicts?|causes?)\\s+(\\d+)\\s*(?:direct\\s+)?damage\\s+to\\s+(?:the\\s+)?(?:opponent|enemy\\s+(?:leader|player|hero|face)|face)")
	var m_dmg_all := _match(lower, "(?:deals?|inflicts?|causes?|damages?)\\s+(\\d+)?\\s*(?:damage\\s+)?(?:to\\s+all|across\\s+all|all\\s+(?:enemy|enemies|creatures|minions|non-))")
	var m_dmg := _match(lower, "(?:deals?|inflicts?|causes?|burns?|poisons?)\\s+(?:(?:target|attacker)\\s+(?:for\\s+)?)?(\\d+)\\s*(?:damage|fire\\s+damage)?")
	var m_stun := _match(lower, "\\b(?:stun|stuns|freeze|freezes|snare|snares|restrain|restrains|blind|blinds)\\b")
	var m_shuffle := _match(lower, "\\b(?:reshuffle|shuffle)\\b[^.]*?\\b(?:deck|decks)\\b")

	if m_destroy_all != null:
		_add_effect(trigger, "destroy_all_enemies", 1, "all_enemies", condition)
	elif m_destroy != null:
		_add_effect(trigger, "destroy_creature", 1, "enemy_creature", condition)
	elif m_bounce != null:
		_add_effect(trigger, "return_to_hand", 1, "enemy_creature", condition)
	elif m_split != null:
		_add_effect(trigger, "damage_split", int(m_split.get_string(1)), "all_enemies", condition)
	elif m_dmg_face != null:
		_add_effect(trigger, "damage_face", int(m_dmg_face.get_string(1)), "enemy_face", condition)
	elif m_dmg_all != null:
		var mag := int(m_dmg_all.get_string(1)) if not m_dmg_all.get_string(1).is_empty() else 2
		_add_effect(trigger, "damage_all_enemies", mag, "all_enemies", condition)
	elif m_dmg != null:
		_add_effect(trigger, "damage_creature", int(m_dmg.get_string(1)), "enemy_creature", condition)

	if m_stun != null:
		var stun_turns := 1
		var m_turns := _match(lower, "(\\d+)\\s+turns?")
		if m_turns != null:
			stun_turns = int(m_turns.get_string(1))
		_add_effect(trigger, "stun_creature", max(1, stun_turns), "enemy_creature", condition)

	if m_shuffle != null:
		_add_effect(trigger, "shuffle_board_to_deck", 1, "all", condition)

	# 2. Healing
	var m_heal := _match(lower, "(?:heals?|restores?)\\s+(?:allies\\s+|allied\\s+creatures\\s+|all\\s+allies\\s+)?(\\d+)")
	if m_heal != null:
		if _match(lower, "\\b(creature|minion|unit|ally|allies|allied|this|friendly)\\b") != null:
			_add_effect(trigger, "heal_creature", int(m_heal.get_string(1)), "friendly_creature", condition)
		else:
			_add_effect(trigger, "heal_face", int(m_heal.get_string(1)), "friendly_face", condition)

	# 3. Card Draw (supports "draw a card", "draws a card", "draw 2 cards", "draws 2", "draw cards", etc.)
	var m_draw := _match(lower, "\\bdraw(?:s)?\\s+(?:(\\d+)|a|an|one|two|three|four)?\\s*cards?\\b")
	var m_draw_short := _match(lower, "\\bdraw(?:s)?\\s+(\\d+)\\b")
	if m_draw != null or m_draw_short != null:
		var draw_count := 1
		if m_draw != null:
			var num_str := m_draw.get_string(1)
			if not num_str.is_empty():
				draw_count = int(num_str)
			else:
				var matched_full := m_draw.get_string(0)
				if matched_full.contains("two"):
					draw_count = 2
				elif matched_full.contains("three"):
					draw_count = 3
				elif matched_full.contains("four"):
					draw_count = 4
				else:
					draw_count = 1
		elif m_draw_short != null:
			draw_count = int(m_draw_short.get_string(1))
		_add_effect(trigger, "draw_card", max(1, draw_count), "self", condition)
	elif _match(lower, "\\bdraw(?:s)?\\b") != null:
		var draw_count := 2 if cost >= 4 else 1
		_add_effect(trigger, "draw_card", draw_count, "self", condition)

	# 4. Buffs and Shields
	var m_buff_both := _match(lower, "\\+(\\d+)\\s*/\\s*\\+(\\d+)")
	var m_buff_atk := _match(lower, "(?:\\+|plus\\s+|gains?\\s+)(\\d+)\\s+(?:attack|atk|power)")
	var m_buff_def := _match(lower, "(?:\\+|plus\\s+|gains?\\s+)(\\d+)\\s+(?:defense|def|health|hp)")
	var m_shield_ally := _match(lower, "\\b(?:grant|grants|give|gives|gain|gains)\\b[^.]*?\\b(?:shield|barrier|ward)\\b")
	if m_buff_both != null:
		_add_effect(trigger, "buff_attack", int(m_buff_both.get_string(1)), friendly_target, condition)
		_add_effect(trigger, "buff_health", int(m_buff_both.get_string(2)), friendly_target, condition)
	elif m_buff_atk != null:
		_add_effect(trigger, "buff_attack", int(m_buff_atk.get_string(1)), friendly_target, condition)
	elif m_buff_def != null:
		_add_effect(trigger, "buff_health", int(m_buff_def.get_string(1)), friendly_target, condition)
	if m_shield_ally != null and m_buff_def == null:
		_add_effect(trigger, "grant_shield", 1, "friendly_creature", condition)

	# 5. Debuffs
	var m_debuff_by := _match(lower, "\\b(?:lose|lowers?|reduces?|weakens?)\\s+(?:the\\s+)?(?:attack|atk|power)\\b[^.]*?\\bby\\s+(\\d+)")
	var m_debuff := _match(lower, "\\b(?:lose|lowers?|reduces?|weakens?)\\b[^.]*?(\\d+)\\s*(?:attack|atk|power)")
	if m_debuff_by != null:
		var scope := "all_enemies" if lower.contains("all") else "enemy_creature"
		_add_effect(trigger, "debuff_attack", int(m_debuff_by.get_string(1)), scope, condition)
	elif m_debuff != null:
		var scope := "all_enemies" if lower.contains("all") else "enemy_creature"
		_add_effect(trigger, "debuff_attack", int(m_debuff.get_string(1)), scope, condition)

	# 6. Summoning
	var m_summon := _match(lower, "\\b(?:summon|spawn)s?\\b[^.]*?(\\d+)\\s*/\\s*(\\d+)")
	var m_summon_plain := _match(lower, "\\b(?:summon|spawn)s?\\b")
	if m_summon != null:
		_add_effect(trigger, "summon_creature", int(m_summon.get_string(1)), "self", condition)
	elif m_summon_plain != null:
		_add_effect(trigger, "summon_creature", max(1, int(cost / 2)), "self", condition)

	# 7. Fallbacks only if NO effects have been added yet
	if effects.is_empty():
		if lower.contains("damage") or lower.contains("deal") or lower.contains("strike") or lower.contains("burn"):
			var mag: int = max(1, cost + 1) if is_spell() else max(1, int(cost / 2))
			var is_all: bool = lower.contains("all")
			var is_face: bool = lower.contains("opponent") or lower.contains("leader") or lower.contains("face")
			if is_all:
				_add_effect(trigger, "damage_all_enemies", mag, "all_enemies", condition)
			elif is_face:
				_add_effect(trigger, "damage_face", mag, "enemy_face", condition)
			else:
				_add_effect(trigger, "damage_creature", mag, "enemy_creature", condition)
		elif lower.contains("heal") or lower.contains("restore"):
			if _match(lower, "\\b(creature|minion|unit|ally|allied|this|friendly)\\b") != null:
				_add_effect(trigger, "heal_creature", max(1, cost), "friendly_creature", condition)
			else:
				_add_effect(trigger, "heal_face", max(2, cost * 2), "friendly_face", condition)
		elif lower.contains("draw"):
			_add_effect(trigger, "draw_card", 2 if cost >= 4 else 1, "self", condition)
		elif lower.contains("buff") or lower.contains("boost") or lower.contains("empower"):
			_add_effect(trigger, "buff_attack", 1, friendly_target, condition)



func _add_effect(trigger: String, effect_type: String, magnitude: int, target: String, condition: String) -> void:
	effects.append({
		"trigger": trigger,
		"effect_type": effect_type,
		"magnitude": max(1, magnitude),
		"target": target,
		"condition": condition,
	})



func duplicate_instance() -> Card:
	## Returns a fresh battle-ready copy so drawing the same card id twice
	## (e.g. two copies in a deck) doesn't share mutable state.
	var copy := Card.from_dict(raw)
	copy.health = health
	copy.max_health = max_health
	return copy


func power() -> int:
	return attack + defense


func is_alive() -> bool:
	return health > 0


func is_spell() -> bool:
	return type_line.strip_edges().to_lower() == "spell"


func has_keyword(kw: String) -> bool:
	for k in keywords:
		if k.to_lower() == kw.to_lower():
			return true
	return false


func has_taunt() -> bool:
	return has_keyword("Taunt") or has_keyword("Guard") or has_keyword("Lure")


func has_rush() -> bool:
	return has_keyword("Rush") or has_keyword("Charge") or has_keyword("Swift") or has_keyword("Haste")


func has_shield_keyword() -> bool:
	return has_keyword("Shield") or has_keyword("Barrier") or has_keyword("Ward") or has_keyword("Divine Shield")


func has_solid() -> bool:
	return has_keyword("Solid") or display_name.to_lower().contains("basalt golem")


func get_effects_for_trigger(trigger_name: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for eff in effects:
		if str(eff.get("trigger", "")).to_lower() == trigger_name.to_lower():
			result.append(eff)
	return result


func rarity_color() -> Color:
	return Palette.rarity_color(rarity)



func art_texture() -> ImageTexture:
	## Retrieves cached artwork texture via ArtLoader (supports Pollinations AI
	## URLs, web URLs, base64 data URIs, and local file paths).
	if _art_texture != null:
		return _art_texture
	if artwork.is_empty():
		return null

	var tex: ImageTexture = ArtLoader.get_texture(artwork)
	if tex != null:
		_art_texture = tex
	return _art_texture


func to_summary() -> String:
	return "%s (%d/%d/%d, cost %d)" % [display_name, attack, defense, health, cost]


func get_targeted_scope() -> String:
	## Returns "enemy_creature", "friendly_creature", or "" if no single-target effect
	for eff in effects:
		var target: String = str(eff.get("target", "")).to_lower()
		if target == "enemy_creature":
			return "enemy_creature"
		if target == "friendly_creature":
			return "friendly_creature"
	return ""
