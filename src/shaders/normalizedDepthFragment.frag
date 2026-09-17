uniform sampler2D tRawDepth;
uniform vec2 uObjectDepthRange;

varying float vViewDepth;
varying vec2 vScreenUv;

void main() {
  vec4 raw = texture2D(tRawDepth, vScreenUv);

  float tolerance = max(0.01, raw.r * 0.001);
  if (raw.a < 0.5 || abs(raw.r - vViewDepth) > tolerance) discard;

  float normalized = clamp(
    (vViewDepth - uObjectDepthRange.x) /
      max(uObjectDepthRange.y - uObjectDepthRange.x, 0.0001),
    0.0,
    1.0
  );

  gl_FragColor = vec4(normalized, 0.0, 0.0, 1.0);
}
