#version 430
#extension GL_ARB_shader_image_load_store : enable

// Data from geometry shader
in fData {
  vec2 UV;
  vec4 position_depth; // Position from the shadow map point of view
  vec3 normal;
  flat int axis;
} frag;

uniform layout(r32ui) uimage3D VoxelTexture;
uniform layout(r32ui) uimage3D VoxelTexture2;
uniform sampler2D DiffuseTexture;
uniform sampler2DShadow ShadowMap;
uniform int VoxelDimensions;
uniform vec3 LightDirection;

void imageAtomicAverageRGBA8(layout(r32ui) coherent volatile uimage3D voxels, ivec3 coord, vec3 nextVec3)
{
  uint nextUint = packUnorm4x8(vec4(nextVec3,1.0/255.0));
  uint prevUint = 0;
  uint currUint;

  vec4 currVec4;

  vec3 average;
  uint count;

  //"Spin" while threads are trying to change the voxel
  while((currUint = imageAtomicCompSwap(voxels, coord, prevUint, nextUint)) != prevUint)
  {
    prevUint = currUint;                    //store packed rgb average and count
    currVec4 = unpackUnorm4x8(currUint);    //unpack stored rgb average and count

    average = currVec4.rgb;             //extract rgb average
    count   = uint(currVec4.a*255.0);  //extract count

    //Compute the running average
    average = (average*count + nextVec3) / (count+1);

    //Pack new average and incremented count back into a uint
    nextUint = packUnorm4x8(vec4(average, (count+1)/255.0f));
  }
}

void main() {
  vec4 materialColor = texture(DiffuseTexture, frag.UV);
  float cosTheta = max(0.0, dot(normalize(frag.normal), LightDirection));
  // float cosTheta = length(LightDirection);

  // Do shadow map lookup here
  // TODO: Splat photons onto the voxels at a later stage using a separate shader
  float visibility = texture(ShadowMap, vec3(frag.position_depth.xy, (frag.position_depth.z - 0.001)/frag.position_depth.w));
  visibility = max(visibility, 0.05);

	ivec3 camPos = ivec3(gl_FragCoord.x, gl_FragCoord.y, VoxelDimensions * gl_FragCoord.z);
	ivec3 texPos;
	if (frag.axis == 1) {
	  texPos.x = VoxelDimensions - camPos.z;
    texPos.y = camPos.y;
		texPos.z = camPos.x;
	} else if (frag.axis == 2) {
		texPos.x = camPos.x;
    texPos.z = camPos.y;
    texPos.y = VoxelDimensions - camPos.z;
	} else {
	  texPos = camPos;
	}

	// Flip it!
	texPos.z = VoxelDimensions - texPos.z - 1;

  vec4 colorToStore = vec4(cosTheta * visibility * materialColor.rgb, 1.0);
  // imageStore(VoxelTexture, texPos, colorToStore);
  imageAtomicAverageRGBA8(VoxelTexture, texPos, colorToStore.rgb);
  imageAtomicAverageRGBA8(VoxelTexture2, texPos, vec3(1.0));
}
