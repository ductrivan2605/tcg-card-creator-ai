class_name Deck
extends RefCounted
## A generated deck, parsed from either GET /decks/{id} (name, theme, rules,
## balance_history, cards), the /build stream, or imported JSON / ZIP deck files.

var id: String = ""
var deck_name: String = ""
var theme: String = ""
var rules: Dictionary = {}
var balance_history: Array = []
var cards: Array[Card] = []

var raw: Dictionary = {}


static func from_dict(data: Dictionary) -> Deck:
	var deck := Deck.new()
	deck.raw = data

	var deck_info: Dictionary = data
	if data.has("deck") and data["deck"] is Dictionary:
		deck_info = data["deck"]

	deck.id = str(deck_info.get("id", data.get("id", data.get("deckId", ""))))
	deck.deck_name = str(deck_info.get("name", data.get("name", deck.id)))
	if deck.deck_name.is_empty():
		deck.deck_name = "Imported Deck"

	deck.theme = str(deck_info.get("theme", data.get("theme", data.get("topic", ""))))
	deck.rules = deck_info.get("rules", data.get("rules", {}))
	deck.balance_history = deck_info.get("balance_history", data.get("balance_history", []))

	var card_list: Array = []
	if data.has("cards") and data["cards"] is Array:
		card_list = data["cards"]
	elif deck_info.has("cards") and deck_info["cards"] is Array:
		card_list = deck_info["cards"]

	for card_data in card_list:
		if card_data is Dictionary:
			deck.cards.append(Card.from_dict(card_data))

	return deck


static func from_json_string(json_str: String) -> Deck:
	var parsed = JSON.parse_string(json_str)
	if parsed == null:
		push_error("Deck.from_json_string: Failed to parse JSON string.")
		return null

	if parsed is Dictionary:
		return Deck.from_dict(parsed)
	elif parsed is Array:
		var deck := Deck.new()
		deck.id = "imported_%d" % int(Time.get_unix_time_from_system())
		deck.deck_name = "Imported Deck"
		for card_data in parsed:
			if card_data is Dictionary:
				deck.cards.append(Card.from_dict(card_data))
		return deck

	return null


static func from_file(file_path: String) -> Deck:
	if not FileAccess.file_exists(file_path):
		push_error("Deck.from_file: File not found at %s" % file_path)
		return null

	var file := FileAccess.open(file_path, FileAccess.READ)
	if not file:
		push_error("Deck.from_file: Could not open file at %s (error %d)" % [file_path, FileAccess.get_open_error()])
		return null

	var text := file.get_as_text()
	var deck := Deck.from_json_string(text)
	if deck != null and deck.deck_name == "Imported Deck":
		# Use file basename if deck didn't have a name
		var base := file_path.get_file().get_basename()
		deck.deck_name = base.capitalize()
	return deck


static func from_zip(zip_path: String) -> Deck:
	if not FileAccess.file_exists(zip_path):
		push_error("Deck.from_zip: File not found at %s" % zip_path)
		return null

	var reader := ZIPReader.new()
	var err := reader.open(zip_path)
	if err != OK:
		push_error("Deck.from_zip: Failed to open zip archive %s (error %d)" % [zip_path, err])
		return null

	var files := reader.get_files()
	var deck_dict: Dictionary = {}
	var cards_list: Array = []

	# Check for deck.json
	if files.has("deck.json"):
		var deck_bytes := reader.read_file("deck.json")
		var deck_parsed = JSON.parse_string(deck_bytes.get_string_from_utf8())
		if deck_parsed is Dictionary:
			deck_dict = deck_parsed

	# Check for cards.json
	if files.has("cards.json"):
		var cards_bytes := reader.read_file("cards.json")
		var cards_parsed = JSON.parse_string(cards_bytes.get_string_from_utf8())
		if cards_parsed is Dictionary and cards_parsed.has("cards") and cards_parsed["cards"] is Array:
			cards_list = cards_parsed["cards"]
		elif cards_parsed is Array:
			cards_list = cards_parsed

	# Extract any bundled card image files to user://art_cache/
	if not DirAccess.dir_exists_absolute("user://art_cache"):
		DirAccess.make_dir_recursive_absolute("user://art_cache")

	for f in files:
		var lower_f := f.to_lower()
		if lower_f.ends_with(".jpg") or lower_f.ends_with(".jpeg") or lower_f.ends_with(".png") or lower_f.ends_with(".webp"):
			var img_bytes := reader.read_file(f)
			if not img_bytes.is_empty():
				var out_path := "user://art_cache".path_join(f.get_file())
				var out_file := FileAccess.open(out_path, FileAccess.WRITE)
				if out_file:
					out_file.store_buffer(img_bytes)
					out_file.close()

	reader.close()

	if cards_list.is_empty() and not deck_dict.has("cards"):
		push_error("Deck.from_zip: Zip archive does not contain cards.json or deck.json cards.")
		return null

	var merged := deck_dict.duplicate()
	if not cards_list.is_empty():
		merged["cards"] = cards_list

	var deck := Deck.from_dict(merged)
	if deck.deck_name.is_empty() or deck.deck_name == "Imported Deck":
		deck.deck_name = zip_path.get_file().get_basename().capitalize()
	return deck


func to_dict() -> Dictionary:
	var cards_data: Array = []
	for card in cards:
		if not card.raw.is_empty():
			cards_data.append(card.raw)
		else:
			cards_data.append({
				"id": card.id,
				"rarity": card.rarity,
				"tags": card.tags,
				"gameplay": {
					"cost": card.cost,
					"attack": card.attack,
					"defense": card.defense,
					"health": card.health,
					"element": card.element,
					"faction": card.faction,
				},
				"content": {
					"name": card.display_name,
					"ability": card.ability,
					"flavor": card.flavor,
					"typeLine": card.type_line,
					"artwork": card.artwork,
				}
			})

	return {
		"id": id,
		"name": deck_name,
		"theme": theme,
		"rules": rules,
		"balance_history": balance_history,
		"cards": cards_data,
	}


func card_count() -> int:
	return cards.size()


func average_cost() -> float:
	if cards.is_empty():
		return 0.0
	var total := 0
	for card in cards:
		total += card.cost
	return float(total) / cards.size()


func build_draw_pile() -> Array[Card]:
	## Fresh, shuffled per-instance copies suitable for a battle deck.
	var pile: Array[Card] = []
	for card in cards:
		pile.append(card.duplicate_instance())
	pile.shuffle()
	return pile


func is_godot_compatible() -> Dictionary:
	# 1. Pre-baked meta decks are guaranteed compatible
	if id in ["abyssal_depths_60", "solar_pantheon_60", "primeval_dominion_60"]:
		return {"compatible": true, "is_prebaked": true, "reason": "Verified Pre-baked Deck"}

	if cards.is_empty():
		return {"compatible": false, "is_prebaked": false, "reason": "Deck has no cards"}

	if cards.size() < 10:
		return {"compatible": false, "is_prebaked": false, "reason": "Deck has fewer than 10 cards"}

	var creature_count := 0
	for card in cards:
		var ctype := card.type_line.to_lower()
		if ctype != "creature" and ctype != "spell":
			return {
				"compatible": false,
				"is_prebaked": false,
				"reason": "Card '%s' has non-standard type '%s' (Godot rules only support Creature and Spell)" % [card.display_name, card.type_line]
			}
		if ctype == "creature":
			if card.health <= 0:
				return {
					"compatible": false,
					"is_prebaked": false,
					"reason": "Creature '%s' has 0 or negative health (%d)" % [card.display_name, card.health]
				}
			creature_count += 1

	if creature_count < 3:
		return {
			"compatible": false,
			"is_prebaked": false,
			"reason": "Deck has only %d creature cards (requires at least 3 for lane battle)" % creature_count
		}

	return {"compatible": true, "is_prebaked": false, "reason": "Compatible with standard combat rules"}
