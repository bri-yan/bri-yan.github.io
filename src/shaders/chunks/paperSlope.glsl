// The paper slope ∇h, straight from the substrate height by central
// differences: per paper unit, x right and y screen-down, pointing uphill;
// O(1) and independent of zoom and substrate scale.

uniform sampler2D tSubstrate; // RGB = paper with its relief, A = height
uniform vec2 uSubstrateTexelSize;
uniform float uPixelsPerPaperUnit; // device pixels per paper unit (DPR × scale)

float heightAt(vec2 uv, vec2 offset) {
  return texture2D(tSubstrate, uv + offset * uSubstrateTexelSize).a;
}

vec2 paperSlope(vec2 uv) {
  float dx = heightAt(uv, vec2(1.0, 0.0)) - heightAt(uv, vec2(-1.0, 0.0));
  float dy = heightAt(uv, vec2(0.0, -1.0)) - heightAt(uv, vec2(0.0, 1.0)); // UV y points up
  return 0.5 * vec2(dx, dy) * uPixelsPerPaperUnit;
}
