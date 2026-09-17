varying float vViewDepth;
varying vec2 vScreenUv;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDepth = -viewPosition.z;
  vec4 clipPosition = projectionMatrix * viewPosition;
  vScreenUv = clipPosition.xy / clipPosition.w * 0.5 + 0.5;
  gl_Position = clipPosition;
}
