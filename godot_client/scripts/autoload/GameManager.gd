extends Node
## Autoload singleton: authoritative match state for the battle arena.
## Scenes never mutate hand/board/hp directly — they call these methods and
## react to EventBus signals, keeping BattleArena a pure view layer.

## Single row of 4 lanes per side, matching the Figma battle-arena-default
## frame's "opponent-battlefield"/"player-battlefield" (4 battlefield-slot
## children each) — any card type can occupy any lane.
const BOARD_SIZE := 4
const START_HP := 20
const START_HAND := 4

## Mana ramp: everyone opens on START_MANA and gains 1 more every
## MANA_RAMP_EVERY of their own turns, capped at MAX_MANA.
const START_MANA := 3
const MANA_RAMP_EVERY := 2
const MAX_MANA := 10

const PLAYER := "player"
const ENEMY := "enemy"

## Setup/Combat is a display label, not a hard gate — Figma's action bar
## shows PLAY CARD and END TURN at the same time with no separate "advance
## phase" control, so both playing cards and attacking are always legal on
## your turn. The phase just flips SETUP -> COMBAT automatically the first
## time you attack this turn, matching the log wording ("Turn 3 · Combat
## Phase") without blocking anything.
enum Phase { SETUP, COMBAT }


class PlayerState:
	var id: String = ""
	var hp: int = START_HP
	var max_hp: int = START_HP
	var mana: int = 0
	var max_mana: int = 0
	var turns_taken: int = 0
	var draw_pile: Array[Card] = []
	var hand: Array[Card] = []
	var board: Array = []       # Array[Card] sized BOARD_SIZE, null = empty slot
	var discard_pile: Array[Card] = []

	func _init(player_id: String) -> void:
		id = player_id
		board.resize(BOARD_SIZE)


var states: Dictionary = {}          # id -> PlayerState
var turn_number: int = 0
var current_turn: String = PLAYER
var current_phase: Phase = Phase.SETUP
var match_active: bool = false

## Handoff slot: MainMenu sets this after loading/building a deck so
## DeckViewer and BattleArena can pick it up without a dedicated
## scene-transition-args mechanism.
var loaded_deck: Deck = null


func start_match(player_deck: Deck, enemy_deck: Deck) -> void:
	states = {
		PLAYER: PlayerState.new(PLAYER),
		ENEMY: PlayerState.new(ENEMY),
	}
	states[PLAYER].draw_pile = player_deck.build_draw_pile()
	states[ENEMY].draw_pile = enemy_deck.build_draw_pile()

	turn_number = 0
	match_active = true

	for id in [PLAYER, ENEMY]:
		for i in range(START_HAND):
			_draw_card(id)

	EventBus.match_started.emit()
	_emit_stats(PLAYER)
	_emit_stats(ENEMY)
	EventBus.hand_changed.emit(PLAYER)
	EventBus.hand_changed.emit(ENEMY)

	_begin_turn(PLAYER)


func get_state(id: String) -> PlayerState:
	return states.get(id)


func opponent_of(id: String) -> String:
	return ENEMY if id == PLAYER else PLAYER


# ── turn flow ────────────────────────────────────────────────────

func _begin_turn(id: String) -> void:
	if not match_active:
		return
	current_turn = id
	turn_number += 1

	var state: PlayerState = states[id]
	state.turns_taken += 1
	## Own-turn count drives the ramp, so both players follow the same
	## curve regardless of who moves first: turns 1-2 -> 3 mana,
	## turns 3-4 -> 4, turns 5-6 -> 5, and so on.
	state.max_mana = min(MAX_MANA, START_MANA + (state.turns_taken - 1) / MANA_RAMP_EVERY)
	state.mana = state.max_mana
	for card in state.board:
		if card != null:
			if card.is_stunned:
				card.is_stunned = false
				card.is_tapped = true
			else:
				card.is_tapped = false
			card.is_summoning_sick = false

	_draw_card(id)
	current_phase = Phase.SETUP
	_emit_stats(id)
	EventBus.turn_started.emit(id, turn_number)
	EventBus.phase_changed.emit(id, current_phase)

	# Trigger On-Turn-Start effects
	for card in state.board:
		if card != null:
			for eff in card.get_effects_for_trigger("on_turn_start"):
				_resolve_effect(eff, card, id)


func end_turn(id: String) -> void:
	if not match_active or current_turn != id:
		return
	var state: PlayerState = states[id]
	# Trigger On-Turn-End effects
	for card in state.board:
		if card != null:
			for eff in card.get_effects_for_trigger("on_turn_end"):
				_resolve_effect(eff, card, id)

	EventBus.turn_ended.emit(id)
	_begin_turn(opponent_of(id))



# ── card flow ────────────────────────────────────────────────────

func _draw_card(id: String) -> void:
	var state: PlayerState = states[id]
	if state.draw_pile.is_empty():
		return
	var card: Card = state.draw_pile.pop_back()
	state.hand.append(card)
	EventBus.card_drawn.emit(id, card)
	EventBus.hand_changed.emit(id)


func can_play_card(id: String, card: Card) -> bool:
	var state: PlayerState = states[id]
	if current_turn != id or state.mana < card.cost:
		return false
	if card.is_spell():
		return true
	return _first_empty_slot(state) != -1


func play_card(id: String, card: Card, slot_index: int = -1, target_slot: int = -1) -> bool:
	var state: PlayerState = states[id]
	if current_turn != id or state.mana < card.cost:
		return false

	var hand_idx := state.hand.find(card)
	if hand_idx == -1:
		return false

	# 1. Spell Card Resolution (Instant cast & discard)
	if card.is_spell():
		state.hand.remove_at(hand_idx)
		state.mana -= card.cost
		state.discard_pile.append(card)

		EventBus.spell_cast.emit(id, card)
		for eff in _entry_effects(card):
			_resolve_effect(eff, card, id, target_slot if target_slot != -1 else slot_index)

		EventBus.hand_changed.emit(id)
		EventBus.board_changed.emit()
		_emit_stats(id)
		_emit_stats(opponent_of(id))
		_check_win_condition()
		return true

	# 2. Creature Card Placement
	if slot_index == -1:
		slot_index = _first_empty_slot(state)
	if slot_index == -1 or slot_index >= BOARD_SIZE or state.board[slot_index] != null:
		return false

	state.hand.remove_at(hand_idx)
	state.board[slot_index] = card
	state.mana -= card.cost

	# Handle Rush keyword
	if card.has_rush():
		card.is_summoning_sick = false
		card.is_tapped = false
	else:
		card.is_summoning_sick = true

	# Handle Shield keyword
	if card.has_shield_keyword():
		card.has_shield = true

	EventBus.card_played.emit(id, card, slot_index)

	# Execute On-Play / Battlecry effects
	for eff in _entry_effects(card):
		_resolve_effect(eff, card, id, target_slot)

	EventBus.hand_changed.emit(id)
	EventBus.board_changed.emit()
	_emit_stats(id)
	_emit_stats(opponent_of(id))
	_check_win_condition()
	return true


func _entry_effects(card: Card) -> Array[Dictionary]:
	## Spells execute all their effects immediately upon casting.
	if card.is_spell():
		return card.effects
	## For creatures: battlecry (`on_play`) plus any `passive` effect.
	var result: Array[Dictionary] = card.get_effects_for_trigger("on_play")
	result.append_array(card.get_effects_for_trigger("passive"))
	return result


func _first_empty_slot(state: PlayerState) -> int:
	for i in range(BOARD_SIZE):
		if state.board[i] == null:
			return i
	return -1


func can_creature_attack(card: Card) -> bool:
	return card != null and not card.is_tapped and not card.is_summoning_sick and not card.is_stunned


func has_creatures(id: String) -> bool:
	var state: PlayerState = states.get(id)
	if state == null:
		return false
	for card in state.board:
		if card != null:
			return true
	return false


func has_taunt_creatures(id: String) -> bool:
	var state: PlayerState = states.get(id)
	if state == null:
		return false
	for card in state.board:
		if card != null and card.has_taunt():
			return true
	return false


func can_attack_slot(attacker_id: String, defender_slot: int) -> bool:
	var defender_id := opponent_of(attacker_id)
	var defender_state: PlayerState = states.get(defender_id)
	if defender_state == null:
		return false

	# If defender has Taunt creatures, attacker must target a Taunt creature
	if has_taunt_creatures(defender_id):
		if defender_slot < 0 or defender_slot >= BOARD_SIZE:
			return false
		var target: Card = defender_state.board[defender_slot]
		return target != null and target.has_taunt()

	if defender_slot < 0 or defender_slot >= BOARD_SIZE:
		return not has_creatures(defender_id)
	if defender_state.board[defender_slot] != null:
		return true
	return not has_creatures(defender_id)


# ── effect resolution ────────────────────────────────────────────

func _condition_met(condition: String, source_player_id: String) -> bool:
	## Gates like "enemy_hand_at_least:3", produced by the ability parsers.
	## An empty or unrecognised condition always passes, so an unparsed
	## clause never silently disables a whole effect.
	if condition.is_empty():
		return true
	var parts := condition.split(":")
	if parts.size() != 2:
		return true
	var threshold := int(parts[1])
	var opp_state: PlayerState = states[opponent_of(source_player_id)]
	var friendly_state: PlayerState = states[source_player_id]

	match parts[0]:
		"enemy_hand_at_least":
			return opp_state.hand.size() >= threshold
		"friendly_hand_at_least":
			return friendly_state.hand.size() >= threshold
		"enemy_board_at_least":
			return _count_creatures(opp_state) >= threshold
		"friendly_board_at_least":
			return _count_creatures(friendly_state) >= threshold
	return true


func _count_creatures(state: PlayerState) -> int:
	var total := 0
	for card in state.board:
		if card != null:
			total += 1
	return total


func _resolve_effect(effect: Dictionary, source_card: Card, source_player_id: String, target_slot: int = -1) -> void:
	if not match_active:
		return
	var effect_type := str(effect.get("effect_type", "")).to_lower()
	var magnitude := int(effect.get("magnitude", 1))
	var target_type := str(effect.get("target", "enemy")).to_lower()
	var condition := str(effect.get("condition", ""))

	if not _condition_met(condition, source_player_id):
		return

	var opp_id := opponent_of(source_player_id)
	var opp_state: PlayerState = states[opp_id]
	var friendly_state: PlayerState = states[source_player_id]

	var target_info := "opponent"

	match effect_type:
		"damage_face":
			_damage_player(opp_state, magnitude)
			target_info = "opponent face (-%d HP)" % magnitude

		"damage_creature":
			var hit_slot := -1
			if target_slot != -1 and target_slot < BOARD_SIZE and opp_state.board[target_slot] != null:
				hit_slot = target_slot
			else:
				# Find first available enemy creature
				for i in range(BOARD_SIZE):
					if opp_state.board[i] != null:
						hit_slot = i
						break

			if hit_slot != -1:
				var victim: Card = opp_state.board[hit_slot]
				victim.health -= magnitude
				target_info = "%s in slot %d (-%d HP)" % [victim.display_name, hit_slot, magnitude]
				if victim.health <= 0:
					_handle_creature_death(opp_id, hit_slot, victim)
			else:
				_damage_player(opp_state, magnitude)
				target_info = "opponent face (-%d HP)" % magnitude

		"damage_all_enemies":
			## Board-wide damage hits creatures only. It used to also burn
			## the opponent's HP for the same amount, turning every AoE into
			## a face-burn on top of a board clear.
			target_info = "all enemy units (-%d HP)" % magnitude
			for i in range(BOARD_SIZE):
				var victim: Card = opp_state.board[i]
				if victim != null:
					victim.health -= magnitude
					if victim.health <= 0:
						_handle_creature_death(opp_id, i, victim)

		"damage_split":
			## "N damage split between targets" — spread as evenly as the
			## total allows instead of dumping it all on one creature.
			var targets: Array[int] = []
			for i in range(BOARD_SIZE):
				if opp_state.board[i] != null:
					targets.append(i)
			if targets.is_empty():
				_damage_player(opp_state, magnitude)
				target_info = "opponent face (-%d HP)" % magnitude
			else:
				target_info = "%d damage split across %d units" % [magnitude, targets.size()]
				var remaining := magnitude
				var idx := 0
				while remaining > 0 and not targets.is_empty():
					var slot: int = targets[idx % targets.size()]
					var victim: Card = opp_state.board[slot]
					if victim != null:
						victim.health -= 1
						remaining -= 1
						if victim.health <= 0:
							_handle_creature_death(opp_id, slot, victim)
							targets.erase(slot)
							idx -= 1
					else:
						targets.erase(slot)
						idx -= 1
					idx += 1

		"debuff_attack":
			target_info = "enemy attack -%d" % magnitude
			if target_type == "all_enemies":
				for i in range(BOARD_SIZE):
					var victim: Card = opp_state.board[i]
					if victim != null:
						victim.attack = max(0, victim.attack - magnitude)
						EventBus.stat_buffed.emit(opp_id, i, victim, -magnitude, 0)
			else:
				var slot := _pick_enemy_slot(opp_state, target_slot)
				if slot != -1:
					var victim: Card = opp_state.board[slot]
					victim.attack = max(0, victim.attack - magnitude)
					EventBus.stat_buffed.emit(opp_id, slot, victim, -magnitude, 0)

		"destroy_creature":
			var slot := _pick_enemy_slot(opp_state, target_slot)
			if slot != -1:
				var victim: Card = opp_state.board[slot]
				target_info = "destroyed %s" % victim.display_name
				_handle_creature_death(opp_id, slot, victim)
			else:
				target_info = "no target to destroy"

		"destroy_all_enemies":
			target_info = "destroyed all enemy units"
			for i in range(BOARD_SIZE):
				var victim: Card = opp_state.board[i]
				if victim != null:
					_handle_creature_death(opp_id, i, victim)

		"return_to_hand":
			var slot := _pick_enemy_slot(opp_state, target_slot)
			if slot != -1:
				var victim: Card = opp_state.board[slot]
				if victim.has_solid():
					target_info = "%s is Solid and cannot be returned to hand" % victim.display_name
				else:
					opp_state.board[slot] = null
					victim.health = victim.max_health
					victim.is_tapped = false
					victim.is_summoning_sick = false
					victim.is_stunned = false
					opp_state.hand.append(victim)
					target_info = "returned %s to hand" % victim.display_name
					EventBus.hand_changed.emit(opp_id)
			else:
				target_info = "no target to return"

		"stun_creature":
			var slot := _pick_enemy_slot(opp_state, target_slot)
			if slot != -1:
				var victim: Card = opp_state.board[slot]
				if victim.has_solid():
					target_info = "%s is Solid and cannot be stunned" % victim.display_name
				else:
					victim.is_stunned = true
					victim.is_tapped = true
					target_info = "stunned %s" % victim.display_name
			else:
				target_info = "no enemy to stun"

		"shuffle_board_to_deck":
			target_info = "reshuffled all board creatures into decks"
			for pid in [source_player_id, opp_id]:
				var pstate: PlayerState = states[pid]
				for i in range(BOARD_SIZE):
					var unit: Card = pstate.board[i]
					if unit != null:
						pstate.board[i] = null
						unit.health = unit.max_health
						unit.is_tapped = false
						unit.is_summoning_sick = false
						unit.is_stunned = false
						pstate.draw_pile.append(unit)
				pstate.draw_pile.shuffle()
				EventBus.hand_changed.emit(pid)

		"summon_creature":
			var slot := _first_empty_slot(friendly_state)
			if slot != -1:
				var token := _make_token(source_card, magnitude)
				friendly_state.board[slot] = token
				target_info = "summoned %s (%d/%d)" % [token.display_name, token.attack, token.health]
				EventBus.card_played.emit(source_player_id, token, slot)
			else:
				target_info = "no room to summon"

		"heal_face":
			friendly_state.hp = min(friendly_state.max_hp, friendly_state.hp + magnitude)
			target_info = "your leader (+%d HP)" % magnitude

		"heal_creature":
			var hit_slot := -1
			if target_slot != -1 and target_slot < BOARD_SIZE and friendly_state.board[target_slot] != null:
				hit_slot = target_slot
			else:
				for i in range(BOARD_SIZE):
					var ally: Card = friendly_state.board[i]
					if ally != null and ally.health < ally.max_health:
						hit_slot = i
						break

			if hit_slot != -1:
				var ally: Card = friendly_state.board[hit_slot]
				ally.health = min(ally.max_health, ally.health + magnitude)
				target_info = "%s in slot %d (+%d HP)" % [ally.display_name, hit_slot, magnitude]
			else:
				friendly_state.hp = min(friendly_state.max_hp, friendly_state.hp + magnitude)
				target_info = "your leader (+%d HP)" % magnitude

		"grant_shield":
			var hit_slot := -1
			if target_slot != -1 and target_slot < BOARD_SIZE and friendly_state.board[target_slot] != null:
				hit_slot = target_slot
			else:
				for i in range(BOARD_SIZE):
					var ally: Card = friendly_state.board[i]
					if ally != null and not ally.has_shield:
						hit_slot = i
						break

			if hit_slot != -1:
				var ally: Card = friendly_state.board[hit_slot]
				ally.has_shield = true
				target_info = "%s gained Shield" % ally.display_name
			else:
				target_info = "no ally to shield"

		"draw_card":
			target_info = "%s (+%d cards)" % [source_player_id, magnitude]
			for i in range(magnitude):
				_draw_card(source_player_id)

		"buff_attack":
			## "your creatures gain +1/+1" hits the whole board, while single-target
			## buffs respect target_slot.
			var slots := _buff_targets(friendly_state, target_type, source_card, target_slot)
			target_info = "%d friendly unit(s) (+%d ATK)" % [slots.size(), magnitude]
			for i in slots:
				var ally: Card = friendly_state.board[i]
				ally.attack += magnitude
				EventBus.stat_buffed.emit(source_player_id, i, ally, magnitude, 0)

		"buff_health":
			var slots := _buff_targets(friendly_state, target_type, source_card, target_slot)
			target_info = "%d friendly unit(s) (+%d HP/DEF)" % [slots.size(), magnitude]
			for i in slots:
				var ally: Card = friendly_state.board[i]
				ally.health += magnitude
				ally.max_health += magnitude
				ally.defense += magnitude
				EventBus.stat_buffed.emit(source_player_id, i, ally, 0, magnitude)

	EventBus.effect_triggered.emit(source_card, effect_type, target_info, magnitude)
	EventBus.board_changed.emit()
	_emit_stats(source_player_id)
	_emit_stats(opp_id)
	_check_win_condition()


func _pick_enemy_slot(opp_state: PlayerState, preferred_slot: int) -> int:
	if preferred_slot >= 0 and preferred_slot < BOARD_SIZE and opp_state.board[preferred_slot] != null:
		return preferred_slot
	for i in range(BOARD_SIZE):
		if opp_state.board[i] != null:
			return i
	return -1


func _buff_targets(friendly_state: PlayerState, target_type: String, source_card: Card, target_slot: int = -1) -> Array[int]:
	var slots: Array[int] = []
	if target_type == "all_friendly":
		for i in range(BOARD_SIZE):
			if friendly_state.board[i] != null:
				slots.append(i)
		return slots

	if target_slot >= 0 and target_slot < BOARD_SIZE and friendly_state.board[target_slot] != null:
		slots.append(target_slot)
		return slots

	if target_type == "self":
		for i in range(BOARD_SIZE):
			if friendly_state.board[i] == source_card:
				slots.append(i)
				return slots

	## Single-target buffs prefer a unit other than the source (abilities
	## are usually worded "give another friendly unit ..."), falling back
	## to the source itself when it's alone on the board.
	for i in range(BOARD_SIZE):
		var ally: Card = friendly_state.board[i]
		if ally != null and ally != source_card:
			slots.append(i)
			return slots
	for i in range(BOARD_SIZE):
		if friendly_state.board[i] != null:
			slots.append(i)
			return slots
	return slots


func _make_token(source_card: Card, stats: int) -> Card:
	var token := Card.new()
	token.id = "token_%s" % source_card.id
	token.display_name = "%s Token" % source_card.display_name
	token.type_line = "Creature"
	token.rarity = source_card.rarity
	token.element = source_card.element
	token.faction = source_card.faction
	token.attack = stats
	token.health = stats
	token.max_health = stats
	token.defense = stats
	token.is_summoning_sick = true
	token.instance_id = "%s_%d" % [token.id, randi()]
	return token


func _handle_creature_death(owner_id: String, slot_index: int, card: Card) -> void:
	var state: PlayerState = states[owner_id]
	## Guard against double resolution: a deathrattle can kill the same
	## creature the caller is about to clean up, which used to append it to
	## the discard pile twice and fire its deathrattle twice.
	if slot_index < 0 or slot_index >= BOARD_SIZE or state.board[slot_index] != card:
		return
	state.board[slot_index] = null
	state.discard_pile.append(card)

	# Execute On-Death / Deathrattle effects
	for eff in card.get_effects_for_trigger("on_death"):
		_resolve_effect(eff, card, owner_id)

	# Execute On-Enemy-Death triggers on opposing creatures (e.g. Scavenge, Devour)
	var opp_id := opponent_of(owner_id)
	var opp_state: PlayerState = states[opp_id]
	for ally in opp_state.board:
		if ally != null:
			for eff in ally.get_effects_for_trigger("on_enemy_death"):
				_resolve_effect(eff, ally, opp_id)


# ── combat ───────────────────────────────────────────────────────

func attack(attacker_id: String, attacker_slot: int, defender_slot: int = -1) -> void:
	if not match_active or current_turn != attacker_id:
		return
	var attacker_state: PlayerState = states[attacker_id]
	var defender_id := opponent_of(attacker_id)
	var defender_state: PlayerState = states[defender_id]

	if attacker_slot < 0 or attacker_slot >= BOARD_SIZE:
		return
	if defender_slot >= BOARD_SIZE:
		return
	var attacker: Card = attacker_state.board[attacker_slot]
	if not can_creature_attack(attacker):
		return

	# Enforce Taunt requirement
	if has_taunt_creatures(defender_id):
		if defender_slot == -1 or defender_state.board[defender_slot] == null or not defender_state.board[defender_slot].has_taunt():
			return

	var hits_face := defender_slot == -1 or defender_state.board[defender_slot] == null
	if hits_face and has_creatures(defender_id):
		return

	if current_phase == Phase.SETUP:
		current_phase = Phase.COMBAT
		EventBus.phase_changed.emit(attacker_id, current_phase)

	EventBus.creature_attacked.emit(attacker_slot, defender_slot, attacker_id)

	# Trigger On-Attack effects
	for eff in attacker.get_effects_for_trigger("on_attack"):
		_resolve_effect(eff, attacker, attacker_id, defender_slot)

	if hits_face:
		_damage_player(defender_state, attacker.attack)
	else:
		var defender: Card = defender_state.board[defender_slot]

		# Trigger On-Defend effects (e.g. "deals 1 damage to attacker when blocking")
		for eff in defender.get_effects_for_trigger("on_defend"):
			_resolve_effect(eff, defender, defender_id, attacker_slot)

		# A shield absorbs the whole hit, then breaks.
		var incoming_damage := attacker.attack
		if defender.has_shield and incoming_damage > 0:
			defender.has_shield = false
			incoming_damage = 0
			EventBus.shield_broken.emit(defender_id, defender_slot, defender)

		var retaliation_damage := defender.attack
		if attacker.has_shield and incoming_damage > 0:
			attacker.has_shield = false
			retaliation_damage = 0
			EventBus.shield_broken.emit(attacker_id, attacker_slot, attacker)

		# Universal Combat Resolution:
		# 1. If ATK > DEF: defender destroyed, defending player takes surplus damage as -hp.
		# 2. If ATK < DEF: defending card withstands attack; attacking card receives dmg = defending card's ATK, and attacking player takes -hp = defending card's ATK.
		# 3. If ATK == DEF: mutually contested clash.
		if incoming_damage > defender.defense:
			var surplus: int = incoming_damage - defender.defense
			_handle_creature_death(defender_id, defender_slot, defender)
			if surplus > 0:
				_damage_player(defender_state, surplus)
		elif incoming_damage < defender.defense:
			# Attacker takes damage equivalent to defending card's ATK
			attacker.health -= retaliation_damage
			if retaliation_damage > 0:
				_damage_player(attacker_state, retaliation_damage)
			if attacker.health <= 0:
				_handle_creature_death(attacker_id, attacker_slot, attacker)
		else:
			# Even clash
			defender.health -= incoming_damage
			attacker.health -= retaliation_damage
			if defender.health <= 0:
				_handle_creature_death(defender_id, defender_slot, defender)
			if attacker.health <= 0:
				_handle_creature_death(attacker_id, attacker_slot, attacker)

	attacker.is_tapped = true

	EventBus.board_changed.emit()
	_emit_stats(attacker_id)
	_emit_stats(defender_id)
	_check_win_condition()


func _damage_player(state: PlayerState, amount: int) -> void:
	if amount <= 0:
		return
	state.hp = max(0, state.hp - amount)
	EventBus.face_damaged.emit(state.id, amount)


func _check_win_condition() -> void:
	if not match_active:
		return
	if states[PLAYER].hp <= 0:
		_end_match(ENEMY)
	elif states[ENEMY].hp <= 0:
		_end_match(PLAYER)


func _end_match(winner: String) -> void:
	match_active = false
	EventBus.match_ended.emit(winner)


func _emit_stats(id: String) -> void:
	var state: PlayerState = states[id]
	EventBus.stats_changed.emit(id, state.hp, state.max_hp, state.mana, state.max_mana)

