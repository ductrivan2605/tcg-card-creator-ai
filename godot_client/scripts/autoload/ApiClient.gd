extends Node
## Autoload singleton: the only node in the project allowed to talk HTTP to
## the TCG Balance Engine backend. UI/game code calls the public methods
## below and listens to the matching EventBus signals for the result —
## nothing outside this file should touch HTTPRequest/HTTPClient directly.
##
## Two transports are used:
##  - `_simple_request()` for plain JSON REST calls (HTTPRequest, fire once).
##  - `_SSEStream` for the backend's `text/event-stream` endpoints
##    (/build and /conversations/{id}/messages), polled every frame in
##    `_process()` since HTTPRequest only surfaces a response once complete.

const DEFAULT_BASE_URL := "https://tcg-rmit.duckdns.org/api"

## Default backend URL. Can be changed at runtime (e.g. from the main menu):
var base_url: String = DEFAULT_BASE_URL

var _active_streams: Array = []


# ── internal: one polled Server-Sent-Events connection ───────────
class _SSEStream:
	var http := HTTPClient.new()
	var host: String = ""
	var port: int = -1
	var use_tls: bool = false
	var path: String = ""
	var method: int = HTTPClient.METHOD_GET
	var body: String = ""
	var headers: PackedStringArray = []
	var phase: String = "connect"  # connect | request | body | done
	var buffer: String = ""

	var on_event: Callable
	var on_error: Callable
	var on_done: Callable

	func poll() -> bool:
		## Returns true while the stream is still alive.
		http.poll()
		var status := http.get_status()

		match phase:
			"connect":
				if status == HTTPClient.STATUS_CONNECTED:
					var err := http.request(method, path, headers, body)
					if err != OK:
						on_error.call("request() failed: %d" % err)
						return false
					phase = "request"
				elif status == HTTPClient.STATUS_CONNECTING or status == HTTPClient.STATUS_RESOLVING:
					pass
				elif status == HTTPClient.STATUS_CANT_CONNECT or status == HTTPClient.STATUS_CANT_RESOLVE:
					on_error.call("Could not connect to %s:%d" % [host, port])
					return false
			"request":
				if status == HTTPClient.STATUS_BODY:
					phase = "body"
				elif status == HTTPClient.STATUS_CONNECTED:
					# Response finished with no body at all.
					on_done.call()
					return false
				elif status == HTTPClient.STATUS_DISCONNECTED or status == HTTPClient.STATUS_CONNECTION_ERROR:
					on_error.call("Connection error while requesting %s" % path)
					return false
			"body":
				if status == HTTPClient.STATUS_BODY:
					var chunk := http.read_response_body_chunk()
					if chunk.size() > 0:
						buffer += chunk.get_string_from_utf8()
						_drain_events()
				elif status == HTTPClient.STATUS_CONNECTED or status == HTTPClient.STATUS_DISCONNECTED:
					_drain_events()
					on_done.call()
					return false
				elif status == HTTPClient.STATUS_CONNECTION_ERROR:
					on_error.call("Connection dropped mid-stream on %s" % path)
					return false
		return true

	func _drain_events() -> void:
		## SSE frames are separated by a blank line; each frame may hold
		## multiple "data: ..." lines which we join before parsing JSON.
		while true:
			var sep := buffer.find("\n\n")
			if sep == -1:
				break
			var frame := buffer.substr(0, sep)
			buffer = buffer.substr(sep + 2)
			var data_lines: Array = []
			for line in frame.split("\n"):
				if line.begins_with("data:"):
					data_lines.append(line.substr(5).strip_edges())
			if data_lines.is_empty():
				continue
			var payload := "\n".join(data_lines)
			var parsed = JSON.parse_string(payload)
			if parsed != null:
				on_event.call(parsed)


func _process(_delta: float) -> void:
	if _active_streams.is_empty():
		return
	var still_alive: Array = []
	for stream in _active_streams:
		if stream.poll():
			still_alive.append(stream)
	_active_streams = still_alive


# ── system ───────────────────────────────────────────────────────

func check_health() -> void:
	_simple_request(HTTPClient.METHOD_GET, "/health", {},
		func(data: Dictionary): EventBus.backend_connected.emit(data),
		func(error: String): EventBus.backend_disconnected.emit(error)
	)


# ── decks ────────────────────────────────────────────────────────

func get_decks() -> void:
	_simple_request(HTTPClient.METHOD_GET, "/decks", {},
		func(data: Dictionary): EventBus.decks_loaded.emit(data.get("decks", [])),
		func(error: String): EventBus.deck_load_failed.emit(error)
	)


func get_deck(deck_id: String) -> void:
	_simple_request(HTTPClient.METHOD_GET, "/decks/%s" % deck_id.uri_encode(), {},
		func(data: Dictionary): EventBus.deck_loaded.emit(Deck.from_dict(data)),
		func(error: String): EventBus.deck_load_failed.emit(error)
	)


# ── one-shot deck build (SSE) ──────────────────────────────────────

func start_build(theme: String, card_count: int = 20) -> void:
	var path := "/build?theme=%s&cards=%d" % [theme.uri_encode(), card_count]
	_start_stream(HTTPClient.METHOD_GET, path, "", [],
		_on_build_event,
		func(error: String): EventBus.build_failed.emit(error),
		func(): pass
	)


func _on_build_event(event: Dictionary) -> void:
	var event_type: String = event.get("type", "")
	var message: String = event.get("message", "")
	var data: Dictionary = event.get("data", {})
	EventBus.build_progress.emit(event_type, message, data)
	if event_type == "done" and data.has("deck"):
		EventBus.build_finished.emit(Deck.from_dict(data["deck"]))
	elif event_type == "error":
		EventBus.build_failed.emit(message)


# ── conversations / chat agent ─────────────────────────────────────

func create_conversation() -> void:
	_simple_request(HTTPClient.METHOD_POST, "/conversations", {},
		func(data: Dictionary): EventBus.conversation_started.emit(str(data.get("id", ""))),
		func(error: String): EventBus.conversation_failed.emit(error)
	)


func send_message(conversation_id: String, message: String) -> void:
	var body := JSON.stringify({"message": message})
	var headers := PackedStringArray(["Content-Type: application/json"])
	var path := "/conversations/%s/messages" % conversation_id.uri_encode()
	_start_stream(HTTPClient.METHOD_POST, path, body, headers,
		func(turn: Dictionary): EventBus.conversation_turn_received.emit(turn),
		func(error: String): EventBus.conversation_failed.emit(error),
		func(): pass
	)


# ── transport helpers ───────────────────────────────────────────

func _parse_base_url() -> Dictionary:
	var url := base_url
	var use_tls := url.begins_with("https://")
	url = url.trim_prefix("https://").trim_prefix("http://")

	var path_prefix := ""
	var slash_idx := url.find("/")
	if slash_idx != -1:
		path_prefix = url.substr(slash_idx).trim_suffix("/")
		url = url.substr(0, slash_idx)

	var host := url
	var port := 443 if use_tls else 80
	var colon_idx := url.find(":")
	if colon_idx != -1:
		host = url.substr(0, colon_idx)
		port = int(url.substr(colon_idx + 1))

	return {"host": host, "port": port, "use_tls": use_tls, "path_prefix": path_prefix}


func _simple_request(method: int, path: String, body: Dictionary,
		on_success: Callable, on_error: Callable) -> void:
	var parsed := _parse_base_url()
	var full_url := "%s://%s:%d%s%s" % [
		"https" if parsed.use_tls else "http",
		parsed.host, parsed.port, parsed.path_prefix, path,
	]

	var request := HTTPRequest.new()
	add_child(request)

	var headers := PackedStringArray(["Content-Type: application/json"])
	var body_str := "" if body.is_empty() else JSON.stringify(body)

	request.request_completed.connect(func(result: int, code: int, _resp_headers: PackedStringArray, resp_body: PackedByteArray):
		request.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS:
			on_error.call("Network error (%d) calling %s" % [result, path])
			return
		if code < 200 or code >= 300:
			on_error.call("HTTP %d from %s" % [code, path])
			return
		var text: String = resp_body.get_string_from_utf8()
		var parsed_json = JSON.parse_string(text) if text.length() > 0 else {}
		on_success.call(parsed_json if parsed_json != null else {})
	)

	var err: int
	if method == HTTPClient.METHOD_GET:
		err = request.request(full_url, headers, HTTPClient.METHOD_GET)
	else:
		err = request.request(full_url, headers, method, body_str)

	if err != OK:
		request.queue_free()
		on_error.call("Failed to start request to %s (error %d)" % [path, err])


func _start_stream(method: int, path: String, body: String, extra_headers: PackedStringArray,
		on_event: Callable, on_error: Callable, on_done: Callable) -> void:
	var parsed := _parse_base_url()
	var stream := _SSEStream.new()
	stream.host = parsed.host
	stream.port = parsed.port
	stream.use_tls = parsed.use_tls
	stream.path = "%s%s" % [parsed.path_prefix, path]
	stream.method = method
	stream.body = body

	var headers: PackedStringArray = ["Accept: text/event-stream"]
	for h in extra_headers:
		headers.append(h)
	stream.headers = headers

	stream.on_event = on_event
	stream.on_error = on_error
	stream.on_done = on_done

	var connect_err := stream.http.connect_to_host(
		stream.host, stream.port, TLSOptions.client() if stream.use_tls else null
	)
	if connect_err != OK:
		on_error.call("Could not start connection to %s:%d" % [stream.host, stream.port])
		return

	_active_streams.append(stream)
