uniform sampler2D tHorizontal;
uniform sampler2D tVertical;
uniform float uStrength;

varying vec2 vUv;

void main() {
  vec4 horizontal = texture2D(tHorizontal, vUv);
  vec4 vertical = texture2D(tVertical, vUv);
  vec2 gradient = vec2(horizontal.r, vertical.r) * 8.0 - 4.0;
  float edge = clamp(length(gradient) * 0.25 * uStrength, 0.0, 1.0);

  gl_FragColor = vec4(vec3(edge), horizontal.a);
}
