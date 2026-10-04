// Shared by SurfacePass's depth pre-pass and its shading, so both produce
// bit-identical fragment depths and LessEqual testing is exact.
varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec3 vLocalPosition; // object-local, so turbulence rides with the mesh

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewNormal = normalMatrix * normal;
  vViewPosition = viewPosition.xyz;
  vLocalPosition = position;
  gl_Position = projectionMatrix * viewPosition;
}
