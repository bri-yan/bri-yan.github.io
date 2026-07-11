// Interior wash: the clean silhouette shape with optional paper grain.
// blurred silhouette + paper → premultiplied body layer
// (rgb = pigment × coverage, a = coverage).

uniform sampler2D tIntensity;  // blurred silhouette ramp
uniform sampler2D tPaper;      // paper color; brightness = relief
uniform vec3 uBaseColor;       // pigment color
uniform float uThreshold;      // where the wash boundary sits on the ramp
uniform float uWetness;        // half-width of the shape transition band
uniform float uPaperWeight;    // grain amount within the wash (0 = flat)
uniform float uBaseOpacity;    // reserved — not yet used below

varying vec2 vUv;

void main() {
  float intensity = rgbIntensity(texture2D(tIntensity, vUv).rgb);
  float paper = rgbIntensity(texture2D(tPaper, vUv).rgb);
  float paperOffset = (paper - 0.5) * 2.0; // -1 valleys … +1 ridges

  float lo = max(0.0, uThreshold - uWetness);
  float hi = min(1.0, uThreshold + uWetness);
  float shape = smoothstep(lo, hi, intensity);
  float mask = step(0.9, shape);

  float body = clamp(shape * (1.0 + uPaperWeight * paperOffset), 0.0, 1.0);
  body = body * mask; 
  gl_FragColor = vec4(body * uBaseColor, body);
}
