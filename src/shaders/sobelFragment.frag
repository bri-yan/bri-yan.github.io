// Depth edges: both 3×3 Sobel gradients of the subject depth (gSurface.B) in
// one pass, combined into a continuous magnitude. Written premultiplied by
// subject coverage, (edge · coverage, 0, 0, coverage), ready for the blur.

uniform sampler2D tSurface;
uniform vec2 uTexelSize;
uniform float uRadius; // integer source pixels between taps
uniform float uStrength;

varying vec2 vUv;

// Off the subjects (empty pixels and other meshes) depth reads as 0.
float depthAt(vec2 offset) {
  return max(texture2D(tSurface, vUv + offset * uTexelSize * uRadius).b, 0.0);
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

  vec2 gradient = vec2(
    topRight + 2.0 * right + bottomRight - topLeft - 2.0 * left - bottomLeft,
    topLeft + 2.0 * top + topRight - bottomLeft - 2.0 * bottom - bottomRight
  );
  float edge = clamp(length(gradient) * 0.25 * uStrength, 0.0, 1.0);

  vec4 center = texture2D(tSurface, vUv);
  float coverage = center.a > 0.5 && center.b >= 0.0 ? 1.0 : 0.0;
  gl_FragColor = vec4(edge * coverage, 0.0, 0.0, coverage);
}
