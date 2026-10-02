// Shared by the depth pre-pass and the per-subject pass, so both produce
// bit-identical fragment depths and LessEqual testing is exact.
varying float vViewDepth;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDepth = -viewPosition.z;
  gl_Position = projectionMatrix * viewPosition;
}
