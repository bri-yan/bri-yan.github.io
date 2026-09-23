uniform vec2 uResolution;
uniform float uPixelRatio;
uniform vec3 uSubstrateColor;
uniform float uSubstrateScale;

varying vec2 vUv;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);

  return mix(
    mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x),
    mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), local.x),
    local.y
  );
}

float paperHeight(vec2 point) {
  return 0.57 * noise(point) + 0.28 * noise(point * 2.03 + 7.2) + 0.15 * noise(point * 4.09 + 23.1);
}

void main() {
  vec2 paperPosition = vUv * uResolution / (uPixelRatio * max(uSubstrateScale, 0.5));
  float height = paperHeight(paperPosition);
  vec3 paper = uSubstrateColor * (0.92 + 0.16 * height);

  gl_FragColor = vec4(clamp(paper, 0.0, 1.0), height);
}
