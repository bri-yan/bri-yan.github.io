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

varying vec2 vUv;

void main() {
  vec4 diffuse = texture2D(tDiffuse, vUv);
  float height = texture2D(tSubstrate, vUv).a;
  float lit = smoothstep(uLightThreshold - uLightSoftness, uLightThreshold + uLightSoftness, diffuse.r);
  float reach = uAmount * lit;
  // Peaks above the threshold go bare; reach 0 puts the whole ramp above
  // height 1, so amount 0 skips nothing.
  float threshold = mix(1.0 + uSoftness, -uSoftness, reach);
  float dryness = smoothstep(threshold - uSoftness, threshold + uSoftness, height) * diffuse.a;
  gl_FragColor = vec4(vec3(dryness), diffuse.a);
}
