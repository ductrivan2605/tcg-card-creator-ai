class_name SimpleAI
extends RefCounted
## Scripted opponent: play everything it can afford (biggest first), swing
## with every untapped creature, then pass. Deliberately dumb — swap this
## out for a smarter policy later without touching GameManager or the UI.

func take_turn(actor_id: String) -> void:
	var state: GameManager.PlayerState = GameManager.get_state(actor_id)
	if state == null or not GameManager.match_active:
		return

	await _play_affordable_cards(actor_id, state)
	if not GameManager.match_active:
		return

	_attack_with_board(actor_id, state)

	if GameManager.match_active:
		GameManager.end_turn(actor_id)


func _play_affordable_cards(actor_id: String, state: GameManager.PlayerState) -> void:
	var hand_copy: Array = state.hand.duplicate()
	hand_copy.sort_custom(func(a: Card, b: Card): return a.cost > b.cost)
	for card in hand_copy:
		if not GameManager.match_active:
			return
		if GameManager.can_play_card(actor_id, card):
			if card.is_spell():
				EventBus.spell_scene_requested.emit(actor_id, card)
				await EventBus.spell_scene_finished
			GameManager.play_card(actor_id, card)


func _attack_with_board(actor_id: String, state: GameManager.PlayerState) -> void:
	var defender_id := GameManager.opponent_of(actor_id)
	var defender_state: GameManager.PlayerState = GameManager.get_state(defender_id)

	for i in range(GameManager.BOARD_SIZE):
		if not GameManager.match_active:
			return
		var attacker: Card = state.board[i]
		if not GameManager.can_creature_attack(attacker):
			continue
		var target_slot := _pick_target_slot(defender_state)
		GameManager.attack(actor_id, i, target_slot)


func _pick_target_slot(defender_state: GameManager.PlayerState) -> int:
	## If defender has Taunt creatures, prioritize the lowest-health Taunt creature!
	var has_taunt := false
	for i in range(GameManager.BOARD_SIZE):
		var creature: Card = defender_state.board[i]
		if creature != null and creature.has_taunt():
			has_taunt = true
			break

	var best_slot := -1
	var best_health := 999
	for i in range(GameManager.BOARD_SIZE):
		var creature: Card = defender_state.board[i]
		if creature == null:
			continue
		if has_taunt and not creature.has_taunt():
			continue
		if creature.health < best_health:
			best_health = creature.health
			best_slot = i

	return best_slot

