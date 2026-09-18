class_name ChatPanel
extends VBoxContainer
## Chat UI for the AI balance agent. Talks only through ApiClient/EventBus —
## opens a conversation on _ready(), streams turns from
## POST /conversations/{id}/messages (kinds: user, agent, thinking, tools,
## panel, deliverable, context, error — see backend/app/agent/conversation.py)
## into a scrolling log.

@onready var _log: RichTextLabel = %Log
@onready var _input: LineEdit = %Input
@onready var _send_button: Button = %SendButton
@onready var _scroll: ScrollContainer = %Scroll

var conversation_id: String = ""
var _pending: bool = false


func _ready() -> void:
	_send_button.pressed.connect(_on_send_pressed)
	_input.text_submitted.connect(func(_text): _on_send_pressed())

	EventBus.conversation_started.connect(_on_conversation_started)
	EventBus.conversation_turn_received.connect(_on_turn_received)
	EventBus.conversation_failed.connect(_on_conversation_failed)

	_set_busy(true)
	_append_system("Connecting to balance agent...")
	ApiClient.create_conversation()


func _on_conversation_started(id: String) -> void:
	conversation_id = id
	_set_busy(false)
	_append_system("Connected. Ask for a deck theme, an adjustment, or a rebalance.")


func _on_send_pressed() -> void:
	var text := _input.text.strip_edges()
	if text.is_empty() or conversation_id.is_empty() or _pending:
		return
	_input.text = ""
	_set_busy(true)
	ApiClient.send_message(conversation_id, text)


func _on_turn_received(turn: Dictionary) -> void:
	var kind: String = turn.get("kind", "")
	match kind:
		"user":
			_append_line("You", turn.get("text", ""), Color(0.85, 0.85, 0.9))
		"agent":
			_append_line("Agent", turn.get("text", ""), Color(0.55, 0.85, 0.6))
			_set_busy(false)
		"thinking":
			_append_line("Thinking", turn.get("text", ""), Color(0.6, 0.6, 0.65))
		"tools":
			var title: String = turn.get("title", "Tool call")
			_append_line("Tools", title, Color(0.55, 0.7, 0.9))
		"panel":
			var panel_title: String = turn.get("title", turn.get("panelType", ""))
			_append_line("Panel", "opened — %s" % panel_title, Color(0.8, 0.7, 0.4))
		"deliverable":
			_append_line("Deliverable", turn.get("title", "ready"), Color(0.8, 0.7, 0.4))
		"error":
			_append_line("Error", turn.get("message", "Unknown error"), Color(0.9, 0.4, 0.4))
			_set_busy(false)
		"context":
			pass # internal memory update, nothing to render
		_:
			_append_line(kind.capitalize(), JSON.stringify(turn), Color(0.6, 0.6, 0.6))


func _on_conversation_failed(error: String) -> void:
	_append_line("Error", error, Color(0.9, 0.4, 0.4))
	_set_busy(false)


func _set_busy(busy: bool) -> void:
	_pending = busy
	_send_button.disabled = busy
	_input.editable = not busy


func _append_system(text: String) -> void:
	_log.append_text("[color=#888888][i]%s[/i][/color]\n" % text.xml_escape())
	_scroll_to_bottom()


func _append_line(speaker: String, text: String, color: Color) -> void:
	_log.append_text("[color=#%s][b]%s:[/b][/color] %s\n" % [
		color.to_html(false), speaker.xml_escape(), text.xml_escape()
	])
	_scroll_to_bottom()


func _scroll_to_bottom() -> void:
	await get_tree().process_frame
	_scroll.scroll_vertical = int(_scroll.get_v_scroll_bar().max_value)
