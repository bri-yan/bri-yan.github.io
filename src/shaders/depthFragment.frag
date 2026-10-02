// Per-subject normalized view depth: 0 = the subject's nearest bound, 1 = its
// farthest. Occluded pixels never get here: they fail the depth test against
// the whole-scene pre-pass.
uniform vec2 uObjectDepthRange;

varying float vViewDepth;

void main() {
  float normalized = clamp(
    (vViewDepth - uObjectDepthRange.x) /
      max(uObjectDepthRange.y - uObjectDepthRange.x, 0.0001),
    0.0,
    1.0
  );

  gl_FragColor = vec4(normalized, 0.0, 0.0, 1.0);
}
