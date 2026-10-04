// The horizontal half of both blurs in one pass (MRT): the paint layer (the
// thesis's wetness) and the depth edges (the edge-darkening width W). Both
// arrive premultiplied and stay so. blurAxis comes from chunks/blur.glsl.

layout(location = 0) out vec4 gPaint;
layout(location = 1) out vec4 gEdges;

uniform sampler2D tPaint;
uniform sampler2D tEdges;
uniform vec2 uTexelSize;
uniform float uPaintCenter;
uniform vec2 uPaintPairs[MAX_BLUR_PAIRS];
uniform int uPaintPairCount;
uniform float uEdgesCenter;
uniform vec2 uEdgesPairs[MAX_BLUR_PAIRS];
uniform int uEdgesPairCount;

varying vec2 vUv;

void main() {
  vec2 axis = vec2(uTexelSize.x, 0.0);
  gPaint = blurAxis(tPaint, vUv, axis, uPaintCenter, uPaintPairs, uPaintPairCount);
  gEdges = blurAxis(tEdges, vUv, axis, uEdgesCenter, uEdgesPairs, uEdgesPairCount);
}
