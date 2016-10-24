#version 330 core

out vec4 color;

uniform float VoxelSize;
uniform int Dimensions;
uniform int TotalNumVoxels; // Dimensions^3

uniform sampler3D VoxelTexture;
uniform sampler3D VoxelTexture2;

void main() {
	vec3 pos; // Center of voxel
	pos.x = gl_VertexID % Dimensions;
	pos.z = (gl_VertexID / Dimensions) % Dimensions;
	pos.y = gl_VertexID / (Dimensions*Dimensions);

	color = vec4(texture(VoxelTexture, pos/Dimensions).rgb, texture(VoxelTexture2, pos/Dimensions).r);
	gl_Position = vec4(pos - Dimensions*0.5, 1);
}
