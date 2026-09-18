class_name BoardBackground
extends Control
## Keeps the board_bg shader's rect_size uniform in sync with the actual
## node size, since canvas_item shaders have no built-in "my own size".
## Attached to a PanelContainer so the background respects normal
## container sizing instead of being anchor-forced to a fixed rect.

func _ready() -> void:
	resized.connect(_update_size)
	_update_size()


func _update_size() -> void:
	if material is ShaderMaterial:
		material.set_shader_parameter("rect_size", size)
