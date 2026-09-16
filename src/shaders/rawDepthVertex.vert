varying float vViewDepth;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDepth = -viewPosition.z;
  gl_Position = projectionMatrix * viewPosition;
}
