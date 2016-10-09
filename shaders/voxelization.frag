#version 430
#extension GL_ARB_shader_image_load_store : enable

// Data from geometry shader
in fData {
  vec2 UV;
  vec4 position_depth; // Position from the shadow map point of view
  vec3 normal;
  flat int axis;
} frag;

uniform layout(RGBA8) image3D VoxelTexture;
//uniform layout(r32ui) uimage3D VoxelTexture;
uniform sampler2D DiffuseTexture;
uniform sampler2DShadow ShadowMap;
uniform int VoxelDimensions;
uniform vec3 LightDirection;

// Auxiliary functions borrowed from OpenGL Insights, 2011

uint convVec4ToRGBA8(vec4 val) {
  return (uint(val.w) & 0x000000FF) << 24U
    | (uint(val.z) & 0x000000FF) << 16U
    | (uint(val.y) & 0x000000FF) << 8U
    | (uint(val.x) & 0x000000FF);
}

vec4 convRGBA8ToVec4(uint val) {
  return vec4(float((val & 0x000000FF)),
              float((val & 0x0000FF00) >> 8U),
              float((val & 0x00FF0000) >> 16U),
              float((val & 0xFF000000) >> 24U));
}

uint encUnsignedNibble(uint m, uint n) {
  return (m & 0xFEFEFEFE)
    | (n & 0x00000001)
    | (n & 0x00000002) << 7U
    | (n & 0x00000004) << 14U
    | (n & 0x00000008) << 21U;
}

uint decUnsignedNibble(uint m) {
  return (m & 0x00000001)
    | (m & 0x00000100) >> 7U
    | (m & 0x00010000) >> 14U
    | (m & 0x01000000) >> 21U;
}

void imageAtomicRGBA8Avg(layout(r32ui) uimage3D img,
                         ivec3 coords, vec4 val) {

  // LSBs are used for the sample counter of the moving average.

  val *= 255.0;
  uint newVal = encUnsignedNibble(convVec4ToRGBA8(val), 1);
  uint prevStoredVal = 0;
  uint currStoredVal;

  int counter = 0;
  // Loop as long as destination value gets changed by other threads
  while ((currStoredVal = imageAtomicCompSwap(img, coords, prevStoredVal, newVal))
         != prevStoredVal && counter < 16) {

    vec4 rval = convRGBA8ToVec4(currStoredVal & 0xFEFEFEFE);
    uint n = decUnsignedNibble(currStoredVal);
    rval = rval * n + val;
    rval /= ++n;
    rval = round(rval / 2) * 2;
    newVal = encUnsignedNibble(convVec4ToRGBA8(rval), n);

    prevStoredVal = currStoredVal;

    counter++;
  }
}

void main() {
  vec4 materialColor = texture(DiffuseTexture, frag.UV);
  float cosTheta = max(0.0, dot(normalize(frag.normal), LightDirection));
  // float cosTheta = length(LightDirection);

  // Do shadow map lookup here
  // TODO: Splat photons onto the voxels at a later stage using a separate shader
  float visibility = texture(ShadowMap, vec3(frag.position_depth.xy, (frag.position_depth.z - 0.001)/frag.position_depth.w));
  visibility = max(visibility, 0.12);

	ivec3 camPos = ivec3(gl_FragCoord.x, gl_FragCoord.y, VoxelDimensions * gl_FragCoord.z);
	ivec3 texPos;
	if(frag.axis == 1) {
	  texPos.x = VoxelDimensions - camPos.z;
    texPos.y = camPos.y;
		texPos.z = camPos.x;
	}
	else if(frag.axis == 2) {
		texPos.x = camPos.x;
    texPos.z = camPos.y;
    texPos.y = VoxelDimensions - camPos.z;
	} else {
	  texPos = camPos;
	}

	// Flip it!
	texPos.z = VoxelDimensions - texPos.z - 1;

  vec4 colorToStore = vec4(cosTheta * visibility * materialColor.rgb, 1.0);
  imageStore(VoxelTexture, texPos, colorToStore);
  //imageAtomicRGBA8Avg(VoxelTexture, texPos, colorToStore);
}
