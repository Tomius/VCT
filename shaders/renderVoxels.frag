#version 330 core

in vec3 normal_world;
in vec4 fragColor;

out vec4 color;

void main() {
	if(fragColor.a < 0.001)
		discard;

	color = fragColor;
}
