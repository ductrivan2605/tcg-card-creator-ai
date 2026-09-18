class_name TurnAction
extends RefCounted
## A single queued/resolved action within a battle turn. Used by GameManager
## and SimpleAI to describe intent before it's applied to board state, and
## kept as a lightweight turn log for the UI.

enum Kind { PLAY_CARD, ATTACK, END_TURN, DRAW_CARD }

var kind: int = Kind.END_TURN
var actor_id: String = ""
var card: Card = null
var source_slot: int = -1
var target_slot: int = -1


static func play_card(actor_id: String, card: Card, slot_index: int) -> TurnAction:
	var action := TurnAction.new()
	action.kind = Kind.PLAY_CARD
	action.actor_id = actor_id
	action.card = card
	action.target_slot = slot_index
	return action


static func attack(actor_id: String, attacker_slot: int, defender_slot: int) -> TurnAction:
	var action := TurnAction.new()
	action.kind = Kind.ATTACK
	action.actor_id = actor_id
	action.source_slot = attacker_slot
	action.target_slot = defender_slot
	return action


static func end_turn(actor_id: String) -> TurnAction:
	var action := TurnAction.new()
	action.kind = Kind.END_TURN
	action.actor_id = actor_id
	return action


static func draw_card(actor_id: String, card: Card) -> TurnAction:
	var action := TurnAction.new()
	action.kind = Kind.DRAW_CARD
	action.actor_id = actor_id
	action.card = card
	return action


func describe() -> String:
	match kind:
		Kind.PLAY_CARD:
			return "%s plays %s to slot %d" % [actor_id, card.display_name, target_slot]
		Kind.ATTACK:
			return "%s attacks slot %d from slot %d" % [actor_id, target_slot, source_slot]
		Kind.END_TURN:
			return "%s ends turn" % actor_id
		Kind.DRAW_CARD:
			return "%s draws %s" % [actor_id, card.display_name if card else "a card"]
	return "unknown action"
