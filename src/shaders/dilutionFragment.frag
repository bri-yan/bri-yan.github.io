uniform sampler2D tDiffuse;
uniform float uStrength;

varying vec2 vUv;

void main() {
  vec4 diffuse = texture2D(tDiffuse, vUv);
  // dilution = 0 if no object present (diffuse.a == 0) else inverse of diffuse
  float dilution = (1.0 - uStrength * diffuse.r) * diffuse.a;
  gl_FragColor = vec4(dilute);
}
