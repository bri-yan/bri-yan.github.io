uniform sampler2D tDiffuse;
uniform float uStrength;

varying vec2 vUv;

void main() {
  vec4 diffuse = texture2D(tDiffuse, vUv);
  float dilution = (1.0 - uStrength * diffuse.r) * diffuse.a;
  gl_FragColor = vec4(vec3(dilution), dilution);
}
