uniform vec2 uResolution;
uniform float uPixelRatio;
uniform vec3 uSubstrateColor;
uniform float uSubstrateScale;

varying vec2 vUv;

// Sin-free hash (Hoskins): stable across GPUs even at large cell coordinates.
vec2 hash2(vec2 point) {
  vec3 p3 = fract(vec3(point.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// Gradient noise in roughly [-0.7, 0.7]; smoother and less grid-like than value noise.
float gradientNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 blend = local * local * local * (local * (local * 6.0 - 15.0) + 10.0);
  vec2 g00 = hash2(cell) * 2.0 - 1.0;
  vec2 g10 = hash2(cell + vec2(1.0, 0.0)) * 2.0 - 1.0;
  vec2 g01 = hash2(cell + vec2(0.0, 1.0)) * 2.0 - 1.0;
  vec2 g11 = hash2(cell + vec2(1.0)) * 2.0 - 1.0;

  return mix(
    mix(dot(g00, local), dot(g10, local - vec2(1.0, 0.0)), blend.x),
    mix(dot(g01, local - vec2(0.0, 1.0)), dot(g11, local - vec2(1.0)), blend.x),
    blend.y
  );
}

// Normalized [0, 1] paper height in paper units (CSS pixels / scale): vertically
// elongated, laterally warped fBm tooth with fine grain and faint broad drift.
float paperHeight(vec2 point) {
  vec2 tooth = point + vec2(0.8 * gradientNoise(point * vec2(0.3, 0.15)), 0.0);
  vec2 frequency = vec2(0.6, 0.3);

  float height = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 3; octave++) {
    height += amplitude * gradientNoise(tooth * frequency + float(octave) * vec2(7.3, 3.1));
    frequency *= 2.0;
    amplitude *= 0.55;
  }
  height += 0.08 * gradientNoise(point * vec2(3.0, 2.5));
  height += 0.15 * gradientNoise(point * vec2(0.075, 0.05));

  return clamp(0.5 + height, 0.0, 1.0);
}

void main() {
  // Top-left-anchored CSS pixels keep the paper fixed through resize, DPR, and camera changes.
  vec2 cssPixel = vec2(vUv.x, 1.0 - vUv.y) * uResolution / uPixelRatio;
  vec2 paperPosition = cssPixel / max(uSubstrateScale, 0.5);
  float height = paperHeight(paperPosition);

  // Soft light from the upper left over the tooth's slope gives the embossed relief.
  float delta = 0.1;
  vec2 slope = vec2(
    paperHeight(paperPosition + vec2(delta, 0.0)) - height,
    paperHeight(paperPosition + vec2(0.0, delta)) - height
  ) / delta;
  float relief = clamp(dot(slope, vec2(-0.7)) * 0.12, -0.08, 0.08);

  vec3 paper = uSubstrateColor * (0.96 + 0.06 * (height - 0.5) + relief);
  gl_FragColor = vec4(clamp(paper, 0.0, 1.0), height);
}
