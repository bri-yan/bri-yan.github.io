uniform sampler2D tNormalizedDepth;
uniform vec2 uTexelSize;
uniform int uDirection;
uniform float uRadius;

varying vec2 vUv;

float depthAt(vec2 offset) {
  vec4 inputSample = texture2D(tNormalizedDepth, vUv + offset * uTexelSize * uRadius);
  return inputSample.a > 0.5 ? inputSample.r : 0.0;
}

void main() {
  float topLeft = depthAt(vec2(-1.0, 1.0));
  float top = depthAt(vec2(0.0, 1.0));
  float topRight = depthAt(vec2(1.0, 1.0));
  float left = depthAt(vec2(-1.0, 0.0));
  float right = depthAt(vec2(1.0, 0.0));
  float bottomLeft = depthAt(vec2(-1.0, -1.0));
  float bottom = depthAt(vec2(0.0, -1.0));
  float bottomRight = depthAt(vec2(1.0, -1.0));

  float horizontal = topRight + 2.0 * right + bottomRight - topLeft - 2.0 * left - bottomLeft;
  float vertical = topLeft + 2.0 * top + topRight - bottomLeft - 2.0 * bottom - bottomRight;
  float gradient = uDirection == 0 ? horizontal : vertical;
  float coverage = texture2D(tNormalizedDepth, vUv).a;

  gl_FragColor = vec4(clamp(0.5 + gradient / 8.0, 0.0, 1.0), 0.0, 0.0, coverage);
}
