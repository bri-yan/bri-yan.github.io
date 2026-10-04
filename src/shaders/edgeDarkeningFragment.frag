// The vertical half of both blurs, then edge darkening (Montesdeoca §5.2.1):
// pigment gathers toward the rim of a wash. The blurred edges give the
// gradual band, Ed = k·Eb. The rim is concentrated with concentratePigment
// (chunks/oklab.glsl), eased by 1 − e^(−Ed) so it never reaches black. (A
// per-channel C^(1+Ed) can't darken channels at 1.0 and drifts every rim
// toward the strongest channel.) Density concentrates by the thesis power.
// blurAxis comes from chunks/blur.glsl; both chunks are prepended by the pass.

uniform sampler2D tPaint; // horizontally blurred paint, premultiplied
uniform sampler2D tEdges; // horizontally blurred edges, premultiplied by coverage
uniform vec2 uTexelSize;
uniform float uPaintCenter;
uniform vec2 uPaintPairs[MAX_BLUR_PAIRS];
uniform int uPaintPairCount;
uniform float uEdgesCenter;
uniform vec2 uEdgesPairs[MAX_BLUR_PAIRS];
uniform int uEdgesPairCount;
uniform float uStrength; // global edge darkening k

varying vec2 vUv;

void main() {
  vec2 axis = vec2(0.0, uTexelSize.y);
  vec4 paint = blurAxis(tPaint, vUv, axis, uPaintCenter, uPaintPairs, uPaintPairCount);
  vec4 edges = blurAxis(tEdges, vUv, axis, uEdgesCenter, uEdgesPairs, uEdgesPairCount);

  // Un-premultiply: alpha keeps meaning density, and empty pixels have no color.
  vec3 pigment = paint.a > 0.0 ? paint.rgb / paint.a : vec3(0.0);
  float concentration = uStrength * (edges.a > 0.0 ? edges.r / edges.a : 0.0); // Ed

  pigment = concentratePigment(pigment, 1.0 - exp(-concentration));
  float density = 1.0 - pow(max(1.0 - paint.a, 0.0), 1.0 + concentration);
  gl_FragColor = vec4(pigment, density);
}
