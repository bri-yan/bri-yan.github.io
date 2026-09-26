// Substrate slope ∇h by central differences of the height in substrate alpha.
// Stored signed: RG = height change per paper unit, x right and y screen-down,
// pointing uphill (matches the substrate's top-left-anchored CSS-pixel space).

uniform sampler2D tSubstrate;
uniform vec2 uTexelSize;
uniform float uPixelsPerPaperUnit; // device pixels per paper unit (DPR × scale)

varying vec2 vUv;

float heightAt(vec2 offset) {
  return texture2D(tSubstrate, vUv + offset * uTexelSize).a;
}

void main() {
  float dx = (heightAt(vec2(1.0, 0.0)) - heightAt(vec2(-1.0, 0.0))) * 0.5;
  // UV y points up; flip so +y is screen-down.
  float dy = (heightAt(vec2(0.0, -1.0)) - heightAt(vec2(0.0, 1.0))) * 0.5;
  gl_FragColor = vec4(vec2(dx, dy) * uPixelsPerPaperUnit, 0.0, 1.0);
}
