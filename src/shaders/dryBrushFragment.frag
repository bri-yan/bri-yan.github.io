// Dry brush (Montesdeoca §5.1.2), gated by light: a thinly loaded brush skips
// the paper's peaks, leaving them bare, wherever the diffuse light is above a
// threshold. Lit areas all get the same dryness; shadow is left alone.
// 1 = paper left bare.

uniform sampler2D tDiffuse;
uniform sampler2D tSubstrate; // A = paper height, 0 valley … 1 peak
uniform float uAmount;
uniform float uSoftness;
uniform float uLightThreshold; // diffuse level where the dry brush starts
uniform float uLightSoftness; // width of the fade around that level
uniform vec2 uTexelSize; // of the substrate
uniform float uFleckRadius; // pixels; 0 = judge the paper's own height
uniform float uPeakGain; // scales a peak's rise back to the paper height's spread

varying vec2 vUv;

// How high a point stands above the paper around it, rather than how high it
// is. Judged this way, the bare flecks stay small and evenly spread: the paper's
// broad hills no longer decide where they gather, or merge them into patches.
float peakHeight(float height) {
  float ring = 0.0;
  for (int i = 0; i < 8; i++) {
    float angle = float(i) * 0.7853982; // eight taps, 45° apart
    ring += texture2D(tSubstrate, vUv + uFleckRadius * uTexelSize * vec2(cos(angle), sin(angle))).a;
  }
  return clamp(0.5 + uPeakGain * (height - ring / 8.0), 0.0, 1.0);
}

void main() {
  vec4 diffuse = texture2D(tDiffuse, vUv);
  float height = texture2D(tSubstrate, vUv).a;
  if (uFleckRadius > 0.0) height = peakHeight(height);
  float lit = smoothstep(uLightThreshold - uLightSoftness, uLightThreshold + uLightSoftness, diffuse.r);
  float reach = uAmount * lit;
  // Peaks above the threshold go bare; reach 0 puts the whole ramp above
  // height 1, so amount 0 skips nothing.
  float threshold = mix(1.0 + uSoftness, -uSoftness, reach);
  float dryness = smoothstep(threshold - uSoftness, threshold + uSoftness, height) * diffuse.a;
  gl_FragColor = vec4(vec3(dryness), diffuse.a);
}
