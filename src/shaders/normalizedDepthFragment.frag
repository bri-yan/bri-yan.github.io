uniform sampler2D tRawDepth;
uniform sampler2D tRange;
uniform vec2 uResolution;

varying float vViewDepth;

void main() {
  vec4 raw = texture2D(tRawDepth, gl_FragCoord.xy / uResolution);
  vec4 range = texture2D(tRange, vec2(0.5));
  float tolerance = max(0.01, raw.r * 0.002);
  if (raw.a < 0.5 || range.a < 0.5 || abs(raw.r - vViewDepth) > tolerance) discard;
  float normalized = clamp((vViewDepth - range.r) / max(range.g - range.r, 0.0001), 0.0, 1.0);
  gl_FragColor = vec4(normalized, 0.0, 0.0, 1.0);
}
