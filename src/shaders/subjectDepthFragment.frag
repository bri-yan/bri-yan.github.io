uniform sampler2D tRawDepth;
uniform vec2 uResolution;

varying float vViewDepth;

void main() {
  vec4 raw = texture2D(tRawDepth, gl_FragCoord.xy / uResolution);
  float tolerance = max(0.01, raw.r * 0.002);
  if (raw.a < 0.5 || abs(raw.r - vViewDepth) > tolerance) discard;
  gl_FragColor = vec4(vViewDepth, vViewDepth, 0.0, 1.0);
}
