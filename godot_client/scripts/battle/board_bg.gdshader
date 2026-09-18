shader_type canvas_item;

uniform vec2 rect_size = vec2(800.0, 600.0);
uniform vec4 base_color : source_color = vec4(0.031, 0.129, 0.192, 1.0);
uniform vec4 grid_color : source_color = vec4(0.404, 0.851, 0.902, 0.05);
uniform float cell_size = 38.0;
uniform vec4 vignette_color : source_color = vec4(0.012, 0.063, 0.102, 0.6);

void fragment() {
	vec2 px = UV * rect_size;
	float gx = step(mod(px.x, cell_size), 1.0);
	float gy = step(mod(px.y, cell_size), 1.0);
	float line_amount = clamp(gx + gy, 0.0, 1.0);
	vec3 col = mix(base_color.rgb, grid_color.rgb, line_amount * grid_color.a);

	float dist = distance(UV, vec2(0.5, 0.42));
	col = mix(col, vignette_color.rgb, smoothstep(0.25, 0.8, dist) * vignette_color.a);

	COLOR = vec4(col, 1.0);
}
