// Pigment granulation (Montesdeoca §5.1.2), weighted by shadow: pigment
// settles into the paper's valleys and drains off its peaks, most strongly
// where the diffuse light is lowest. Signed like turbulence, so diffuse
// composition folds it into the same Eq. 5.1 density offset.

uniform sampler2D tDiffuse;
uniform sampler2D tSubstrate; // A = paper height, 0 valley … 1 peak
uniform float uIntensity;

varying vec2 vUv;

// > 1 concentrates the grain in the shadows rather than fading in linearly.
const float DARK_BIAS = 1.5;

void main() {
  vec4 diffuse = texture2D(tDiffuse, vUv);
  float height = texture2D(tSubstrate, vUv).a;
  float shadow = pow(clamp(1.0 - diffuse.r, 0.0, 1.0), DARK_BIAS);
  float settling = uIntensity * shadow * (1.0 - 2.0 * height) * diffuse.a;
  gl_FragColor = vec4(vec3(settling), diffuse.a);
}
