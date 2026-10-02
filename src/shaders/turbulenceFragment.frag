// Pigment turbulence noise (Montesdeoca §5.1.1): low-frequency 3D Perlin fBm
// in object space. RGB = signed density offset in [-1, 1] (+ = more pigment;
// written to all channels so the signed debug view reads as grayscale).

uniform float uScale; // noise cycles per object unit
uniform int uOctaves; // 1..MAX_OCTAVES
uniform float uWarp; // domain warp strength; 0 = plain fBm

varying vec3 vLocalPosition;

const int MAX_OCTAVES = 6; // keep in sync with TURBULENCE_MAX_OCTAVES
// Fixed rotation between octaves so their grids never line up.
const mat3 OCTAVE_ROTATION = mat3(
  0.00, 0.80, 0.60,
  -0.80, 0.36, -0.48,
  -0.60, -0.48, 0.64
);

// Sin-free hash (Hoskins): stable across GPUs even at large cell coordinates.
vec3 hash3(vec3 point) {
  vec3 p3 = fract(point * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

// One corner's contribution: its random gradient dotted with the offset to the point.
float corner(vec3 cell, vec3 local, vec3 offset) {
  return dot(hash3(cell + offset) * 2.0 - 1.0, local - offset);
}

// 3D Perlin gradient noise: 8 cube corners blended with the quintic fade.
float perlin(vec3 point) {
  vec3 cell = floor(point);
  vec3 local = fract(point);
  vec3 fade = local * local * local * (local * (local * 6.0 - 15.0) + 10.0);

  float x00 = mix(corner(cell, local, vec3(0, 0, 0)), corner(cell, local, vec3(1, 0, 0)), fade.x);
  float x10 = mix(corner(cell, local, vec3(0, 1, 0)), corner(cell, local, vec3(1, 1, 0)), fade.x);
  float x01 = mix(corner(cell, local, vec3(0, 0, 1)), corner(cell, local, vec3(1, 0, 1)), fade.x);
  float x11 = mix(corner(cell, local, vec3(0, 1, 1)), corner(cell, local, vec3(1, 1, 1)), fade.x);
  return mix(mix(x00, x10, fade.y), mix(x01, x11, fade.y), fade.z);
}

// Normalized by total amplitude, so more octaves add detail, not contrast.
float fbm(vec3 point) {
  float sum = 0.0;
  float amplitude = 0.5;
  float total = 0.0;
  for (int octave = 0; octave < MAX_OCTAVES; octave++) {
    if (octave >= uOctaves) break;
    sum += amplitude * perlin(point);
    total += amplitude;
    point = OCTAVE_ROTATION * point * 2.03 + vec3(17.1, -9.7, 5.3);
    amplitude *= 0.5;
  }
  return sum / total;
}

void main() {
  vec3 point = vLocalPosition * uScale;

  // Domain warp: read the fBm where a second fBm "flow" carries the point.
  if (uWarp > 0.0) {
    vec3 flow = vec3(
      fbm(point + vec3(1.7, 9.2, 3.1)),
      fbm(point + vec3(8.3, 2.8, 6.5)),
      fbm(point + vec3(4.4, 7.6, 0.9))
    );
    point += uWarp * flow;
  }

  float turbulence = clamp(fbm(point) * 2.0, -1.0, 1.0);
  gl_FragColor = vec4(vec3(turbulence), 1.0);
}
