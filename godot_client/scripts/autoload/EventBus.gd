extends Node
## Global signal bus. Every cross-system notification flows through here so
## UI scenes never need a direct reference to GameManager, ApiClient, or
## each other.

# ── backend / networking ────────────────────────────────────────
signal backend_connected(info: Dictionary)
signal backend_disconnected(error: String)

signal decks_loaded(decks: Array)
signal deck_loaded(deck: Deck)
signal deck_load_failed(error: String)

signal build_progress(event_type: String, message: String, data: Dictionary)
signal build_finished(deck: Deck)
signal build_failed(error: String)

signal conversation_started(conversation_id: String)
signal conversation_turn_received(turn: Dictionary)
signal conversation_failed(error: String)

# ── navigation ───────────────────────────────────────────────────
signal request_scene_change(scene_path: String)

# ── match / battle flow ─────────────────────────────────────────
signal match_started()
signal match_ended(winner: String)

signal turn_started(player_id: String, turn_number: int)
signal turn_ended(player_id: String)
signal phase_changed(player_id: String, phase: int)

signal stats_changed(player_id: String, hp: int, max_hp: int, mana: int, max_mana: int)

signal card_drawn(player_id: String, card: Card)
signal card_played(player_id: String, card: Card, slot_index: int)
signal card_discarded(player_id: String, card: Card)

signal creature_attacked(attacker_slot: int, defender_slot: int, attacker_owner: String)
signal face_damaged(player_id: String, amount: int)
signal board_changed()
signal hand_changed(player_id: String)

signal card_selected(card: Card)
signal card_hovered(card: Card)

# ── card abilities / effects ────────────────────────────────────
signal effect_triggered(source_card: Card, effect_name: String, target_info: String, magnitude: int)
signal spell_cast(player_id: String, spell_card: Card)
signal spell_scene_requested(player_id: String, card: Card)
signal spell_scene_finished()
signal shield_broken(player_id: String, slot_index: int, card: Card)
signal stat_buffed(player_id: String, slot_index: int, card: Card, attack_delta: int, health_delta: int)

