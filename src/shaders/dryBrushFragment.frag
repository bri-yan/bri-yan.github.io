// Dry brush (Montesdeoca §5.1.2), weighted by light: a thinly loaded brush
// skips the paper's peaks, leaving them bare, and reaches further down the
// tooth where the diffuse light is brightest. 1 = paper left bare.

uniform sampler2D tDiffuse;
uniform sampler2D tSubstrate; // A = paper height, 0 valley … 1 peak
uniform float uAmount;
uniform float uSoftness;

varying vec2 vUv;

void main() {
  vec4 diffuse = texture2D(tDiffuse, vUv);
  float height = texture2D(tSubstrate, vUv).a;
  float reach = uAmount * clamp(diffuse.r, 0.0, 1.0);
  // Peaks above the threshold go bare; reach 0 puts the whole ramp above
  // height 1, so amount 0 skips nothing.
  float threshold = 1.0 + uSoftness - reach * (1.0 + 2.0 * uSoftness);
  float skipped = smoothstep(threshold - uSoftness, threshold + uSoftness, height) * diffuse.a;
  gl_FragColor = vec4(vec3(skipped), diffuse.a);
}
