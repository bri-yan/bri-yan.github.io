uniform sampler2D tColorOverride;
uniform sampler2D tDilution;

varying vec2 vUv;

void main() {
  vec3 pigment = texture2D(tColorOverride, vUv).rgb;
  float density = texture2D(tDilution, vUv).a;
  gl_FragColor = vec4(pigment, density);
}
