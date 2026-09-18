extends Node
## Autoload singleton for asynchronously fetching, caching, and decoding
## card artwork from HTTP/HTTPS URLs (e.g. Pollinations AI), base64 data URIs,
## and local file paths.
## Uses a strict concurrency queue to prevent overwhelming HTTP connections.
## Caches downloaded artwork to user://art_cache/ so cards load instantly.

signal texture_loaded(artwork_source: String, texture: ImageTexture)

const CACHE_DIR := "user://art_cache"
const MAX_CONCURRENT := 2
const MAX_RETRIES := 2

var _memory_cache: Dictionary = {}        # source -> ImageTexture
var _queue: Array[Dictionary] = []          # Array of {url: String, cache_path: String, retries: int}
var _queued_urls: Dictionary = {}           # url -> bool
var _active_downloads: Dictionary = {}      # url -> HTTPRequest
var _failed_sources: Dictionary = {}        # source -> int (failure count)


func _ready() -> void:
	_ensure_cache_dir()


func _ensure_cache_dir() -> void:
	if not DirAccess.dir_exists_absolute(CACHE_DIR):
		DirAccess.make_dir_recursive_absolute(CACHE_DIR)


func get_texture(source: String) -> ImageTexture:
	if source.is_empty():
		return null

	if _memory_cache.has(source):
		return _memory_cache[source]

	if _failed_sources.get(source, 0) > MAX_RETRIES:
		return null

	# 1. Base64 data URI
	if source.begins_with("data:image"):
		var tex := _decode_base64(source)
		if tex != null:
			_memory_cache[source] = tex
		else:
			_failed_sources[source] = 99
		return tex

	# 2. Local file path (res://, user://, absolute path, or relative in art_cache)
	if source.begins_with("res://") or source.begins_with("user://") or source.is_absolute_path():
		var tex := _load_local_file(source)
		if tex != null:
			_memory_cache[source] = tex
			return tex

	# Check if it matches a filename inside CACHE_DIR
	var local_cache_candidate := CACHE_DIR.path_join(source.get_file())
	if FileAccess.file_exists(local_cache_candidate):
		var tex := _load_local_file(local_cache_candidate)
		if tex != null:
			_memory_cache[source] = tex
			return tex

	# 3. HTTP / HTTPS URL (e.g. Pollinations AI)
	if source.begins_with("http://") or source.begins_with("https://"):
		var cache_path := _cache_path_for_url(source)
		if FileAccess.file_exists(cache_path):
			var tex := _load_local_file(cache_path)
			if tex != null:
				_memory_cache[source] = tex
				return tex

		# Queue download with concurrency limit
		_queue_download(source, cache_path)
		return null

	return null


func _cache_path_for_url(url: String) -> String:
	var hash_str := url.md5_text()
	var ext := ".jpg"
	if url.contains(".png"):
		ext = ".png"
	elif url.contains(".webp"):
		ext = ".webp"
	return CACHE_DIR.path_join("%s%s" % [hash_str, ext])


func _load_local_file(path: String) -> ImageTexture:
	if not FileAccess.file_exists(path):
		return null
	var image := Image.new()
	var err := image.load(path)
	if err != OK:
		return null
	return ImageTexture.create_from_image(image)


func _decode_base64(data_uri: String) -> ImageTexture:
	var comma_index := data_uri.find(",")
	if comma_index == -1:
		return null
	var mime := data_uri.substr(5, comma_index - 5)
	var bytes := Marshalls.base64_to_raw(data_uri.substr(comma_index + 1))
	if bytes.is_empty():
		return null

	var image := Image.new()
	var err: int
	if mime.begins_with("image/png"):
		err = image.load_png_from_buffer(bytes)
	elif mime.begins_with("image/webp"):
		err = image.load_webp_from_buffer(bytes)
	else:
		err = image.load_jpg_from_buffer(bytes)

	if err != OK:
		return null
	return ImageTexture.create_from_image(image)


func _queue_download(url: String, cache_path: String) -> void:
	if _queued_urls.has(url) or _active_downloads.has(url):
		return

	_queued_urls[url] = true
	_queue.append({
		"url": url,
		"cache_path": cache_path,
		"retries": 0
	})
	_process_queue()


func _process_queue() -> void:
	while _active_downloads.size() < MAX_CONCURRENT and not _queue.is_empty():
		var item: Dictionary = _queue.pop_front()
		var url: String = item.get("url", "")
		var cache_path: String = item.get("cache_path", "")
		var retries: int = item.get("retries", 0)
		_queued_urls.erase(url)
		_start_download(url, cache_path, retries)


func _start_download(url: String, cache_path: String, retries: int) -> void:
	var req := HTTPRequest.new()
	req.use_threads = true
	req.timeout = 15.0
	add_child(req)
	_active_downloads[url] = req

	req.request_completed.connect(func(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray):
		_active_downloads.erase(url)
		req.queue_free()

		var success := (result == HTTPRequest.RESULT_SUCCESS and response_code == 200 and not body.is_empty())
		if not success:
			if retries < MAX_RETRIES:
				# Re-queue for retry
				_queue.append({
					"url": url,
					"cache_path": cache_path,
					"retries": retries + 1
				})
			else:
				_failed_sources[url] = _failed_sources.get(url, 0) + 1
			_process_queue()
			return

		# Save to disk cache
		var f := FileAccess.open(cache_path, FileAccess.WRITE)
		if f:
			f.store_buffer(body)
			f.close()

		# Decode into texture
		var image := Image.new()
		var err := image.load_jpg_from_buffer(body)
		if err != OK:
			err = image.load_png_from_buffer(body)
		if err != OK:
			err = image.load_webp_from_buffer(body)

		if err == OK:
			var tex := ImageTexture.create_from_image(image)
			_memory_cache[url] = tex
			texture_loaded.emit(url, tex)
		else:
			_failed_sources[url] = _failed_sources.get(url, 0) + 1

		_process_queue()
	)

	var err := req.request(url)
	if err != OK:
		_active_downloads.erase(url)
		req.queue_free()
		if retries < MAX_RETRIES:
			_queue.append({
				"url": url,
				"cache_path": cache_path,
				"retries": retries + 1
			})
		else:
			_failed_sources[url] = _failed_sources.get(url, 0) + 1
		_process_queue()
