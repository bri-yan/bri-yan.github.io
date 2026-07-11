// Wet-front rim: carves the edge band out of the blurred silhouette ramp and
// dries it into the paper relief. blurred silhouette + paper → premultiplied
// edge layer (rgb = pigment × coverage, a = coverage).

uniform sampler2D tIntensity;   // raw silhouette mask (unblurred)
uniform sampler2D tBlur;        // blurred silhouette ramp
uniform sampler2D tPaper;       // paper color; brightness = relief
uniform vec3 uBaseColor;        // pigment color
uniform float uThreshold;       // where the wet edge sits on the ramp
uniform float uWetness;         // half-width of the shape transition band
uniform float uEdgePaperWeight; // how much the edge dries into the grain
uniform float uEdgeSharpness;   // contrast of the valley/ridge drying cut
uniform float uEdgeDarkness;    // reserved — not yet used below

varying vec2 vUv;

const float EDGE_GAIN = 3.0;        // rim brightness
const float EDGE_MASK_CUTOFF = 0.0001; // shape level below which the rim is cut
const float EDGE_SNAG_SCALE = 0.6;  // how far paper can shift the wet front

void main() {
  float intensity = rgbIntensity(texture2D(tIntensity, vUv).rgb); // raw silhouette mask
  float blurredIntensity = rgbIntensity(texture2D(tBlur, vUv).rgb); // blurred ramp
  float paper = rgbIntensity(texture2D(tPaper, vUv).rgb);
  float paperOffset = (paper - 0.5) * 2.0; // -1 valleys … +1 ridges

  float lo = max(0.0, uThreshold - uWetness);
  float hi = min(1.0, uThreshold + uWetness);
  float shape = smoothstep(lo, hi, blurredIntensity);
  float mask = step(EDGE_MASK_CUTOFF, shape);
  float mask2 = step(EDGE_MASK_CUTOFF + 0.9, shape);
  float body = clamp(shape * (1.0 + uEdgePaperWeight * paperOffset), 0.0, 1.0);

  // The wet front snags on the paper relief: paper shifts the ramp, gated by
  // (1 - shape) so the perturbation dies out inside the wash and can never
  // speckle the interior, whatever the wetness.
  float snag = paperOffset * uEdgePaperWeight * EDGE_SNAG_SCALE * (1.0 - shape);
  float edgeShape = smoothstep(lo, hi, blurredIntensity + snag);

  float meshMask = step(EDGE_MASK_CUTOFF, shape);
  float edge = meshMask * (1.0 - edgeShape) * EDGE_GAIN;

  // Drying: pigment survives in the valleys, breaks on the ridges.
  // uEdgeSharpness sets the cut contrast (80 ≈ near-binary ribs).
  float halfBand = 0.5 / max(uEdgeSharpness, 1.0);
  float ridge = smoothstep(0.5 - halfBand, 0.5 + halfBand, paper);
  edge *= 1.0 - uEdgePaperWeight * ridge;

  edge = clamp(edge, 0.0, 1.0);
  gl_FragColor = vec4(edgeShape * uBaseColor, 1.0);
  float w = edge - edgeShape;
  float y = 1.0 - (w);
  float z = 1.0 - meshMask;
  float x = (y - z) * mask;
  x = clamp(x, 0.0, 1.0);
  float result = x - mask2;
  
  gl_FragColor = vec4(vec3(mask2), 1.0);
  gl_FragColor = vec4(mask2 * uBaseColor, result);
  gl_FragColor = vec4(result * uBaseColor, result);
  // gl_FragColor = vec4(meshMask * uBaseColor, 1.0);
}
