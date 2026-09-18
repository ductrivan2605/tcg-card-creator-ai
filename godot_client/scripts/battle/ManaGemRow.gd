class_name ManaGemRow
extends Control
## Mana resource display matching Figma's "resource-gems": a row of 11x11
## squares, gap 4, filled cyan when available, black-filled with a cyan
## outline when spent. Drawn procedurally so ManaBar doesn't need one
## hand-authored node per possible mana value.

const GEM_SIZE := 11.0
const GAP := 4.0

var _active: int = 0
var _total: int = 0


func set_gems(active: int, total: int) -> void:
	_active = active
	_total = total
	var width := 0.0 if total <= 0 else total * (GEM_SIZE + GAP) - GAP
	custom_minimum_size = Vector2(width, GEM_SIZE)
	queue_redraw()


func _draw() -> void:
	for i in range(_total):
		var x := i * (GEM_SIZE + GAP)
		var rect := Rect2(x, 0, GEM_SIZE, GEM_SIZE)
		if i < _active:
			draw_rect(rect, Palette.CYAN, true)
		else:
			draw_rect(rect, Color.BLACK, true)
			draw_rect(rect, Palette.CYAN, false, 1.0)
