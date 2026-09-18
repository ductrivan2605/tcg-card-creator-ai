extends Control
## Landing screen: verify the backend connection, browse existing decks,
## or import custom decks from .json / .zip files or drag-and-drop.
## Selecting a deck stores it on GameManager.loaded_deck for
## DeckViewer/BattleArena to pick up.

@onready var _url_input: LineEdit = %UrlInput
@onready var _connect_button: Button = %ConnectButton
@onready var _status_label: Label = %StatusLabel
@onready var _badge_dot: Panel = %BadgeDot
@onready var _badge_label: Label = %BadgeLabel

@onready var _deck_list: ItemList = %DeckList
@onready var _empty_state: VBoxContainer = %EmptyState
@onready var _refresh_button: Button = %RefreshButton
@onready var _import_deck_button: Button = %ImportDeckButton
@onready var _deck_file_dialog: FileDialog = %DeckFileDialog
@onready var _view_deck_button: Button = %ViewDeckButton
@onready var _battle_button: Button = %BattleButton

const LOCAL_DECKS_DIR := "user://decks"

var _server_decks: Array = []  # [{id, name, theme}]
var _local_decks: Array[Deck] = []  # local imported Deck objects
var _decks_index: Array = []  # unified rows for _deck_list: [{is_local: bool, ...}]


func _ready() -> void:
	_url_input.text = ApiClient.base_url
	_connect_button.pressed.connect(_on_connect_pressed)
	_refresh_button.pressed.connect(_on_refresh_pressed)
	_import_deck_button.pressed.connect(_on_import_deck_pressed)
	_deck_file_dialog.file_selected.connect(_on_deck_file_selected)
	_deck_list.item_selected.connect(_on_deck_selected)
	_view_deck_button.pressed.connect(_on_view_deck_pressed)
	_battle_button.pressed.connect(_on_battle_pressed)

	# Support drag-and-drop of .json or .zip deck files directly into the window
	get_window().files_dropped.connect(_on_files_dropped)

	EventBus.backend_connected.connect(_on_backend_connected)
	EventBus.backend_disconnected.connect(_on_backend_disconnected)
	EventBus.decks_loaded.connect(_on_decks_loaded)
	EventBus.deck_load_failed.connect(_on_deck_error)
	EventBus.deck_loaded.connect(_on_deck_loaded)

	_set_deck_actions_enabled(false)
	_ensure_local_decks_dir()
	_load_local_decks()
	_rebuild_deck_list()
	_on_connect_pressed()


func _ensure_local_decks_dir() -> void:
	if not DirAccess.dir_exists_absolute(LOCAL_DECKS_DIR):
		DirAccess.make_dir_recursive_absolute(LOCAL_DECKS_DIR)


func _load_local_decks() -> void:
	_local_decks.clear()
	var dir := DirAccess.open(LOCAL_DECKS_DIR)
	if dir:
		dir.list_dir_begin()
		var file_name := dir.get_next()
		while not file_name.is_empty():
			if not dir.current_is_dir() and file_name.ends_with(".json"):
				var full_path := LOCAL_DECKS_DIR.path_join(file_name)
				var deck := Deck.from_file(full_path)
				if deck != null and not deck.cards.is_empty():
					_local_decks.append(deck)
			file_name = dir.get_next()
		dir.list_dir_end()


func _on_connect_pressed() -> void:
	ApiClient.base_url = _url_input.text.strip_edges()
	_status_label.text = "Connecting..."
	_status_label.modulate = Color(0.85, 0.75, 0.4)
	_set_status_badge("CONNECTING", Color(0.85, 0.75, 0.4))
	ApiClient.check_health()


func _on_backend_connected(info: Dictionary) -> void:
	var has_key: bool = info.get("has_api_key", false)
	_status_label.text = "Connected%s" % ("" if has_key else " (no LLM API key configured)")
	_status_label.modulate = Color(0.5, 0.85, 0.5)
	_set_status_badge("ONLINE", Color(0.5, 0.85, 0.5))
	_on_refresh_pressed()


func _on_backend_disconnected(error: String) -> void:
	_status_label.text = "Disconnected: %s" % error
	_status_label.modulate = Color(0.9, 0.4, 0.4)
	_set_status_badge("OFFLINE", Color(0.9, 0.4, 0.4))
	_rebuild_deck_list()


func _set_status_badge(text: String, color: Color) -> void:
	_badge_label.text = text
	_badge_label.modulate = color
	_badge_dot.modulate = color


func _on_refresh_pressed() -> void:
	_load_local_decks()
	_server_decks.clear()
	_rebuild_deck_list()
	ApiClient.get_decks()


func _on_decks_loaded(decks: Array) -> void:
	_server_decks = decks
	_rebuild_deck_list()


func _rebuild_deck_list(select_target_id: String = "") -> void:
	_deck_list.clear()
	_decks_index.clear()

	var target_index := -1

	# 1. First list locally imported decks
	for local_deck in _local_decks:
		var index := _decks_index.size()
		var label := "[Imported] %s — %d cards (%s)" % [
			local_deck.deck_name,
			local_deck.card_count(),
			local_deck.theme if not local_deck.theme.is_empty() else "Custom"
		]
		_deck_list.add_item(label)
		_decks_index.append({
			"is_local": true,
			"deck": local_deck,
			"id": local_deck.id,
		})
		if not select_target_id.is_empty() and (local_deck.id == select_target_id or local_deck.deck_name == select_target_id):
			target_index = index

	# 2. Then list server decks (custom user projects)
	for entry in _server_decks:
		var is_pb: bool = entry.get("is_prebaked", false) or str(entry.get("id")) in ["abyssal_depths_60", "solar_pantheon_60", "primeval_dominion_60"]
		if is_pb:
			continue
		var index := _decks_index.size()
		var label := "[Server] %s — %s" % [entry.get("name", entry.get("id")), entry.get("theme", "")]
		_deck_list.add_item(label)
		_decks_index.append({
			"is_local": false,
			"id": str(entry.get("id")),
			"name": entry.get("name", ""),
			"theme": entry.get("theme", ""),
			"is_prebaked": false,
		})
		if not select_target_id.is_empty() and str(entry.get("id")) == select_target_id:
			target_index = index

	_update_empty_state()

	# Restore selection if specified
	if target_index >= 0 and target_index < _deck_list.item_count:
		_deck_list.select(target_index)
		_on_deck_selected(target_index)


func _update_empty_state() -> void:
	var is_empty := _decks_index.is_empty()
	_empty_state.visible = is_empty
	_deck_list.visible = not is_empty


func _on_deck_error(error: String) -> void:
	_status_label.text = "Deck error: %s" % error
	_status_label.modulate = Color(0.9, 0.4, 0.4)


func _on_deck_selected(index: int) -> void:
	if index < 0 or index >= _decks_index.size():
		return

	var entry: Dictionary = _decks_index[index]
	if entry.get("is_local", false):
		var deck: Deck = entry.get("deck")
		GameManager.loaded_deck = deck
		_apply_deck_compatibility(deck)
	else:
		_set_deck_actions_enabled(false)
		ApiClient.get_deck(str(entry.get("id")))


func _on_deck_loaded(deck: Deck) -> void:
	GameManager.loaded_deck = deck
	_apply_deck_compatibility(deck)


func _apply_deck_compatibility(deck: Deck) -> void:
	var compat := deck.is_godot_compatible()
	var is_ok: bool = compat.get("compatible", false)
	_view_deck_button.disabled = false
	_battle_button.disabled = not is_ok
	if is_ok:
		if compat.get("is_prebaked", false):
			_status_label.text = "Selected pre-baked deck \"%s\" (%d cards). Ready for battle." % [deck.deck_name, deck.card_count()]
		else:
			_status_label.text = "Selected custom deck \"%s\" (%d cards) with compatible combat rules. Ready for battle." % [deck.deck_name, deck.card_count()]
		_status_label.modulate = Color(0.5, 0.85, 0.5)
	else:
		_status_label.text = "Deck \"%s\" uses non-standard rules (%s). Godot battle arena requires standard Creature/Spell rules." % [deck.deck_name, compat.get("reason", "Custom rules")]
		_status_label.modulate = Color(0.95, 0.65, 0.3)


func _set_deck_actions_enabled(enabled: bool) -> void:
	_view_deck_button.disabled = not enabled
	_battle_button.disabled = not enabled


func _on_import_deck_pressed() -> void:
	if DisplayServer.has_feature(DisplayServer.FEATURE_NATIVE_DIALOG):
		var err := DisplayServer.file_dialog_show(
			"Open Deck File (.json or .zip)",
			"",
			"",
			false,
			DisplayServer.FILE_DIALOG_MODE_OPEN_FILE,
			PackedStringArray(["*.json", "*.zip"]),
			_on_native_file_selected
		)
		if err == OK:
			return

	if _deck_file_dialog:
		_deck_file_dialog.popup_centered(Vector2i(760, 520))


func _on_native_file_selected(status: bool, selected_paths: PackedStringArray, _selected_filter_index: int) -> void:
	if status and not selected_paths.is_empty():
		import_deck_from_path(selected_paths[0])


func _on_deck_file_selected(file_path: String) -> void:
	import_deck_from_path(file_path)


func _on_files_dropped(files: PackedStringArray) -> void:
	for file_path in files:
		if file_path.ends_with(".json") or file_path.ends_with(".zip"):
			import_deck_from_path(file_path)
			break


func import_deck_from_path(file_path: String) -> void:
	_status_label.text = "Importing deck from %s..." % file_path.get_file()
	_status_label.modulate = Color(0.85, 0.75, 0.4)

	var deck: Deck = null
	if file_path.ends_with(".zip"):
		deck = Deck.from_zip(file_path)
	elif file_path.ends_with(".json"):
		deck = Deck.from_file(file_path)
	else:
		_status_label.text = "Unsupported file type: %s (choose .json or .zip)" % file_path.get_extension()
		_status_label.modulate = Color(0.9, 0.4, 0.4)
		return

	if deck == null or deck.cards.is_empty():
		_status_label.text = "Failed to load deck or no cards found in %s" % file_path.get_file()
		_status_label.modulate = Color(0.9, 0.4, 0.4)
		return

	# Persist to local decks directory user://decks/
	_ensure_local_decks_dir()
	var safe_name := deck.deck_name.to_lower().replace(" ", "_")
	var save_path := LOCAL_DECKS_DIR.path_join("%s.json" % safe_name)
	var f := FileAccess.open(save_path, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(deck.to_dict(), "\t"))
		f.close()

	# Reload local decks list and select the new deck
	_load_local_decks()
	_rebuild_deck_list(deck.id if not deck.id.is_empty() else deck.deck_name)

	GameManager.loaded_deck = deck
	_apply_deck_compatibility(deck)
	_status_label.text = "Successfully imported \"%s\" (%d cards)! Ready for battle." % [deck.deck_name, deck.card_count()]
	_status_label.modulate = Color(0.35, 0.9, 0.5)


# ── Navigation ───────────────────────────────────────────────────

func _on_view_deck_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/deck_viewer/DeckViewer.tscn")


func _on_battle_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/battle_arena/BattleArena.tscn")
