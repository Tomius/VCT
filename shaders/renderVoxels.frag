#version 330 core

in vec3 normal_world;
in vec4 fragColor;

out vec4 color;

void main() {
	if(fragColor.a < 0.001)
		discard;

  color = vec4(pow(fragColor.rgb, vec3(1.0/2.2)), 1);
	// color = vec4(vec3(pow(fragColor.a, 1.0/2.2)), 1);
}
