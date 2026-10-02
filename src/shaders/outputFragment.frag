// The finished painting, drawn to screen: substrate effects over the paint
// layer in thesis order (Montesdeoca §5.3): distortion → highlight lift →
// paint over paper → lighting. The paper slope comes straight from the
// substrate height by central differences.

uniform sampler2D tPaint; // straight RGB pigment, A = density
uniform sampler2D tSubstrate; // A = paper height
uniform sampler2D tSpecular; // A = highlight mask
uniform vec2 uCssPixelToUv;
uniform vec2 uSubstrateTexelSize;
uniform float uPixelsPerPaperUnit; // device pixels per paper unit (DPR × scale)
uniform vec3 uPaperColor;
uniform bool uDistortionEnabled;
uniform float uDistortion; // CSS pixels of shift per unit slope
uniform bool uLightingEnabled;
uniform vec3 uLightDirection; // normalized, y screen-down, z toward viewer
uniform float uLightStrength; // ds
uniform float uRoughness; // r

varying vec2 vUv;

float heightAt(vec2 offset) {
  return texture2D(tSubstrate, vUv + offset * uSubstrateTexelSize).a;
}

// Slope ∇h per paper unit, x right and y screen-down, pointing uphill; O(1)
// and independent of zoom and substrate scale.
vec2 paperSlope() {
  float dx = heightAt(vec2(1.0, 0.0)) - heightAt(vec2(-1.0, 0.0));
  float dy = heightAt(vec2(0.0, -1.0)) - heightAt(vec2(0.0, 1.0)); // UV y points up
  return 0.5 * vec2(dx, dy) * uPixelsPerPaperUnit;
}

void main() {
  vec2 slope = paperSlope();

  // Distortion: sample uphill so pigment slides into the paper's valleys.
  vec2 uv = vUv;
  if (uDistortionEnabled) {
    uv += uDistortion * vec2(slope.x, -slope.y) * uCssPixelToUv;
  }
  vec4 paint = texture2D(tPaint, uv);

  // Highlights are left unpainted: lift the pigment so bare paper shows.
  paint.a *= 1.0 - texture2D(tSpecular, uv).a;

  // Paint over the flat paper color (substrate RGB already bakes its own relief).
  vec3 color = mix(uPaperColor, paint.rgb, paint.a);

  // Lighting: normal = up + a lean toward the valley; Id = 1 − ds·(1 − L·N).
  if (uLightingEnabled) {
    vec3 normal = normalize(vec3(-uRoughness * slope, 1.0));
    float diffuse = max(dot(uLightDirection, normal), 0.0);
    color *= 1.0 - uLightStrength * (1.0 - diffuse);
  }

  gl_FragColor = vec4(color, 1.0);
}
