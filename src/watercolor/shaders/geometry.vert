varying vec3 vPosition;
varying vec3 vViewPosition;
varying vec3 vNormal;
void main() {
  vPosition = position;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = view.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * view;
}
